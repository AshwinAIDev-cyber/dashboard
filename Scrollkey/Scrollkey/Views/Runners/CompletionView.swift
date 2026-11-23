import SwiftUI

/// Celebration shown after a quest pays out.
struct CompletionView: View {
    let quest: Quest
    let detail: String?
    let balance: Int
    let onDone: () -> Void

    @AppStorage(Prefs.minutesPerKey) private var minutesPerKey = 5
    @State private var burst = false
    @State private var celebrate = 0

    private struct Particle {
        let dx: Double
        let dy: Double
        let rotation: Double
        let delay: Double
    }

    private static let particles: [Particle] = {
        var result: [Particle] = []
        for index in 0..<12 {
            let angle = Double(index) / 12.0 * 2.0 * Double.pi
            let distance = 110.0 + Double(index % 3) * 28.0
            result.append(Particle(
                dx: cos(angle) * distance,
                dy: sin(angle) * distance,
                rotation: -45.0 + Double(index) * 30.0,
                delay: Double(index % 4) * 0.03
            ))
        }
        return result
    }()

    private func particleView(_ particle: Particle) -> some View {
        let x: Double = burst ? particle.dx : 0
        let y: Double = burst ? particle.dy : 0
        return Image(systemName: "key.fill")
            .rotationEffect(.degrees(particle.rotation))
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(Theme.gold)
            .offset(x: x, y: y)
            .opacity(burst ? 0 : 1)
            .animation(.easeOut(duration: 1.1).delay(particle.delay), value: burst)
    }

    var body: some View {
        ZStack {
            Theme.background.opacity(0.94).ignoresSafeArea()
            GlowBackdrop(color: Theme.gold, size: 340)

            VStack(spacing: 22) {
                Spacer()
                ZStack {
                    ForEach(Self.particles.indices, id: \.self) { index in
                        particleView(Self.particles[index])
                    }
                    Circle()
                        .fill(Theme.gold)
                        .frame(width: 120, height: 120)
                        .shadow(color: Theme.gold.opacity(0.6), radius: 30)
                        .overlay(
                            Image(systemName: "key.fill")
                                .rotationEffect(.degrees(-45))
                                .font(.system(size: 52, weight: .bold))
                                .foregroundStyle(Color.black.opacity(0.8))
                        )
                        .scaleEffect(burst ? 1 : 0.4)
                        .animation(.spring(response: 0.5, dampingFraction: 0.55), value: burst)
                }
                .frame(height: 240)
                .accessibilityHidden(true)

                VStack(spacing: 8) {
                    Text("+\(quest.reward) \(quest.reward == 1 ? "key" : "keys")")
                        .font(.system(size: 44, weight: .heavy, design: .rounded))
                        .foregroundStyle(Theme.gold)
                        .accessibilityIdentifier("completionReward")
                    Text("\(quest.title) complete")
                        .font(.rounded(.title3, weight: .bold))
                        .foregroundStyle(Theme.textPrimary)
                    if let detail {
                        Text(detail)
                            .font(.rounded(.subheadline, weight: .semibold))
                            .foregroundStyle(Theme.textSecondary)
                    }
                }

                Text("Wallet: \(balance) \(balance == 1 ? "key" : "keys") · \(balance * minutesPerKey) min of scroll time")
                    .font(.rounded(.footnote, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Theme.surface, in: Capsule())

                Spacer()
                Button("Nice") { onDone() }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("completionDone")
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .onAppear {
            burst = true
            celebrate += 1
        }
        .sensoryFeedback(.success, trigger: celebrate)
    }
}
