import SwiftUI

struct RootView: View {
    @AppStorage(Prefs.hasOnboarded) private var hasOnboarded = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            if hasOnboarded {
                MainTabView()
                    .transition(.opacity)
            } else {
                OnboardingView {
                    withAnimation(.easeInOut(duration: 0.4)) { hasOnboarded = true }
                }
                .transition(.opacity)
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "key.fill") }
                .solidTabBar()
            QuestsView()
                .tabItem { Label("Quests", systemImage: "flag.checkered") }
                .solidTabBar()
            StatsView()
                .tabItem { Label("Progress", systemImage: "chart.bar.fill") }
                .solidTabBar()
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .solidTabBar()
        }
    }
}

private extension View {
    func solidTabBar() -> some View {
        toolbarBackground(Theme.surface, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
    }
}
