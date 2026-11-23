import SwiftData
import SwiftUI

/// Full-screen flow for doing one quest: verify it, then pay out keys.
struct QuestRunnerView: View {
    let quest: Quest

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @Query(sort: \QuestRecord.date, order: .reverse) private var records: [QuestRecord]
    @Query private var ledger: [LedgerEntry]

    @State private var completedDetail: String??
    @State private var alreadyMaxed = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            GlowBackdrop(color: quest.color, size: 320)
                .offset(y: -260)

            VStack(spacing: 0) {
                header
                if alreadyMaxed {
                    maxedView
                } else {
                    runner
                        .frame(maxHeight: .infinity)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 12)

            if let detail = completedDetail {
                CompletionView(quest: quest, detail: detail, balance: Store.balance(ledger)) {
                    dismiss()
                }
                .transition(.opacity.combined(with: .scale(scale: 1.05)))
                .zIndex(1)
            }
        }
        .onAppear {
            alreadyMaxed = Store.completions(of: quest.id, on: .now, in: records) >= quest.dailyLimit
        }
    }

    private var isWriting: Bool {
        if case .words = quest.verification { return true }
        return false
    }

    private var header: some View {
        VStack(spacing: 14) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 36, height: 36)
                        .background(Theme.surfaceRaised, in: Circle())
                }
                .accessibilityLabel("Close")
                .accessibilityIdentifier("closeQuest")
                Spacer()
                RewardChip(reward: quest.reward)
            }
            if !isWriting {
                SymbolTile(symbol: quest.symbol, color: quest.color, size: 64)
            }
            VStack(spacing: 6) {
                Text(quest.title)
                    .font(.system(size: isWriting ? 22 : 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.textPrimary)
                Text(quest.subtitle)
                    .font(.rounded(.body))
                    .foregroundStyle(Theme.textSecondary)
                Label(quest.verification.label, systemImage: quest.verification.symbol)
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(quest.color)
                    .padding(.top, 2)
            }
            .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private var runner: some View {
        switch quest.verification {
        case .steps(let target):
            StepsRunner(target: target, color: quest.color, onComplete: finish)
        case .timer(let minutes, let strict):
            TimerRunner(minutes: minutes, strict: strict, color: quest.color, onComplete: finish)
        case .breathing(let cycles):
            BreathingRunner(cycles: cycles, color: quest.color, onComplete: finish)
        case .words(let minimum):
            JournalRunner(
                minWords: minimum,
                prompts: quest.id == "gratitude" ? JournalPrompts.gratitude : JournalPrompts.reflection,
                color: quest.color,
                onComplete: finish
            )
        case .honor:
            HonorRunner(quest: quest, onComplete: finish)
        }
    }

    private var maxedView: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 54))
                .foregroundStyle(Theme.mint)
            Text("Done for today")
                .font(.rounded(.title2, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Text("You've finished this quest \(quest.dailyLimit == 1 ? "already" : "\(quest.dailyLimit) times") today. Try a different one, or come back tomorrow.")
                .font(.rounded(.body))
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.textSecondary)
            Spacer()
            Button("Back to quests") { dismiss() }
                .buttonStyle(SecondaryButtonStyle())
        }
    }

    private func finish(_ detail: String?) {
        guard completedDetail == nil else { return }
        Store.complete(quest, detail: detail, in: context)
        withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) {
            completedDetail = .some(detail)
        }
    }
}
