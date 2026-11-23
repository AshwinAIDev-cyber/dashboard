import SwiftUI

/// A key symbol with an amount, e.g. "🔑 3".
struct KeyAmount: View {
    let amount: Int
    var font: Font = .rounded(.subheadline, weight: .bold)
    var showSign = false

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "key.fill")
                .rotationEffect(.degrees(-45))
                .imageScale(.small)
            Text(showSign && amount > 0 ? "+\(amount)" : "\(amount)")
                .contentTransition(.numericText())
                .monospacedDigit()
        }
        .font(font)
        .foregroundStyle(amount < 0 ? Theme.textSecondary : Theme.gold)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(amount) \(abs(amount) == 1 ? "key" : "keys")")
    }
}

/// Pill showing a quest's key reward.
struct RewardChip: View {
    let reward: Int

    var body: some View {
        KeyAmount(amount: reward, font: .rounded(.footnote, weight: .bold), showSign: true)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Theme.gold.opacity(0.12), in: Capsule())
    }
}

/// Circular progress ring.
struct Ring: View {
    var progress: Double
    var color: Color
    var lineWidth: CGFloat = 10
    var track: Color = Theme.surfaceRaised

    var body: some View {
        ZStack {
            Circle().stroke(track, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: max(0.001, min(progress, 1)))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: color.opacity(0.45), radius: 8)
        }
    }
}

/// Rounded square holding an SF Symbol in a category color.
struct SymbolTile: View {
    let symbol: String
    let color: Color
    var size: CGFloat = 46

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
            .fill(color.opacity(0.16))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: symbol)
                    .font(.system(size: size * 0.42, weight: .semibold))
                    .foregroundStyle(color)
            )
            .accessibilityHidden(true)
    }
}

/// Button that only fires after being held down — adds friction to
/// honor-system quests so they can't be tapped through by reflex.
struct HoldToConfirmButton: View {
    let title: String
    var duration: Double = 1.5
    var tint: Color = Theme.gold
    let action: () -> Void

    @State private var progress: Double = 0
    @State private var isPressing = false
    @State private var fired = 0

    var body: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Theme.surfaceRaised)
            GeometryReader { proxy in
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(tint)
                    .frame(width: proxy.size.width * progress)
            }
            HStack(spacing: 8) {
                Image(systemName: progress >= 1 ? "checkmark" : "hand.tap.fill")
                Text(isPressing ? "Keep holding…" : title)
            }
            .font(.rounded(.headline, weight: .bold))
            .foregroundStyle(progress > 0.5 ? Color.black.opacity(0.85) : Theme.textPrimary)
            .frame(maxWidth: .infinity)
        }
        .frame(height: 58)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .contentShape(Rectangle())
        .onLongPressGesture(minimumDuration: duration, maximumDistance: 60) {
            progress = 1
            fired += 1
            action()
        } onPressingChanged: { pressing in
            isPressing = pressing
            if pressing {
                withAnimation(.linear(duration: duration)) { progress = 1 }
            } else if fired == 0 {
                withAnimation(.easeOut(duration: 0.25)) { progress = 0 }
            }
        }
        .sensoryFeedback(.success, trigger: fired)
        .sensoryFeedback(.impact(weight: .light), trigger: isPressing)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityHint("Press and hold to confirm")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            fired += 1
            action()
        }
        .accessibilityIdentifier("holdToConfirm")
    }
}

/// Glowing backdrop blob used behind hero content.
struct GlowBackdrop: View {
    var color: Color = Theme.gold
    var size: CGFloat = 260

    var body: some View {
        Circle()
            .fill(color.opacity(0.22))
            .frame(width: size, height: size)
            .blur(radius: size * 0.35)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}
