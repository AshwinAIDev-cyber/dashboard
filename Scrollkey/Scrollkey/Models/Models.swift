import Foundation
import SwiftData

/// Every key that enters or leaves the wallet. The balance is the sum of all entries.
@Model
final class LedgerEntry {
    var id: UUID
    var date: Date
    var amount: Int
    var kindRaw: String
    var note: String

    init(amount: Int, kind: LedgerKind, note: String, date: Date = .now) {
        self.id = UUID()
        self.date = date
        self.amount = amount
        self.kindRaw = kind.rawValue
        self.note = note
    }

    var kind: LedgerKind { LedgerKind(rawValue: kindRaw) ?? .earned }
}

enum LedgerKind: String, CaseIterable {
    case earned, spent, refund, bonus
}

/// A completed quest.
@Model
final class QuestRecord {
    var id: UUID
    var questID: String
    var title: String
    var symbol: String
    var categoryRaw: String
    var date: Date
    var keys: Int
    var detail: String?

    init(questID: String, title: String, symbol: String, category: QuestCategory, keys: Int, detail: String?, date: Date = .now) {
        self.id = UUID()
        self.questID = questID
        self.title = title
        self.symbol = symbol
        self.categoryRaw = category.rawValue
        self.date = date
        self.keys = keys
        self.detail = detail
    }

    var category: QuestCategory { QuestCategory(rawValue: categoryRaw) ?? .life }
}

/// A block of scroll time bought with keys.
@Model
final class ScrollSession {
    var id: UUID
    var startedAt: Date
    var plannedMinutes: Int
    var keysSpent: Int
    var minutesPerKey: Int
    var endedAt: Date?
    var refundedKeys: Int

    init(plannedMinutes: Int, keysSpent: Int, minutesPerKey: Int, startedAt: Date = .now) {
        self.id = UUID()
        self.startedAt = startedAt
        self.plannedMinutes = plannedMinutes
        self.keysSpent = keysSpent
        self.minutesPerKey = minutesPerKey
        self.endedAt = nil
        self.refundedKeys = 0
    }

    var plannedEnd: Date { startedAt.addingTimeInterval(TimeInterval(plannedMinutes * 60)) }

    func isActive(at now: Date) -> Bool { endedAt == nil && now < plannedEnd }

    /// Minutes actually available to the operator (planned minus anything refunded).
    var usedMinutes: Int {
        guard let endedAt else { return plannedMinutes }
        return max(0, Int((endedAt.timeIntervalSince(startedAt) / 60).rounded()))
    }
}

/// Text written during a journaling quest.
@Model
final class JournalEntry {
    var id: UUID
    var date: Date
    var prompt: String
    var text: String

    init(prompt: String, text: String, date: Date = .now) {
        self.id = UUID()
        self.date = date
        self.prompt = prompt
        self.text = text
    }

    var wordCount: Int { Economy.wordCount(text) }
}

/// A quest the user designed themselves.
@Model
final class CustomQuest {
    var id: UUID
    var title: String
    var symbol: String
    var reward: Int
    var minutes: Int
    var isTimed: Bool
    var dailyLimit: Int
    var createdAt: Date

    init(title: String, symbol: String, reward: Int, minutes: Int, isTimed: Bool, dailyLimit: Int) {
        self.id = UUID()
        self.title = title
        self.symbol = symbol
        self.reward = reward
        self.minutes = minutes
        self.isTimed = isTimed
        self.dailyLimit = dailyLimit
        self.createdAt = .now
    }
}

enum AppSchema {
    static let models: [any PersistentModel.Type] = [
        LedgerEntry.self, QuestRecord.self, ScrollSession.self, JournalEntry.self, CustomQuest.self,
    ]
}
