import SwiftData
import SwiftUI

/// Buy and run a block of scroll time.
struct SessionCard: View {
    let ledger: [LedgerEntry]
    let sessions: [ScrollSession]
    let minutesPerKey: Int

    @Environment(\.modelContext) private var context
    @AppStorage(Prefs.remindersEnabled) private var remindersEnabled = true
    @State private var selectedMinutes = 15
    @State private var lastRefund: Int?
    @State private var startTrigger = 0

    private var balance: Int { Store.balance(ledger) }

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            if let session = Store.activeSession(sessions, now: timeline.date) {
                activeView(session, now: timeline.date)
            } else {
                pickerView
            }
        }
        .task(id: sessions.first?.id) {
            await closeWhenExpired()
        }
        .sensoryFeedback(.success, trigger: startTrigger)
    }

    // MARK: Picker

    private var pickerView: some View {
        let cost = Economy.cost(minutes: selectedMinutes, minutesPerKey: minutesPerKey)
        let affordable = balance >= cost
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Unlock scroll time", systemImage: "lock.open.fill")
                    .font(.rounded(.headline, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                Text("1 key = \(minutesPerKey) min")
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
            }

            HStack(spacing: 8) {
                ForEach(Economy.sessionOptions, id: \.self) { minutes in
                    let optionCost = Economy.cost(minutes: minutes, minutesPerKey: minutesPerKey)
                    let selected = minutes == selectedMinutes
                    Button {
                        selectedMinutes = minutes
                    } label: {
                        VStack(spacing: 4) {
                            Text("\(minutes)m")
                                .font(.rounded(.headline, weight: .heavy))
                                .foregroundStyle(selected ? Color.black.opacity(0.85) : Theme.textPrimary)
                            HStack(spacing: 2) {
                                Image(systemName: "key.fill").rotationEffect(.degrees(-45))
                                Text("\(optionCost)")
                            }
                            .font(.rounded(.caption2, weight: .bold))
                            .foregroundStyle(selected ? Color.black.opacity(0.6) : Theme.gold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(selected ? Theme.gold : Theme.surfaceRaised)
                        )
                        .opacity(balance >= optionCost || selected ? 1 : 0.45)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(minutes) minutes for \(optionCost) keys")
                    .accessibilityAddTraits(selected ? .isSelected : [])
                    .accessibilityIdentifier("sessionOption\(minutes)")
                }
            }

            Button {
                start(minutes: selectedMinutes)
            } label: {
                Text(affordable ? "Start \(selectedMinutes)-minute session" : "Earn \(cost - balance) more \(cost - balance == 1 ? "key" : "keys")")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(!affordable)
            .accessibilityIdentifier("startSession")

            if let lastRefund, lastRefund > 0 {
                Label("Ended early — \(lastRefund) \(lastRefund == 1 ? "key" : "keys") back in your wallet.", systemImage: "arrow.uturn.backward")
                    .font(.rounded(.footnote, weight: .semibold))
                    .foregroundStyle(Theme.violet)
            }

            Text("Sessions run on trust: free Apple accounts can't lock other apps, so Scrollkey nudges you when your time is up.")
                .font(.rounded(.caption))
                .foregroundStyle(Theme.textTertiary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .card()
    }

    // MARK: Active

    private func activeView(_ session: ScrollSession, now: Date) -> some View {
        let total = TimeInterval(session.plannedMinutes * 60)
        let remaining = max(0, session.plannedEnd.timeIntervalSince(now))
        let refund = Economy.refund(keysSpent: session.keysSpent, elapsed: now.timeIntervalSince(session.startedAt), minutesPerKey: session.minutesPerKey)
        return VStack(spacing: 16) {
            HStack {
                Label("Scroll session live", systemImage: "dot.radiowaves.left.and.right")
                    .font(.rounded(.headline, weight: .bold))
                    .foregroundStyle(Theme.sky)
                Spacer()
                Text("Ends \(session.plannedEnd.formatted(date: .omitted, time: .shortened))")
                    .font(.rounded(.caption, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
            }
            ZStack {
                Ring(progress: remaining / total, color: Theme.sky, lineWidth: 12)
                VStack(spacing: 2) {
                    Text(Economy.clock(remaining))
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .contentTransition(.numericText(countsDown: true))
                        .foregroundStyle(Theme.textPrimary)
                        .accessibilityIdentifier("sessionCountdown")
                    Text("left to scroll")
                        .font(.rounded(.footnote, weight: .semibold))
                        .foregroundStyle(Theme.textSecondary)
                }
            }
            .frame(width: 190, height: 190)
            .padding(.vertical, 4)

            Button {
                withAnimation {
                    lastRefund = Store.endSessionEarly(session, in: context)
                }
            } label: {
                Text(refund > 0 ? "I'm done — refund \(refund) \(refund == 1 ? "key" : "keys")" : "I'm done")
            }
            .buttonStyle(SecondaryButtonStyle(tint: Theme.sky))
            .accessibilityIdentifier("endSession")
        }
        .card(tint: Theme.sky)
    }

    // MARK: Actions

    private func start(minutes: Int) {
        guard let session = Store.startSession(minutes: minutes, minutesPerKey: minutesPerKey, ledger: ledger, sessions: sessions, in: context) else { return }
        lastRefund = nil
        startTrigger += 1
        guard remindersEnabled, !LaunchFlags.has(LaunchFlags.skipPermissionPrompts) else { return }
        Task {
            let status = await Notifier.authorizationStatus()
            var allowed = status == .authorized || status == .provisional
            if status == .notDetermined {
                allowed = await Notifier.requestAuthorization()
            }
            if allowed {
                Notifier.scheduleSessionReminders(id: session.id, minutes: session.plannedMinutes, endsAt: session.plannedEnd)
            }
        }
    }

    private func closeWhenExpired() async {
        guard let session = Store.activeSession(sessions) else { return }
        let wait = session.plannedEnd.timeIntervalSinceNow
        if wait > 0 { try? await Task.sleep(for: .seconds(wait)) }
        guard !Task.isCancelled else { return }
        Store.closeExpiredSessions(sessions, in: context)
    }
}
