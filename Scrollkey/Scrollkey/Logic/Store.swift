import Foundation
import SwiftData

/// All writes to the wallet, quest log and scroll sessions go through here.
enum Store {
    static func balance(_ ledger: [LedgerEntry]) -> Int {
        ledger.reduce(0) { $0 + $1.amount }
    }

    static func earned(on day: Date, ledger: [LedgerEntry], calendar: Calendar = .current) -> Int {
        ledger
            .filter { $0.amount > 0 && $0.kind == .earned && calendar.isDate($0.date, inSameDayAs: day) }
            .reduce(0) { $0 + $1.amount }
    }

    static func completions(of questID: String, on day: Date, in records: [QuestRecord], calendar: Calendar = .current) -> Int {
        records.filter { $0.questID == questID && calendar.isDate($0.date, inSameDayAs: day) }.count
    }

    static func activeDays(_ records: [QuestRecord], calendar: Calendar = .current) -> Set<Date> {
        Set(records.map { calendar.startOfDay(for: $0.date) })
    }

    static func allQuests(custom: [CustomQuest]) -> [Quest] {
        Quest.catalog + custom.map(Quest.custom)
    }

    // MARK: Quests

    static func complete(_ quest: Quest, detail: String?, in context: ModelContext, date: Date = .now) {
        context.insert(QuestRecord(
            questID: quest.id, title: quest.title, symbol: quest.symbol,
            category: quest.category, keys: quest.reward, detail: detail, date: date
        ))
        context.insert(LedgerEntry(amount: quest.reward, kind: .earned, note: quest.title, date: date))
        save(context)
    }

    static func grantWelcomeBonus(in context: ModelContext) {
        context.insert(LedgerEntry(amount: Economy.welcomeBonus, kind: .bonus, note: "Welcome bonus"))
        save(context)
    }

    // MARK: Scroll sessions

    static func activeSession(_ sessions: [ScrollSession], now: Date = .now) -> ScrollSession? {
        sessions.first { $0.isActive(at: now) }
    }

    /// Buys `minutes` of scroll time. Returns nil if the wallet can't cover it
    /// or a session is already running.
    @discardableResult
    static func startSession(minutes: Int, minutesPerKey: Int, ledger: [LedgerEntry], sessions: [ScrollSession], in context: ModelContext) -> ScrollSession? {
        let cost = Economy.cost(minutes: minutes, minutesPerKey: minutesPerKey)
        guard cost > 0, balance(ledger) >= cost, activeSession(sessions) == nil else { return nil }
        let session = ScrollSession(plannedMinutes: minutes, keysSpent: cost, minutesPerKey: minutesPerKey)
        context.insert(session)
        context.insert(LedgerEntry(amount: -cost, kind: .spent, note: "\(minutes)-minute scroll session"))
        save(context)
        return session
    }

    /// Ends a running session now and refunds whole unused keys. Returns the refund.
    @discardableResult
    static func endSessionEarly(_ session: ScrollSession, now: Date = .now, in context: ModelContext) -> Int {
        guard session.endedAt == nil else { return 0 }
        let refund = Economy.refund(
            keysSpent: session.keysSpent,
            elapsed: now.timeIntervalSince(session.startedAt),
            minutesPerKey: session.minutesPerKey
        )
        session.endedAt = now
        session.refundedKeys = refund
        if refund > 0 {
            context.insert(LedgerEntry(amount: refund, kind: .refund, note: "Ended a session early", date: now))
        }
        save(context)
        Notifier.cancelSessionReminders(id: session.id)
        return refund
    }

    /// Marks sessions whose time ran out as finished.
    static func closeExpiredSessions(_ sessions: [ScrollSession], now: Date = .now, in context: ModelContext) {
        var changed = false
        for session in sessions where session.endedAt == nil && now >= session.plannedEnd {
            session.endedAt = session.plannedEnd
            changed = true
        }
        if changed { save(context) }
    }

    // MARK: Maintenance

    static func eraseEverything(in context: ModelContext) {
        try? context.delete(model: LedgerEntry.self)
        try? context.delete(model: QuestRecord.self)
        try? context.delete(model: ScrollSession.self)
        try? context.delete(model: JournalEntry.self)
        try? context.delete(model: CustomQuest.self)
        save(context)
        Notifier.cancelAll()
    }

    static func save(_ context: ModelContext) {
        do {
            try context.save()
        } catch {
            assertionFailure("Scrollkey failed to save: \(error)")
        }
    }
}
