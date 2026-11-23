import Foundation
import SwiftData

/// Sample history used by UI tests and previews (`-seedDemoData`).
enum DemoData {
    static func seed(into context: ModelContext, now: Date = .now, calendar: Calendar = .current) {
        context.insert(LedgerEntry(amount: Economy.welcomeBonus, kind: .bonus, note: "Welcome bonus",
                                   date: calendar.date(byAdding: .day, value: -6, to: now) ?? now))

        let plan: [(daysAgo: Int, quests: [String], sessionMinutes: Int?)] = [
            (5, ["walk-1k", "breathe"], 15),
            (4, ["deep-work", "water"], 30),
            (3, ["journal", "walk-1k", "squats"], 15),
            (2, ["deep-work", "read"], 30),
            (1, ["walk-5k", "gratitude"], 15),
            (0, ["breathe", "water"], nil),
        ]
        for day in plan {
            guard let base = calendar.date(byAdding: .day, value: -day.daysAgo, to: calendar.startOfDay(for: now)) else { continue }
            for (index, id) in day.quests.enumerated() {
                guard let quest = Quest.catalog.first(where: { $0.id == id }) else { continue }
                let time = base.addingTimeInterval(TimeInterval(8 * 3600 + index * 5400))
                let detail: String? = switch quest.verification {
                case .steps(let target): "\(target + 137) steps"
                case .words(let minimum): "\(minimum + 12) words"
                case .timer(let minutes, _): "\(minutes) min"
                default: nil
                }
                Store.complete(quest, detail: detail, in: context, date: min(time, now))
            }
            if let minutes = day.sessionMinutes {
                let start = base.addingTimeInterval(19 * 3600)
                let cost = Economy.cost(minutes: minutes, minutesPerKey: 5)
                let session = ScrollSession(plannedMinutes: minutes, keysSpent: cost, minutesPerKey: 5, startedAt: start)
                session.endedAt = session.plannedEnd
                context.insert(session)
                context.insert(LedgerEntry(amount: -cost, kind: .spent, note: "\(minutes)-minute scroll session", date: start))
            }
        }
        context.insert(JournalEntry(
            prompt: "What took more energy than it should have today?",
            text: "Honestly the group chat. I kept checking it between every task and it made the afternoon feel twice as long. Tomorrow I'm leaving my phone in the other room during homework and seeing how far I get before I want it.",
            date: calendar.date(byAdding: .day, value: -3, to: now) ?? now
        ))
        Store.save(context)
        UserDefaults.standard.set(true, forKey: Prefs.grantedWelcome)
    }
}
