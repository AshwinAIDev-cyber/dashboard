import SwiftUI
import UIKit

/// Countdown quest. Strict timers fail if you leave Scrollkey; relaxed ones
/// keep running while the phone is in your pocket.
struct TimerRunner: View {
    let minutes: Int
    let strict: Bool
    let color: Color
    let onComplete: (String?) -> Void

    @Environment(\.scenePhase) private var scenePhase
    @State private var startedAt: Date?
    @State private var failed = false
    @State private var finished = false

    private var total: TimeInterval { Double(minutes) * LaunchFlags.secondsPerMinute }

    var body: some View {
        VStack(spacing: 26) {
            Spacer(minLength: 12)
            TimelineView(.periodic(from: .now, by: 0.5)) { context in
                let elapsed = startedAt.map { context.date.timeIntervalSince($0) } ?? 0
                let remaining = max(0, total - elapsed)
                ZStack {
                    Ring(progress: startedAt == nil ? 0 : elapsed / total, color: failed ? Theme.coral : color, lineWidth: 14)
                    VStack(spacing: 6) {
                        Text(Economy.clock(startedAt == nil ? total : remaining))
                            .font(.system(size: 52, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(Theme.textPrimary)
                            .contentTransition(.numericText(countsDown: true))
                            .accessibilityIdentifier("timerClock")
                        Text(statusText)
                            .font(.rounded(.subheadline, weight: .semibold))
                            .foregroundStyle(failed ? Theme.coral : Theme.textSecondary)
                    }
                }
                .frame(width: 250, height: 250)
            }

            Text(rulesText)
                .font(.rounded(.footnote))
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.textTertiary)
                .padding(.horizontal, 24)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 12)
            controls
        }
        .task(id: startedAt) { await watch() }
        .onChange(of: scenePhase) { _, phase in
            guard strict, phase == .background, startedAt != nil, !finished else { return }
            fail()
        }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        .sensoryFeedback(.error, trigger: failed)
    }

    @ViewBuilder
    private var controls: some View {
        if startedAt != nil {
            Button("Give up") {
                startedAt = nil
                UIApplication.shared.isIdleTimerDisabled = false
            }
            .buttonStyle(SecondaryButtonStyle(tint: Theme.textSecondary))
        } else {
            Button(failed ? "Try again" : "Start \(minutes)-minute timer") {
                failed = false
                startedAt = .now
                UIApplication.shared.isIdleTimerDisabled = true
            }
            .buttonStyle(PrimaryButtonStyle(tint: color))
            .accessibilityIdentifier("startTimer")
        }
    }

    private var statusText: String {
        if failed { return "You left the app" }
        if startedAt == nil { return "Ready when you are" }
        return strict ? "Stay with it" : "Timer running"
    }

    private var rulesText: String {
        if failed {
            return "Strict quests only count if Scrollkey stays open the whole time. Your screen won't dim while the timer runs."
        }
        return strict
            ? "Keep Scrollkey open until the timer ends — switching apps or locking your phone fails the quest. The screen stays on while it runs."
            : "Put your phone down and go. The timer keeps counting even if you lock the screen."
    }

    private func watch() async {
        guard let startedAt else { return }
        while !Task.isCancelled {
            if Date.now.timeIntervalSince(startedAt) >= total {
                finish()
                return
            }
            try? await Task.sleep(for: .milliseconds(400))
        }
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        UIApplication.shared.isIdleTimerDisabled = false
        onComplete("\(minutes) min")
    }

    private func fail() {
        startedAt = nil
        failed = true
        UIApplication.shared.isIdleTimerDisabled = false
    }
}
