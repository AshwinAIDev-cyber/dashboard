import SwiftUI
import UIKit

/// Guided box breathing: in 4, hold 4, out 4, hold 4.
struct BreathingRunner: View {
    let cycles: Int
    let color: Color
    let onComplete: (String?) -> Void

    @Environment(\.scenePhase) private var scenePhase
    @State private var startedAt: Date?
    @State private var finished = false
    @State private var interrupted = false

    private let phases: [(name: String, seconds: Double)] = [
        ("Breathe in", 4), ("Hold", 4), ("Breathe out", 4), ("Hold", 4),
    ]
    private var scale: Double { LaunchFlags.secondsPerMinute / 60 }
    private var cycleLength: Double { phases.reduce(0) { $0 + $1.seconds } * scale }

    var body: some View {
        VStack(spacing: 28) {
            Spacer(minLength: 12)
            TimelineView(.animation(minimumInterval: 1 / 30, paused: startedAt == nil)) { context in
                let state = breathState(at: context.date)
                ZStack {
                    Circle()
                        .stroke(color.opacity(0.18), lineWidth: 2)
                        .frame(width: 250, height: 250)
                    Circle()
                        .fill(RadialGradient(colors: [color.opacity(0.85), color.opacity(0.25)], center: .center, startRadius: 4, endRadius: 130))
                        .frame(width: 250, height: 250)
                        .scaleEffect(state.scale)
                        .shadow(color: color.opacity(0.5), radius: 30)
                    VStack(spacing: 6) {
                        Text(startedAt == nil ? (interrupted ? "Paused" : "Ready") : state.label)
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.white)
                        if startedAt != nil {
                            Text("Cycle \(min(state.cycle + 1, cycles)) of \(cycles)")
                                .font(.rounded(.subheadline, weight: .semibold))
                                .foregroundStyle(Color.white.opacity(0.75))
                                .monospacedDigit()
                        }
                    }
                }
                .sensoryFeedback(.impact(weight: .light), trigger: state.phaseIndex)
                .onChange(of: state.cycle) { _, cycle in
                    if cycle >= cycles { finish() }
                }
            }
            .frame(height: 280)

            Text(interrupted
                ? "Breathing pauses if you leave the app. Start again when you're ready."
                : "Follow the circle. Breathe through your nose, slow and even.")
                .font(.rounded(.footnote))
                .multilineTextAlignment(.center)
                .foregroundStyle(Theme.textTertiary)
                .padding(.horizontal, 24)

            Spacer(minLength: 12)

            if startedAt == nil {
                Button(interrupted ? "Start over" : "Begin") {
                    interrupted = false
                    startedAt = .now
                    UIApplication.shared.isIdleTimerDisabled = true
                }
                .buttonStyle(PrimaryButtonStyle(tint: color))
                .accessibilityIdentifier("startBreathing")
            } else {
                Button("Stop") {
                    startedAt = nil
                    UIApplication.shared.isIdleTimerDisabled = false
                }
                .buttonStyle(SecondaryButtonStyle(tint: Theme.textSecondary))
            }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .background, startedAt != nil, !finished else { return }
            startedAt = nil
            interrupted = true
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }

    private struct BreathState {
        var label: String
        var scale: Double
        var cycle: Int
        var phaseIndex: Int
    }

    private func breathState(at date: Date) -> BreathState {
        guard let startedAt else { return BreathState(label: "Ready", scale: 0.55, cycle: 0, phaseIndex: -1) }
        let elapsed = max(0, date.timeIntervalSince(startedAt))
        let cycle = Int(elapsed / cycleLength)
        var t = elapsed.truncatingRemainder(dividingBy: cycleLength) / scale
        for (index, phase) in phases.enumerated() {
            if t < phase.seconds || index == phases.count - 1 {
                let progress = min(max(t / phase.seconds, 0), 1)
                let eased = 0.5 - cos(progress * .pi) / 2
                let size: Double = switch index {
                case 0: 0.55 + 0.45 * eased
                case 1: 1
                case 2: 1 - 0.45 * eased
                default: 0.55
                }
                return BreathState(label: phase.name, scale: size, cycle: cycle, phaseIndex: cycle * phases.count + index)
            }
            t -= phase.seconds
        }
        return BreathState(label: "", scale: 0.55, cycle: cycle, phaseIndex: 0)
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        UIApplication.shared.isIdleTimerDisabled = false
        onComplete("\(cycles) cycles")
    }
}
