import SwiftData
import SwiftUI

struct JournalListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \JournalEntry.date, order: .reverse) private var entries: [JournalEntry]

    var body: some View {
        Group {
            if entries.isEmpty {
                ContentUnavailableView(
                    "No entries yet",
                    systemImage: "book.closed",
                    description: Text("Complete a Journal or Three Good Things quest and your writing is saved here.")
                )
            } else {
                List {
                    ForEach(entries) { entry in
                        NavigationLink {
                            JournalDetailView(entry: entry)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(entry.date.formatted(date: .abbreviated, time: .shortened))
                                    .font(.rounded(.caption, weight: .semibold))
                                    .foregroundStyle(Theme.textTertiary)
                                Text(entry.prompt)
                                    .font(.rounded(.subheadline, weight: .bold))
                                    .foregroundStyle(Theme.textPrimary)
                                Text(entry.text)
                                    .font(.rounded(.subheadline))
                                    .foregroundStyle(Theme.textSecondary)
                                    .lineLimit(2)
                            }
                            .padding(.vertical, 4)
                        }
                        .listRowBackground(Theme.surface)
                    }
                    .onDelete { offsets in
                        for index in offsets { context.delete(entries[index]) }
                        Store.save(context)
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle("Journal")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct JournalDetailView: View {
    let entry: JournalEntry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(entry.date.formatted(date: .complete, time: .shortened))
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(Theme.textTertiary)
                Text(entry.prompt)
                    .font(.rounded(.title3, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Text(entry.text)
                    .font(.rounded(.body))
                    .foregroundStyle(Theme.textPrimary.opacity(0.9))
                    .textSelection(.enabled)
                Text("\(entry.wordCount) words")
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(Theme.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(20)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }
}
