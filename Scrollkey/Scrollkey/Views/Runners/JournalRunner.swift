import SwiftData
import SwiftUI

enum JournalPrompts {
    static let reflection = [
        "What took more energy than it should have today?",
        "What's one thing you'd do differently if today restarted?",
        "Describe a moment today when you felt fully switched on.",
        "What are you avoiding right now, and what's the smallest first step?",
        "What did you learn this week that surprised you?",
        "Who made your day better recently? Tell them how, here first.",
        "What would future-you thank you for doing tonight?",
    ]
    static let gratitude = [
        "Three things that went right today…",
        "Three small things you'd miss if they disappeared…",
        "Three people or places you're glad exist…",
    ]
}

/// Writing quest: complete once the entry reaches a minimum word count.
struct JournalRunner: View {
    let minWords: Int
    let prompts: [String]
    let color: Color
    let onComplete: (String?) -> Void

    @Environment(\.modelContext) private var context
    @State private var prompt = ""
    @State private var text = ""
    @FocusState private var focused: Bool

    private var count: Int { Economy.wordCount(text) }

    var body: some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 10) {
                Text(prompt)
                    .font(.rounded(.headline, weight: .semibold))
                    .foregroundStyle(Theme.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Button {
                    prompt = prompts.filter { $0 != prompt }.randomElement() ?? prompt
                } label: {
                    Image(systemName: "shuffle")
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 32, height: 32)
                        .background(Theme.surfaceRaised, in: Circle())
                }
                .accessibilityLabel("New prompt")
            }
            .padding(.top, 20)

            TextEditor(text: $text)
                .focused($focused)
                .font(.rounded(.body))
                .scrollContentBackground(.hidden)
                .padding(12)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(focused ? color.opacity(0.5) : Theme.stroke)
                )
                .frame(minHeight: 110, maxHeight: .infinity)
                .accessibilityIdentifier("journalEditor")

            VStack(spacing: 6) {
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Theme.surfaceRaised)
                        Capsule()
                            .fill(color)
                            .frame(width: proxy.size.width * min(Double(count) / Double(minWords), 1))
                    }
                }
                .frame(height: 6)
                HStack {
                    Text("\(count) / \(minWords) words")
                        .monospacedDigit()
                    Spacer()
                    Text("Saved to your journal")
                }
                .font(.rounded(.caption, weight: .semibold))
                .foregroundStyle(Theme.textTertiary)
            }
            .animation(.easeOut(duration: 0.2), value: count)

            Button(count >= minWords ? "Save entry" : "\(minWords - count) more words") {
                save()
            }
            .buttonStyle(PrimaryButtonStyle(tint: color))
            .disabled(count < minWords)
            .accessibilityIdentifier("saveJournal")
        }
        .onAppear {
            if prompt.isEmpty { prompt = prompts.randomElement() ?? "" }
        }
    }

    private func save() {
        guard count >= minWords else { return }
        focused = false
        context.insert(JournalEntry(prompt: prompt, text: text.trimmingCharacters(in: .whitespacesAndNewlines)))
        onComplete("\(count) words")
    }
}
