import SwiftData
import SwiftUI
import UIKit

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @AppStorage(Prefs.minutesPerKey) private var minutesPerKey = 5
    @AppStorage(Prefs.dailyGoal) private var dailyGoal = 6
    @AppStorage(Prefs.remindersEnabled) private var remindersEnabled = true
    @AppStorage(Prefs.hasOnboarded) private var hasOnboarded = true
    @AppStorage(Prefs.grantedWelcome) private var grantedWelcome = true

    @State private var notificationsDenied = false
    @State private var confirmingErase = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Each key buys", selection: $minutesPerKey) {
                        ForEach(Economy.minutesPerKeyChoices, id: \.self) { minutes in
                            Text("\(minutes) minutes").tag(minutes)
                        }
                    }
                    Stepper("Daily goal: \(dailyGoal) keys", value: $dailyGoal, in: 2...30)
                } header: {
                    Text("Scroll time")
                } footer: {
                    Text("Make keys worth less time if scrolling still gets away from you.")
                }
                .listRowBackground(Theme.surface)

                Section {
                    Toggle("Session reminders", isOn: $remindersEnabled)
                        .tint(Theme.gold)
                        .onChange(of: remindersEnabled) { _, enabled in
                            guard enabled else { Notifier.cancelAll(); return }
                            Task { await refreshNotificationState(requestIfNeeded: true) }
                        }
                    if notificationsDenied && remindersEnabled {
                        Button("Allow notifications in iOS Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                    }
                } header: {
                    Text("Reminders")
                } footer: {
                    Text("A heads-up one minute before a scroll session ends, and another when time's up.")
                }
                .listRowBackground(Theme.surface)

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Locking other apps", systemImage: "lock.shield.fill")
                            .font(.rounded(.headline, weight: .bold))
                            .foregroundStyle(Theme.textPrimary)
                        Text("Blocking apps like Instagram or TikTok needs Apple's Screen Time framework, which Apple only enables for paid developer accounts. On a free account, scroll sessions run on trust and Scrollkey reminds you when time is up.")
                            .font(.rounded(.subheadline))
                            .foregroundStyle(Theme.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("App blocking")
                }
                .listRowBackground(Theme.surface)

                Section("Data") {
                    Button("Show the intro again") {
                        hasOnboarded = false
                    }
                    Button("Erase all progress", role: .destructive) {
                        confirmingErase = true
                    }
                    .accessibilityIdentifier("eraseAll")
                }
                .listRowBackground(Theme.surface)

                Section {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0")
                } footer: {
                    Text("Everything stays on this iPhone. Scrollkey has no accounts, no ads and no subscription.")
                }
                .listRowBackground(Theme.surface)
            }
            .font(.rounded(.body))
            .scrollContentBackground(.hidden)
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Settings")
            .confirmationDialog("Erase all progress?", isPresented: $confirmingErase, titleVisibility: .visible) {
                Button("Erase everything", role: .destructive) {
                    Store.eraseEverything(in: context)
                    grantedWelcome = false
                }
            } message: {
                Text("Your keys, quest history, journal and custom quests will be deleted. This can't be undone.")
            }
            .task { await refreshNotificationState(requestIfNeeded: false) }
        }
    }

    private func refreshNotificationState(requestIfNeeded: Bool) async {
        var status = await Notifier.authorizationStatus()
        if requestIfNeeded, status == .notDetermined, !LaunchFlags.has(LaunchFlags.skipPermissionPrompts) {
            await Notifier.requestAuthorization()
            status = await Notifier.authorizationStatus()
        }
        notificationsDenied = status == .denied
    }
}
