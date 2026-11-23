import Charts
import SwiftData
import SwiftUI

/// "Progress" tab: streaks, totals, the weekly earn/spend chart, and history.
struct StatsView: View {
    @Query(sort: \LedgerEntry.date, order: .reverse) private var ledger: [LedgerEntry]
    @Query(sort: \QuestRecord.date, order: .reverse) private var records: [QuestRecord]
    @Query(sort: \ScrollSession.startedAt, order: .reverse) private var sessions: [ScrollSession]
    @Query(sort: \JournalEntry.date, order: .reverse) private var journal: [JournalEntry]

    private var activeDays: Set<Date> { Store.activeDays(records) }

    private struct DayBar: Identifiable {
        let id = UUID()
        let day: Date
        let kind: String
        let keys: Int
    }

    private var week: [DayBar] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        return (0..<7).reversed().flatMap { offset -> [DayBar] in
            guard let day = calendar.date(byAdding: .day, value: -offset, to: today) else { return [] }
            var earned = 0
            var spent = 0
            for entry in ledger where calendar.isDate(entry.date, inSameDayAs: day) {
                switch entry.kind {
                case .earned: earned += entry.amount
                case .spent: spent -= entry.amount
                case .refund: spent -= entry.amount
                case .bonus: break
                }
            }
            return [DayBar(day: day, kind: "Earned", keys: earned), DayBar(day: day, kind: "Spent", keys: max(spent, 0))]
        }
    }

    private var totalEarned: Int { ledger.filter { $0.kind == .earned }.reduce(0) { $0 + $1.amount } }
    private var minutesScrolled: Int { sessions.reduce(0) { $0 + $1.usedMinutes } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    streakCard
                    totals
                    weekChart
                    categoryBreakdown
                    journalLink
                    history
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .screenBackground()
            .navigationTitle("Progress")
        }
    }

    private var streakCard: some View {
        let current = Economy.streak(activeDays: activeDays, today: .now)
        let best = max(Economy.bestStreak(activeDays: activeDays), current)
        return HStack(spacing: 16) {
            Image(systemName: "flame.fill")
                .font(.system(size: 38, weight: .bold))
                .foregroundStyle(current > 0 ? Theme.coral : Theme.textTertiary)
                .frame(width: 64, height: 64)
                .background(Theme.coral.opacity(current > 0 ? 0.16 : 0.06), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text("\(current)-day streak")
                    .font(.rounded(.title2, weight: .heavy))
                    .foregroundStyle(Theme.textPrimary)
                Text(current == 0 ? "Finish any quest today to start one." : "Best ever: \(best) \(best == 1 ? "day" : "days")")
                    .font(.rounded(.subheadline))
                    .foregroundStyle(Theme.textSecondary)
            }
            Spacer()
        }
        .card(tint: Theme.coral)
    }

    private var totals: some View {
        HStack(spacing: 10) {
            StatTile(value: "\(totalEarned)", label: "keys earned", color: Theme.gold)
            StatTile(value: "\(records.count)", label: "quests done", color: Theme.mint)
            StatTile(value: "\(minutesScrolled)", label: "min scrolled", color: Theme.sky)
        }
    }

    private var weekChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Last 7 days")
                .font(.rounded(.headline, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Chart(week) { bar in
                BarMark(
                    x: .value("Day", bar.day, unit: .day),
                    y: .value("Keys", bar.keys)
                )
                .foregroundStyle(by: .value("Kind", bar.kind))
                .position(by: .value("Kind", bar.kind))
                .cornerRadius(4)
            }
            .chartForegroundStyleScale(["Earned": Theme.mint, "Spent": Theme.gold])
            .chartXAxis {
                AxisMarks(values: .stride(by: .day)) { _ in
                    AxisValueLabel(format: .dateTime.weekday(.narrow))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine().foregroundStyle(Theme.stroke)
                    AxisValueLabel().foregroundStyle(Theme.textTertiary)
                }
            }
            .chartLegend(position: .top, alignment: .trailing)
            .frame(height: 180)
        }
        .card()
    }

    private var categoryBreakdown: some View {
        let monthAgo = Calendar.current.date(byAdding: .day, value: -30, to: .now) ?? .distantPast
        let recent = records.filter { $0.date >= monthAgo }
        let counts = QuestCategory.allCases.map { category in
            (category, recent.filter { $0.category == category }.count)
        }
        let maxCount = max(counts.map(\.1).max() ?? 0, 1)
        return VStack(alignment: .leading, spacing: 12) {
            Text("Where your keys come from")
                .font(.rounded(.headline, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Text("Quests completed in the last 30 days")
                .font(.rounded(.caption))
                .foregroundStyle(Theme.textTertiary)
            ForEach(counts, id: \.0) { category, count in
                HStack(spacing: 10) {
                    Text(category.title)
                        .font(.rounded(.subheadline, weight: .semibold))
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 58, alignment: .leading)
                    GeometryReader { proxy in
                        Capsule()
                            .fill(category.color)
                            .frame(width: max(6, proxy.size.width * Double(count) / Double(maxCount)))
                            .opacity(count == 0 ? 0.25 : 1)
                    }
                    .frame(height: 10)
                    Text("\(count)")
                        .font(.rounded(.subheadline, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Theme.textPrimary)
                        .frame(width: 30, alignment: .trailing)
                }
            }
        }
        .card()
    }

    private var journalLink: some View {
        NavigationLink {
            JournalListView()
        } label: {
            HStack(spacing: 14) {
                SymbolTile(symbol: "book.closed.fill", color: Theme.coral, size: 42)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Journal")
                        .font(.rounded(.headline, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                    Text(journal.isEmpty ? "Entries from writing quests land here" : "\(journal.count) \(journal.count == 1 ? "entry" : "entries")")
                        .font(.rounded(.subheadline))
                        .foregroundStyle(Theme.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(Theme.textTertiary)
            }
            .card(padding: 14)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var history: some View {
        VStack(spacing: 10) {
            SectionLabel(title: "Quest history")
            if records.isEmpty {
                Text("Completed quests will show up here.")
                    .font(.rounded(.subheadline))
                    .foregroundStyle(Theme.textSecondary)
                    .card()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(records.prefix(15).enumerated()), id: \.element.id) { index, record in
                        HStack(spacing: 12) {
                            SymbolTile(symbol: record.symbol, color: record.category.color, size: 34)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(record.title)
                                    .font(.rounded(.subheadline, weight: .semibold))
                                    .foregroundStyle(Theme.textPrimary)
                                Text([record.detail, record.date.formatted(.relative(presentation: .named))].compactMap { $0 }.joined(separator: " · "))
                                    .font(.rounded(.caption))
                                    .foregroundStyle(Theme.textTertiary)
                            }
                            Spacer()
                            KeyAmount(amount: record.keys, showSign: true)
                        }
                        .padding(.vertical, 9)
                        if index < min(records.count, 15) - 1 {
                            Divider().overlay(Theme.stroke)
                        }
                    }
                }
                .card(padding: 14)
            }
        }
    }
}

private struct StatTile: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.rounded(.title2, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .font(.rounded(.caption, weight: .semibold))
                .foregroundStyle(Theme.textSecondary)
        }
        .card(padding: 14)
    }
}
