import SwiftUI

/// Honor-system quest, confirmed with a deliberate press-and-hold.
struct HonorRunner: View {
    let quest: Quest
    let onComplete: (String?) -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            VStack(spacing: 12) {
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(quest.color)
                Text("Do it for real first.")
                    .font(.rounded(.title3, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Text("This quest runs on the honor system. Nobody's checking — which is exactly why it counts.")
                    .font(.rounded(.subheadline))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Theme.textSecondary)
                    .padding(.horizontal, 16)
            }
            .card(padding: 24, tint: quest.color)
            Spacer()
            HoldToConfirmButton(title: "Hold when you're done", duration: 1.5, tint: quest.color) {
                onComplete(nil)
            }
        }
    }
}
