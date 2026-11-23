import SwiftData
import XCTest
@testable import Scrollkey

final class StoreTests: XCTestCase {
    @MainActor
    private func makeContext() throws -> ModelContext {
        let schema = Schema(AppSchema.models)
        let container = try ModelContainer(for: schema, configurations: [ModelConfiguration(isStoredInMemoryOnly: true)])
        // Keep the container alive for the test's duration.
        containers.append(container)
        return container.mainContext
    }

    private var containers: [ModelContainer] = []

    @MainActor
    private func ledger(_ context: ModelContext) throws -> [LedgerEntry] {
        try context.fetch(FetchDescriptor<LedgerEntry>())
    }

    @MainActor
    func testCompletingAQuestPaysItsReward() throws {
        let context = try makeContext()
        let quest = try XCTUnwrap(Quest.catalog.first { $0.id == "deep-work" })
        Store.complete(quest, detail: "25 min", in: context)

        XCTAssertEqual(Store.balance(try ledger(context)), quest.reward)
        let records = try context.fetch(FetchDescriptor<QuestRecord>())
        XCTAssertEqual(records.count, 1)
        XCTAssertEqual(Store.completions(of: "deep-work", on: .now, in: records), 1)
        XCTAssertEqual(Store.completions(of: "journal", on: .now, in: records), 0)
    }

    @MainActor
    func testStartingASessionSpendsKeys() throws {
        let context = try makeContext()
        Store.grantWelcomeBonus(in: context)

        let session = Store.startSession(minutes: 15, minutesPerKey: 5, ledger: try ledger(context), sessions: [], in: context)
        XCTAssertNotNil(session)
        XCTAssertEqual(session?.keysSpent, 3)
        XCTAssertEqual(Store.balance(try ledger(context)), 0)
    }

    @MainActor
    func testCannotOverspendOrDoubleBook() throws {
        let context = try makeContext()
        Store.grantWelcomeBonus(in: context)

        XCTAssertNil(Store.startSession(minutes: 30, minutesPerKey: 5, ledger: try ledger(context), sessions: [], in: context))
        let first = try XCTUnwrap(Store.startSession(minutes: 5, minutesPerKey: 5, ledger: try ledger(context), sessions: [], in: context))
        XCTAssertNil(Store.startSession(minutes: 5, minutesPerKey: 5, ledger: try ledger(context), sessions: [first], in: context))
        XCTAssertEqual(Store.balance(try ledger(context)), 2)
    }

    @MainActor
    func testEndingEarlyRefundsUnusedKeys() throws {
        let context = try makeContext()
        Store.grantWelcomeBonus(in: context)
        let session = try XCTUnwrap(Store.startSession(minutes: 15, minutesPerKey: 5, ledger: try ledger(context), sessions: [], in: context))

        let refund = Store.endSessionEarly(session, now: session.startedAt.addingTimeInterval(4 * 60), in: context)
        XCTAssertEqual(refund, 2)
        XCTAssertNotNil(session.endedAt)
        XCTAssertEqual(Store.balance(try ledger(context)), 2)
        XCTAssertEqual(Store.endSessionEarly(session, in: context), 0, "A finished session can't be refunded twice")
    }

    @MainActor
    func testExpiredSessionsAreClosed() throws {
        let context = try makeContext()
        let session = ScrollSession(plannedMinutes: 5, keysSpent: 1, minutesPerKey: 5, startedAt: .now.addingTimeInterval(-600))
        context.insert(session)

        XCTAssertNil(Store.activeSession([session]))
        Store.closeExpiredSessions([session], in: context)
        XCTAssertEqual(session.endedAt, session.plannedEnd)
        XCTAssertEqual(session.usedMinutes, 5)
    }

    @MainActor
    func testEraseEverythingEmptiesTheStore() throws {
        let context = try makeContext()
        DemoData.seed(into: context)
        XCTAssertFalse(try ledger(context).isEmpty)

        Store.eraseEverything(in: context)
        XCTAssertTrue(try ledger(context).isEmpty)
        XCTAssertTrue(try context.fetch(FetchDescriptor<QuestRecord>()).isEmpty)
        XCTAssertTrue(try context.fetch(FetchDescriptor<JournalEntry>()).isEmpty)
    }

    @MainActor
    func testCatalogIsWellFormed() {
        let ids = Quest.catalog.map(\.id)
        XCTAssertEqual(Set(ids).count, ids.count, "Quest ids must be unique")
        for quest in Quest.catalog {
            XCTAssertGreaterThan(quest.reward, 0, quest.id)
            XCTAssertGreaterThan(quest.dailyLimit, 0, quest.id)
        }
    }
}
