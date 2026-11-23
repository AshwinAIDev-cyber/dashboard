import SwiftUI

enum QuestCategory: String, CaseIterable, Identifiable {
    case move, mind, focus, create, life

    var id: String { rawValue }

    var title: String {
        switch self {
        case .move: "Move"
        case .mind: "Mind"
        case .focus: "Focus"
        case .create: "Create"
        case .life: "Life"
        }
    }

    var color: Color {
        switch self {
        case .move: Theme.mint
        case .mind: Theme.violet
        case .focus: Theme.sky
        case .create: Theme.coral
        case .life: Theme.gold
        }
    }
}

/// How a quest proves it was done.
enum Verification: Hashable {
    /// Counted by the iPhone's motion coprocessor.
    case steps(Int)
    /// A countdown. Strict timers fail if you leave the app.
    case timer(minutes: Int, strict: Bool)
    /// Guided box breathing for a number of 16-second cycles.
    case breathing(cycles: Int)
    /// Write at least this many words.
    case words(Int)
    /// Honor system, confirmed with a press-and-hold.
    case honor

    var label: String {
        switch self {
        case .steps: "Verified by step counter"
        case .timer(_, let strict): strict ? "Timer · keep the app open" : "Timer"
        case .breathing: "Guided breathing"
        case .words: "Word count"
        case .honor: "Honor system"
        }
    }

    var symbol: String {
        switch self {
        case .steps: "figure.walk.motion"
        case .timer: "timer"
        case .breathing: "lungs.fill"
        case .words: "text.word.spacing"
        case .honor: "hand.raised.fill"
        }
    }
}

struct Quest: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let symbol: String
    let category: QuestCategory
    let reward: Int
    let verification: Verification
    let dailyLimit: Int
    var isCustom = false

    var color: Color { category.color }
}

extension Quest {
    static let catalog: [Quest] = [
        Quest(id: "walk-1k", title: "Take a walk", subtitle: "Walk 1,000 steps", symbol: "figure.walk",
              category: .move, reward: 2, verification: .steps(1_000), dailyLimit: 4),
        Quest(id: "walk-5k", title: "Go the distance", subtitle: "Walk 5,000 steps", symbol: "map.fill",
              category: .move, reward: 8, verification: .steps(5_000), dailyLimit: 1),
        Quest(id: "squats", title: "Squat set", subtitle: "Do 20 squats", symbol: "figure.strengthtraining.functional",
              category: .move, reward: 1, verification: .honor, dailyLimit: 3),
        Quest(id: "outside", title: "Get outside", subtitle: "Five minutes of fresh air", symbol: "sun.max.fill",
              category: .move, reward: 1, verification: .timer(minutes: 5, strict: false), dailyLimit: 2),

        Quest(id: "breathe", title: "Box breathing", subtitle: "Six slow breathing cycles", symbol: "wind",
              category: .mind, reward: 1, verification: .breathing(cycles: 6), dailyLimit: 3),
        Quest(id: "stillness", title: "Sit still", subtitle: "Five quiet minutes, phone face up", symbol: "moon.stars.fill",
              category: .mind, reward: 2, verification: .timer(minutes: 5, strict: true), dailyLimit: 2),

        Quest(id: "deep-work", title: "Deep work", subtitle: "25 focused minutes", symbol: "scope",
              category: .focus, reward: 4, verification: .timer(minutes: 25, strict: true), dailyLimit: 4),
        Quest(id: "read", title: "Read a book", subtitle: "15 minutes on paper", symbol: "book.fill",
              category: .focus, reward: 3, verification: .timer(minutes: 15, strict: false), dailyLimit: 2),

        Quest(id: "journal", title: "Journal", subtitle: "Write 60 words", symbol: "pencil.line",
              category: .create, reward: 2, verification: .words(60), dailyLimit: 1),
        Quest(id: "gratitude", title: "Three good things", subtitle: "Write 25 words of gratitude", symbol: "heart.text.square.fill",
              category: .create, reward: 1, verification: .words(25), dailyLimit: 1),

        Quest(id: "water", title: "Hydrate", subtitle: "Drink a full glass of water", symbol: "drop.fill",
              category: .life, reward: 1, verification: .honor, dailyLimit: 3),
        Quest(id: "tidy", title: "Reset your space", subtitle: "Ten minutes of tidying", symbol: "sparkles",
              category: .life, reward: 2, verification: .timer(minutes: 10, strict: false), dailyLimit: 1),
    ]

    static func custom(_ quest: CustomQuest) -> Quest {
        Quest(
            id: "custom-\(quest.id.uuidString)",
            title: quest.title,
            subtitle: quest.isTimed ? "\(quest.minutes) minute\(quest.minutes == 1 ? "" : "s")" : "Your quest",
            symbol: quest.symbol,
            category: .life,
            reward: quest.reward,
            verification: quest.isTimed ? .timer(minutes: quest.minutes, strict: false) : .honor,
            dailyLimit: quest.dailyLimit,
            isCustom: true
        )
    }
}
