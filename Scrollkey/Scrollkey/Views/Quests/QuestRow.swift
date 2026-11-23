import SwiftUI

struct QuestRow: View {
    let quest: Quest
    let doneToday: Int

    private var maxed: Bool { doneToday >= quest.dailyLimit }

    var body: some View {
        HStack(spacing: 14) {
            SymbolTile(symbol: quest.symbol, color: maxed ? Theme.textTertiary : quest.color)
            VStack(alignment: .leading, spacing: 3) {
                Text(quest.title)
                    .font(.rounded(.headline, weight: .bold))
                    .foregroundStyle(maxed ? Theme.textSecondary : Theme.textPrimary)
                Text(quest.subtitle)
                    .font(.rounded(.subheadline))
                    .foregroundStyle(Theme.textSecondary)
                    .lineLimit(1)
                HStack(spacing: 5) {
                    Image(systemName: quest.verification.symbol)
                    Text(quest.verification.label)
                }
                .font(.rounded(.caption2, weight: .semibold))
                .foregroundStyle(Theme.textTertiary)
            }
            Spacer(minLength: 4)
            VStack(alignment: .trailing, spacing: 6) {
                if maxed {
                    Label("Done", systemImage: "checkmark.circle.fill")
                        .font(.rounded(.footnote, weight: .bold))
                        .foregroundStyle(Theme.mint)
                } else {
                    RewardChip(reward: quest.reward)
                }
                if quest.dailyLimit > 1 {
                    Text("\(min(doneToday, quest.dailyLimit))/\(quest.dailyLimit) today")
                        .font(.rounded(.caption2, weight: .semibold))
                        .foregroundStyle(Theme.textTertiary)
                        .monospacedDigit()
                }
            }
        }
        .card(padding: 14)
        .opacity(maxed ? 0.7 : 1)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}
