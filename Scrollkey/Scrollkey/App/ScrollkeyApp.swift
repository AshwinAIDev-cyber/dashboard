import SwiftData
import SwiftUI
import UIKit
import UserNotifications

@main
struct ScrollkeyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    private let container: ModelContainer

    init() {
        if LaunchFlags.has(LaunchFlags.resetDefaults), let bundleID = Bundle.main.bundleIdentifier {
            UserDefaults.standard.removePersistentDomain(forName: bundleID)
        }
        let schema = Schema(AppSchema.models)
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: LaunchFlags.has(LaunchFlags.inMemory))
        do {
            container = try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Scrollkey couldn't open its data store: \(error)")
        }
        if LaunchFlags.has(LaunchFlags.seedDemo) {
            DemoData.seed(into: container.mainContext)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(Theme.gold)
        }
        .modelContainer(container)
    }
}

/// Lets session reminders show as banners even while Scrollkey is open.
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
