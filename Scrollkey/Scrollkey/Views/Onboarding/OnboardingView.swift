import SwiftUI

struct OnboardingView: View {
    let onFinish: () -> Void
    @State private var page = 0

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            symbol: "hourglass",
            color: Theme.coral,
            title: "Scrolling should cost something.",
            body: "Feeds are built to be free and endless. Scrollkey puts a price on them — paid in things that actually make your day better."
        ),
        OnboardingPage(
            symbol: "figure.walk",
            color: Theme.mint,
            title: "Do real things.\nEarn keys.",
            body: "Walk, breathe, focus, write. Every quest pays out keys. Walking quests are checked by your iPhone's step counter."
        ),
        OnboardingPage(
            symbol: "key.fill",
            color: Theme.gold,
            title: "Spend keys on\nscroll time.",
            body: "One key buys five minutes. Start a session when you want to scroll, and Scrollkey taps you on the shoulder when time's up."
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                ForEach(Array(pages.enumerated()), id: \.offset) { index, item in
                    OnboardingPageView(page: item)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack(spacing: 8) {
                ForEach(pages.indices, id: \.self) { index in
                    Capsule()
                        .fill(index == page ? Theme.gold : Theme.surfaceRaised)
                        .frame(width: index == page ? 24 : 8, height: 8)
                }
            }
            .animation(.spring(response: 0.35, dampingFraction: 0.8), value: page)
            .padding(.bottom, 28)
            .accessibilityHidden(true)

            Group {
                if page < pages.count - 1 {
                    Button("Next") {
                        withAnimation { page += 1 }
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .accessibilityIdentifier("onboardingNext")
                } else {
                    Button {
                        onFinish()
                    } label: {
                        HStack(spacing: 8) {
                            Text("Start with \(Economy.welcomeBonus) free keys")
                            Image(systemName: "arrow.right")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("onboardingStart")
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .background(Theme.background.ignoresSafeArea())
    }
}

private struct OnboardingPage {
    let symbol: String
    let color: Color
    let title: String
    let body: String
}

private struct OnboardingPageView: View {
    let page: OnboardingPage
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 36) {
            Spacer()
            ZStack {
                GlowBackdrop(color: page.color, size: 240)
                RoundedRectangle(cornerRadius: 48, style: .continuous)
                    .fill(Theme.surface)
                    .frame(width: 168, height: 168)
                    .overlay(
                        RoundedRectangle(cornerRadius: 48, style: .continuous)
                            .strokeBorder(page.color.opacity(0.35), lineWidth: 1.5)
                    )
                    .rotationEffect(.degrees(appeared ? -6 : 6))
                Image(systemName: page.symbol)
                    .font(.system(size: 72, weight: .semibold))
                    .foregroundStyle(page.color)
                    .scaleEffect(appeared ? 1 : 0.7)
            }
            .animation(.spring(response: 0.7, dampingFraction: 0.6), value: appeared)
            .accessibilityHidden(true)

            VStack(spacing: 14) {
                Text(page.title)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textPrimary)
                Text(page.body)
                    .font(.rounded(.body))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 32)
            Spacer()
        }
        .onAppear { appeared = true }
        .onDisappear { appeared = false }
    }
}
