import Foundation

/// Pure rules for keys, scroll time and streaks. No UI, no storage — unit tested.
enum Economy {
    /// Session lengths offered on the Today screen, in minutes.
    static let sessionOptions = [5, 15, 30, 60]
    static let welcomeBonus = 3
    static let minutesPerKeyChoices = [5, 10, 15]

    /// Keys needed to buy `minutes` of scroll time (partial keys round up).
    static func cost(minutes: Int, minutesPerKey: Int) -> Int {
        guard minutes > 0 else { return 0 }
        let perKey = max(minutesPerKey, 1)
        return (minutes + perKey - 1) / perKey
    }

    /// Keys returned when a session ends early. Any key you've started using is kept.
    static func refund(keysSpent: Int, elapsed: TimeInterval, minutesPerKey: Int) -> Int {
        let usedMinutes = Int((max(elapsed, 0) / 60).rounded(.up))
        let usedKeys = cost(minutes: usedMinutes, minutesPerKey: minutesPerKey)
        return max(0, keysSpent - usedKeys)
    }

    /// Consecutive days with at least one completed quest, ending today — or
    /// yesterday, so an unbroken streak isn't shown as 0 before today's first quest.
    static func streak(activeDays: Set<Date>, today: Date, calendar: Calendar = .current) -> Int {
        var day = calendar.startOfDay(for: today)
        if !activeDays.contains(day) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: day),
                  activeDays.contains(yesterday) else { return 0 }
            day = yesterday
        }
        var count = 0
        while activeDays.contains(day) {
            count += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return count
    }

    /// Longest run of consecutive active days ever.
    static func bestStreak(activeDays: Set<Date>, calendar: Calendar = .current) -> Int {
        let days = activeDays.sorted()
        var best = 0
        var run = 0
        var previous: Date?
        for day in days {
            if let previous, let next = calendar.date(byAdding: .day, value: 1, to: previous), calendar.isDate(next, inSameDayAs: day) {
                run += 1
            } else {
                run = 1
            }
            best = max(best, run)
            previous = day
        }
        return best
    }

    /// Words containing at least one letter or digit.
    static func wordCount(_ text: String) -> Int {
        text.split(whereSeparator: { $0.isWhitespace })
            .filter { word in word.contains(where: { $0.isLetter || $0.isNumber }) }
            .count
    }

    /// "1h 05m" / "12:09" style formatting for countdowns.
    static func clock(_ seconds: TimeInterval) -> String {
        let total = max(0, Int(seconds.rounded(.up)))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }
}
