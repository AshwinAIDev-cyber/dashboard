import SwiftData
import SwiftUI

struct QuestsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \QuestRecord.date, order: .reverse) private var records: [QuestRecord]
    @Query(sort: \CustomQuest.createdAt) private var customQuests: [CustomQuest]

    @State private var runningQuest: Quest?
    @State private var showingEditor = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Pick something real to do. Verified quests — steps, timers, words — pay the most.")
                        .font(.rounded(.subheadline))
                        .foregroundStyle(Theme.textSecondary)
                        .padding(.horizontal, 4)

                    ForEach(QuestCategory.allCases) { category in
                        let quests = Quest.catalog.filter { $0.category == category }
                        VStack(spacing: 10) {
                            SectionLabel(title: category.title)
                            ForEach(quests) { quest in
                                row(quest)
                            }
                        }
                    }

                    VStack(spacing: 10) {
                        SectionLabel(title: "Your quests")
                        ForEach(customQuests) { custom in
                            let quest = Quest.custom(custom)
                            row(quest)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        context.delete(custom)
                                        Store.save(context)
                                    } label: {
                                        Label("Delete quest", systemImage: "trash")
                                    }
                                }
                        }
                        Button {
                            showingEditor = true
                        } label: {
                            Label("Create your own quest", systemImage: "plus.circle.fill")
                                .font(.rounded(.headline, weight: .semibold))
                                .foregroundStyle(Theme.gold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadius, style: .continuous)
                                        .strokeBorder(Theme.gold.opacity(0.35), style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
                                )
                        }
                        .accessibilityIdentifier("createCustomQuest")
                        if !customQuests.isEmpty {
                            Text("Press and hold one of your quests to delete it.")
                                .font(.rounded(.caption))
                                .foregroundStyle(Theme.textTertiary)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .screenBackground()
            .navigationTitle("Quests")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingEditor = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("New quest")
                }
            }
            .sheet(isPresented: $showingEditor) {
                CustomQuestEditor()
            }
            .fullScreenCover(item: $runningQuest) { quest in
                QuestRunnerView(quest: quest)
            }
        }
    }

    private func row(_ quest: Quest) -> some View {
        Button {
            runningQuest = quest
        } label: {
            QuestRow(quest: quest, doneToday: Store.completions(of: quest.id, on: .now, in: records))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("quest-\(quest.id)")
    }
}
