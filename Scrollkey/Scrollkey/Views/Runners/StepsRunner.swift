import SwiftUI

/// Walking quest verified by the motion coprocessor.
struct StepsRunner: View {
    let target: Int
    let color: Color
    let onComplete: (String?) -> Void

    @Environment(\.scenePhase) private var scenePhase
    @State private var counter = StepCounter()
    @State private var startedAt: Date?
    @State private var finished = false

    private var progress: Double { Double(counter.steps) / Double(max(target, 1)) }

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 12)
            ZStack {
                Ring(progress: progress, color: color, lineWidth: 14)
                VStack(spacing: 4) {
                    Text(counter.steps.formatted())
                        .font(.system(size: 54, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText())
                        .foregroundStyle(Theme.textPrimary)
                        .accessibilityIdentifier("stepCount")
                    Text("of \(target.formatted()) steps")
                        .font(.rounded(.subheadline, weight: .semibold))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .frame(width: 250, height: 250)
            .animation(.spring(response: 0.5, dampingFraction: 0.8), value: counter.steps)

            Group {
                if let error = counter.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(Theme.coral)
                } else if startedAt != nil {
                    Text("Lock your phone and walk — steps keep counting. Open Scrollkey when you're back to collect.")
                        .foregroundStyle(Theme.textTertiary)
                } else {
                    Text("Only steps taken after you press Start count.")
                        .foregroundStyle(Theme.textTertiary)
                }
            }
            .font(.rounded(.footnote))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 24)
            .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 12)

            if startedAt == nil {
                Button("Start walking") {
                    let now = Date.now
                    startedAt = now
                    counter.start(from: now)
                }
                .buttonStyle(PrimaryButtonStyle(tint: color))
                .accessibilityIdentifier("startWalking")
            }

            #if DEBUG
            if startedAt != nil && !counter.isAvailable {
                Button("Simulate 250 steps (simulator only)") {
                    counter.simulate(250)
                }
                .buttonStyle(SecondaryButtonStyle(tint: Theme.textSecondary))
                .accessibilityIdentifier("simulateSteps")
            }
            #endif
        }
        .onChange(of: counter.steps) { _, steps in
            guard steps >= target, !finished else { return }
            finished = true
            counter.stop()
            onComplete("\(steps.formatted()) steps")
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active, let startedAt, !finished, counter.isAvailable else { return }
            counter.start(from: startedAt)
        }
        .onDisappear { counter.stop() }
    }
}
