import SwiftData
import SwiftUI

struct CustomQuestEditor: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    @State private var title = ""
    @State private var symbol = "star.fill"
    @State private var reward = 1
    @State private var isTimed = false
    @State private var minutes = 10
    @State private var dailyLimit = 1

    private let symbols = [
        "star.fill", "figure.run", "dumbbell.fill", "bicycle", "music.note", "paintbrush.fill",
        "fork.knife", "bed.double.fill", "pawprint.fill", "leaf.fill", "graduationcap.fill", "phone.down.fill",
    ]

    private var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        NavigationStack {
            Form {
                Section("Quest") {
                    TextField("e.g. Practice guitar", text: $title)
                        .font(.rounded(.body, weight: .semibold))
                        .accessibilityIdentifier("customQuestTitle")
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 6), spacing: 10) {
                        ForEach(symbols, id: \.self) { item in
                            Button {
                                symbol = item
                            } label: {
                                Image(systemName: item)
                                    .font(.system(size: 18, weight: .semibold))
                                    .frame(width: 42, height: 42)
                                    .foregroundStyle(item == symbol ? Color.black.opacity(0.85) : Theme.textSecondary)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .fill(item == symbol ? Theme.gold : Theme.surfaceRaised)
                                    )
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(item.replacingOccurrences(of: ".", with: " "))
                            .accessibilityAddTraits(item == symbol ? .isSelected : [])
                        }
                    }
                    .padding(.vertical, 6)
                }
                .listRowBackground(Theme.surface)

                Section {
                    Toggle("Timed quest", isOn: $isTimed)
                        .tint(Theme.gold)
                    if isTimed {
                        Stepper("Duration: \(minutes) min", value: $minutes, in: 1...120)
                    }
                } footer: {
                    Text(isTimed
                        ? "A timer runs while you do it. You can put your phone down."
                        : "You'll press and hold to confirm when you're done.")
                }
                .listRowBackground(Theme.surface)

                Section {
                    Stepper("Reward: \(reward) \(reward == 1 ? "key" : "keys")", value: $reward, in: 1...4)
                    Stepper("Up to \(dailyLimit)× a day", value: $dailyLimit, in: 1...5)
                } footer: {
                    Text("Be honest with yourself — keys you hand out too easily make scroll time cheap again.")
                }
                .listRowBackground(Theme.surface)
            }
            .font(.rounded(.body))
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("New quest")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .fontWeight(.bold)
                        .disabled(trimmedTitle.isEmpty)
                        .accessibilityIdentifier("saveCustomQuest")
                }
            }
        }
        .presentationDetents([.large])
    }

    private func save() {
        context.insert(CustomQuest(
            title: String(trimmedTitle.prefix(60)),
            symbol: symbol,
            reward: reward,
            minutes: minutes,
            isTimed: isTimed,
            dailyLimit: dailyLimit
        ))
        Store.save(context)
        dismiss()
    }
}
