import XCTest
@testable import Scrollkey

final class EconomyTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        return calendar
    }

    private func day(_ offset: Int, from base: Date) -> Date {
        calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: base))!
    }

    func testCostRoundsPartialKeysUp() {
        XCTAssertEqual(Economy.cost(minutes: 5, minutesPerKey: 5), 1)
        XCTAssertEqual(Economy.cost(minutes: 15, minutesPerKey: 5), 3)
        XCTAssertEqual(Economy.cost(minutes: 16, minutesPerKey: 5), 4)
        XCTAssertEqual(Economy.cost(minutes: 30, minutesPerKey: 10), 3)
        XCTAssertEqual(Economy.cost(minutes: 0, minutesPerKey: 5), 0)
        XCTAssertEqual(Economy.cost(minutes: 7, minutesPerKey: 0), 7, "A zero rate is treated as one minute per key")
    }

    func testRefundKeepsAnyKeyYouStartedUsing() {
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 0, minutesPerKey: 5), 6)
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 30, minutesPerKey: 5), 5)
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 5 * 60, minutesPerKey: 5), 5)
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 5 * 60 + 1, minutesPerKey: 5), 4)
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 30 * 60, minutesPerKey: 5), 0)
        XCTAssertEqual(Economy.refund(keysSpent: 6, elapsed: 90 * 60, minutesPerKey: 5), 0)
        XCTAssertEqual(Economy.refund(keysSpent: 3, elapsed: -10, minutesPerKey: 5), 3)
    }

    func testStreakCountsBackFromToday() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let days: Set<Date> = [day(0, from: now), day(-1, from: now), day(-2, from: now), day(-4, from: now)]
        XCTAssertEqual(Economy.streak(activeDays: days, today: now, calendar: calendar), 3)
    }

    func testStreakSurvivesUntilTodaysFirstQuest() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let days: Set<Date> = [day(-1, from: now), day(-2, from: now)]
        XCTAssertEqual(Economy.streak(activeDays: days, today: now, calendar: calendar), 2)
    }

    func testStreakBreaksAfterAMissedDay() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let days: Set<Date> = [day(-2, from: now), day(-3, from: now)]
        XCTAssertEqual(Economy.streak(activeDays: days, today: now, calendar: calendar), 0)
        XCTAssertEqual(Economy.streak(activeDays: [], today: now, calendar: calendar), 0)
    }

    func testBestStreakFindsLongestRun() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let days: Set<Date> = [-10, -9, -8, -7, -3, -2, 0].reduce(into: []) { $0.insert(day($1, from: now)) }
        XCTAssertEqual(Economy.bestStreak(activeDays: days, calendar: calendar), 4)
        XCTAssertEqual(Economy.bestStreak(activeDays: [], calendar: calendar), 0)
    }

    func testWordCountIgnoresPunctuationOnlyTokens() {
        XCTAssertEqual(Economy.wordCount("Hello, world! — 42"), 3)
        XCTAssertEqual(Economy.wordCount("   \n\t "), 0)
        XCTAssertEqual(Economy.wordCount("one\ntwo\tthree  four"), 4)
    }

    func testClockFormatting() {
        XCTAssertEqual(Economy.clock(59), "0:59")
        XCTAssertEqual(Economy.clock(0.2), "0:01")
        XCTAssertEqual(Economy.clock(25 * 60), "25:00")
        XCTAssertEqual(Economy.clock(3600), "1:00:00")
        XCTAssertEqual(Economy.clock(-5), "0:00")
    }
}
