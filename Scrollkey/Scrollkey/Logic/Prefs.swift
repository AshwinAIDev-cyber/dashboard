import Foundation

/// UserDefaults keys used with @AppStorage.
enum Prefs {
    static let hasOnboarded = "hasOnboarded"
    static let minutesPerKey = "minutesPerKey"
    static let dailyGoal = "dailyGoal"
    static let grantedWelcome = "grantedWelcome"
    static let remindersEnabled = "remindersEnabled"
}

/// Launch arguments used by UI tests and demos.
enum LaunchFlags {
    static let inMemory = "-inMemoryStore"
    static let seedDemo = "-seedDemoData"
    static let skipPermissionPrompts = "-skipPermissionPrompts"
    static let fastTimers = "-fastTimers"
    static let resetDefaults = "-resetDefaults"

    static func has(_ flag: String) -> Bool { ProcessInfo.processInfo.arguments.contains(flag) }

    /// Seconds per "minute" for quest timers — 1 under `-fastTimers` so tests run quickly.
    static var secondsPerMinute: Double { has(fastTimers) ? 1 : 60 }
}
