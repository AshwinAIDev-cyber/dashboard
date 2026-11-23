import SwiftUI

/// Scrollkey's visual language: deep ink surfaces, a warm "key gold" accent
/// for anything you earn or spend, and rounded type throughout.
enum Theme {
    static let background = Color(hex: 0x0B0D12)
    static let surface = Color(hex: 0x141821)
    static let surfaceRaised = Color(hex: 0x1C2130)
    static let stroke = Color.white.opacity(0.07)

    static let gold = Color(hex: 0xFFC53D)
    static let mint = Color(hex: 0x3DDC97)
    static let coral = Color(hex: 0xFF6B5B)
    static let sky = Color(hex: 0x5AB8FF)
    static let violet = Color(hex: 0xA78BFA)

    static let textPrimary = Color.white
    static let textSecondary = Color(hex: 0x9AA3B2)
    static let textTertiary = Color(hex: 0x5E6675)

    static let cornerRadius: CGFloat = 22
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

extension Font {
    static func rounded(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style, design: .rounded).weight(weight)
    }
}

// MARK: - Card

struct CardModifier: ViewModifier {
    var padding: CGFloat
    var tint: Color?

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .fill(Theme.surface)
                    .overlay {
                        if let tint {
                            RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                .fill(LinearGradient(colors: [tint.opacity(0.16), .clear], startPoint: .topLeading, endPoint: .bottomTrailing))
                        }
                    }
            }
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                    .strokeBorder(tint?.opacity(0.25) ?? Theme.stroke)
            )
    }
}

extension View {
    func card(padding: CGFloat = 18, tint: Color? = nil) -> some View {
        modifier(CardModifier(padding: padding, tint: tint))
    }

    /// Standard screen background for scrollable tab content.
    func screenBackground() -> some View {
        self
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
    }
}

// MARK: - Buttons

struct PrimaryButtonStyle: ButtonStyle {
    var tint: Color = Theme.gold
    @Environment(\.isEnabled) var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.rounded(.headline, weight: .bold))
            .foregroundStyle(isEnabled ? Color.black.opacity(0.85) : Theme.textTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isEnabled ? tint : Theme.surfaceRaised)
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var tint: Color = Theme.textPrimary

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.rounded(.headline, weight: .semibold))
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Theme.surfaceRaised)
            )
            .opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// Small rounded label used for section headers.
struct SectionLabel: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack {
            Text(title.uppercased())
                .font(.rounded(.caption, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(Theme.textTertiary)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
            }
        }
        .padding(.horizontal, 4)
    }
}
