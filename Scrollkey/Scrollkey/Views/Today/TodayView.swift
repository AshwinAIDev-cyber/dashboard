import SwiftData
import SwiftUI

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \LedgerEntry.date, order: .reverse) private var ledger: [LedgerEntry]
    @Query(sort: \QuestRecord.date, order: .reverse) private var records: [QuestRecord]
    @Query(sort: \ScrollSession.startedAt, order: .reverse) private var sessions: [ScrollSession]
    @Query(sort: \CustomQuest.createdAt) private var customQuests: [CustomQuest]

    @AppStorage(Prefs.minutesPerKey) private var minutesPerKey = 5
    @AppStorage(Prefs.dailyGoal) private var dailyGoal = 6
    @AppStorage(Prefs.grantedWelcome) private var grantedWelcome = false

    @State private var runningQuest: Quest?

    private var balance: Int { Store.balance(ledger) }
    private var streak: Int { Economy.streak(activeDays: Store.activeDays(records), today: .now) }
    private var earnedToday: Int { Store.earned(on: .now, ledger: ledger) }

    private var suggestions: [Quest] {
        let available = Store.allQuests(custom: customQuests).filter {
            Store.completions(of: $0.id, on: .now, in: records) < $0.dailyLimit
        }
        var picked: [Quest] = []
        var seen = Set<QuestCategory>()
        for quest in available.sorted(by: { $0.reward > $1.reward }) where !seen.contains(quest.category) {
            picked.append(quest)
            seen.insert(quest.category)
            if picked.count == 3 { break }
        }
        return picked
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    WalletCard(
                        balance: balance,
                        minutesPerKey: minutesPerKey,
                        streak: streak,
                        earnedToday: earnedToday,
                        dailyGoal: dailyGoal
                    )
                    SessionCard(ledger: ledger, sessions: sessions, minutesPerKey: minutesPerKey)

                    VStack(spacing: 10) {
                        SectionLabel(title: "Earn keys", trailing: earnedToday >= dailyGoal ? "Goal reached" : nil)
                        if suggestions.isEmpty {
                            Text("You've done every quest available today. Impressive — see you tomorrow.")
                                .font(.rounded(.subheadline))
                                .foregroundStyle(Theme.textSecondary)
                                .card()
                        } else {
                            ForEach(suggestions) { quest in
                                Button { runningQuest = quest } label: {
                                    QuestRow(quest: quest, doneToday: Store.completions(of: quest.id, on: .now, in: records))
                                }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("suggested-\(quest.id)")
                            }
                        }
                    }

                    RecentActivity(entries: Array(ledger.prefix(6)))
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .screenBackground()
            .navigationTitle(greeting)
            .fullScreenCover(item: $runningQuest) { quest in
                QuestRunnerView(quest: quest)
            }
        }
        .onAppear {
            if !grantedWelcome {
                grantedWelcome = true
                if ledger.isEmpty { Store.grantWelcomeBonus(in: context) }
            }
            Store.closeExpiredSessions(sessions, in: context)
        }
    }

    private var greeting: String {
        switch Calendar.current.component(.hour, from: .now) {
        case 5..<12: "Good morning"
        case 12..<17: "Good afternoon"
        case 17..<22: "Good evening"
        default: "Late night"
        }
    }
}

// MARK: - Wallet

private struct WalletCard: View {
    let balance: Int
    let minutesPerKey: Int
    let streak: Int
    let earnedToday: Int
    let dailyGoal: Int

    var body: some View {
        HStack(alignment: .center, spacing: 18) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Your keys")
                    .font(.rounded(.subheadline, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: "key.fill")
                        .rotationEffect(.degrees(-45))
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(Theme.gold)
                    Text("\(balance)")
                        .font(.system(size: 52, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .foregroundStyle(Theme.textPrimary)
                        .accessibilityIdentifier("walletBalance")
                }
                Text("= \(balance * minutesPerKey) min of scroll time")
                    .font(.rounded(.footnote, weight: .medium))
                    .foregroundStyle(Theme.textSecondary)
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .foregroundStyle(streak > 0 ? Theme.coral : Theme.textTertiary)
                    Text(streak == 1 ? "1-day streak" : "\(streak)-day streak")
                        .font(.rounded(.footnote, weight: .bold))
                        .foregroundStyle(streak > 0 ? Theme.textPrimary : Theme.textTertiary)
                }
                .padding(.top, 4)
            }
            Spacer(minLength: 0)
            ZStack {
                Ring(progress: Double(earnedToday) / Double(max(dailyGoal, 1)), color: Theme.mint, lineWidth: 9)
                VStack(spacing: 0) {
                    Text("\(earnedToday)/\(dailyGoal)")
                        .font(.rounded(.headline, weight: .heavy))
                        .monospacedDigit()
                        .foregroundStyle(Theme.textPrimary)
                    Text("today")
                        .font(.rounded(.caption2, weight: .semibold))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .frame(width: 92, height: 92)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Earned \(earnedToday) of \(dailyGoal) keys today")
        }
        .card(padding: 20, tint: Theme.gold)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: balance)
    }
}

// MARK: - Recent activity

private struct RecentActivity: View {
    let entries: [LedgerEntry]

    var body: some View {
        if !entries.isEmpty {
            VStack(spacing: 10) {
                SectionLabel(title: "Recent activity")
                VStack(spacing: 0) {
                    ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                        HStack(spacing: 12) {
                            Image(systemName: symbol(for: entry.kind))
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(color(for: entry.kind))
                                .frame(width: 30, height: 30)
                                .background(color(for: entry.kind).opacity(0.14), in: Circle())
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.note)
                                    .font(.rounded(.subheadline, weight: .semibold))
                                    .foregroundStyle(Theme.textPrimary)
                                    .lineLimit(1)
                                Text(entry.date, format: .relative(presentation: .named))
                                    .font(.rounded(.caption))
                                    .foregroundStyle(Theme.textTertiary)
                            }
                            Spacer()
                            KeyAmount(amount: entry.amount, showSign: true)
                        }
                        .padding(.vertical, 10)
                        if index < entries.count - 1 {
                            Divider().overlay(Theme.stroke)
                        }
                    }
                }
                .card(padding: 14)
            }
        }
    }

    private func symbol(for kind: LedgerKind) -> String {
        switch kind {
        case .earned: "checkmark"
        case .spent: "iphone.gen3"
        case .refund: "arrow.uturn.backward"
        case .bonus: "gift.fill"
        }
    }

    private func color(for kind: LedgerKind) -> Color {
        switch kind {
        case .earned: Theme.mint
        case .spent: Theme.sky
        case .refund: Theme.violet
        case .bonus: Theme.gold
        }
    }
}
