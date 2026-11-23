import Foundation
import UserNotifications

/// Local notifications that nudge you when a scroll session runs out.
enum Notifier {
    private static var center: UNUserNotificationCenter { .current() }

    static func authorizationStatus() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    @discardableResult
    static func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
    }

    static func scheduleSessionReminders(id: UUID, minutes: Int, endsAt: Date) {
        let interval = endsAt.timeIntervalSinceNow
        guard interval > 1 else { return }

        let end = UNMutableNotificationContent()
        end.title = "Time's up"
        end.body = "Your \(minutes)-minute scroll session just ended. Put it down and go earn the next one."
        end.sound = .default
        center.add(UNNotificationRequest(
            identifier: "\(id.uuidString)-end",
            content: end,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        ))

        if interval > 120 {
            let warning = UNMutableNotificationContent()
            warning.title = "One minute left"
            warning.body = "Start wrapping up your scroll session."
            center.add(UNNotificationRequest(
                identifier: "\(id.uuidString)-warn",
                content: warning,
                trigger: UNTimeIntervalNotificationTrigger(timeInterval: interval - 60, repeats: false)
            ))
        }
    }

    static func cancelSessionReminders(id: UUID) {
        center.removePendingNotificationRequests(withIdentifiers: ["\(id.uuidString)-end", "\(id.uuidString)-warn"])
    }

    static func cancelAll() {
        center.removeAllPendingNotificationRequests()
    }
}
