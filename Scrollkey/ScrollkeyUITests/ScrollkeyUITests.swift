import XCTest

/// End-to-end flows. Screenshots are attached to the test results and, when
/// SCREENSHOT_DIR is set (CI passes TEST_RUNNER_SCREENSHOT_DIR), written to disk.
final class ScrollkeyUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    @MainActor
    private func launch(_ extra: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-inMemoryStore", "-resetDefaults", "-skipPermissionPrompts", "-fastTimers"] + extra
        app.launch()
        return app
    }

    @MainActor
    private func snapshot(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        if let dir = ProcessInfo.processInfo.environment["SCREENSHOT_DIR"], !dir.isEmpty {
            try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
            try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
        }
    }

    @MainActor
    private func element(_ app: XCUIApplication, _ identifier: String) -> XCUIElement {
        app.descendants(matching: .any)[identifier].firstMatch
    }

    @MainActor
    private func scrollTo(_ target: XCUIElement, in app: XCUIApplication, maxSwipes: Int = 8) {
        var swipes = 0
        while !(target.exists && target.isHittable) && swipes < maxSwipes {
            app.swipeUp()
            swipes += 1
        }
    }

    @MainActor
    private func openQuest(_ id: String, in app: XCUIApplication) {
        app.tabBars.buttons["Quests"].tap()
        let quest = element(app, "quest-\(id)")
        scrollTo(quest, in: app)
        XCTAssertTrue(quest.waitForExistence(timeout: 5), "Quest \(id) not found")
        quest.tap()
    }

    @MainActor
    private func balance(_ app: XCUIApplication) -> String {
        app.tabBars.buttons["Today"].tap()
        let value = app.staticTexts["walletBalance"]
        XCTAssertTrue(value.waitForExistence(timeout: 5))
        return value.label
    }

    // MARK: Flows

    @MainActor
    func testOnboardingGrantsWelcomeKeys() {
        let app = launch([])
        XCTAssertTrue(app.buttons["onboardingNext"].waitForExistence(timeout: 5))
        snapshot("01-onboarding")
        app.buttons["onboardingNext"].tap()
        app.buttons["onboardingNext"].tap()
        snapshot("01b-onboarding-last")
        app.buttons["onboardingStart"].tap()
        XCTAssertEqual(balance(app), "3")
    }

    @MainActor
    func testHonorQuestPaysOut() {
        let app = launch(["-hasOnboarded", "YES"])
        XCTAssertEqual(balance(app), "3")
        openQuest("water", in: app)
        let hold = element(app, "holdToConfirm")
        XCTAssertTrue(hold.waitForExistence(timeout: 5))
        hold.press(forDuration: 2.2)
        XCTAssertTrue(app.staticTexts["completionReward"].waitForExistence(timeout: 5))
        snapshot("05-completion")
        app.buttons["completionDone"].tap()
        XCTAssertEqual(balance(app), "4")
    }

    @MainActor
    func testTimerQuestCompletes() {
        let app = launch(["-hasOnboarded", "YES"])
        openQuest("outside", in: app)
        app.buttons["startTimer"].tap()
        XCTAssertTrue(app.staticTexts["completionReward"].waitForExistence(timeout: 20))
        app.buttons["completionDone"].tap()
        XCTAssertEqual(balance(app), "4")
    }

    @MainActor
    func testStepsQuestWithSimulatedSteps() {
        let app = launch(["-hasOnboarded", "YES"])
        openQuest("walk-1k", in: app)
        app.buttons["startWalking"].tap()
        let simulate = app.buttons["simulateSteps"]
        XCTAssertTrue(simulate.waitForExistence(timeout: 5))
        snapshot("04b-steps")
        for _ in 0..<4 { simulate.tap() }
        XCTAssertTrue(app.staticTexts["completionReward"].waitForExistence(timeout: 5))
        app.buttons["completionDone"].tap()
        XCTAssertEqual(balance(app), "5")
    }

    @MainActor
    func testJournalQuestNeedsEnoughWords() {
        let app = launch(["-hasOnboarded", "YES"])
        openQuest("gratitude", in: app)
        let editor = element(app, "journalEditor")
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        editor.tap()
        editor.typeText("Sunny walk to school this morning. Finished the science project with my group. My little brother made dinner and it was actually great, so I want to remember that.")
        let save = app.buttons["saveJournal"]
        XCTAssertTrue(save.isEnabled)
        save.tap()
        XCTAssertTrue(app.staticTexts["completionReward"].waitForExistence(timeout: 5))
        app.buttons["completionDone"].tap()
        XCTAssertEqual(balance(app), "4")
    }

    @MainActor
    func testScrollSessionSpendsAndRefunds() {
        let app = launch(["-hasOnboarded", "YES"])
        XCTAssertEqual(balance(app), "3")
        app.buttons["sessionOption15"].tap()
        app.buttons["startSession"].tap()
        XCTAssertTrue(app.staticTexts["sessionCountdown"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["walletBalance"].label, "0")
        snapshot("08-session")
        app.buttons["endSession"].tap()
        XCTAssertTrue(app.buttons["startSession"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["walletBalance"].label, "2")
    }

    @MainActor
    func testTourOfSeededApp() {
        let app = launch(["-hasOnboarded", "YES", "-seedDemoData"])
        XCTAssertTrue(app.staticTexts["walletBalance"].waitForExistence(timeout: 5))
        snapshot("02-today")

        app.tabBars.buttons["Quests"].tap()
        snapshot("03-quests")
        let breathe = element(app, "quest-breathe")
        breathe.tap()
        app.buttons["startBreathing"].tap()
        sleep(2)
        snapshot("04-breathing")
        app.buttons["closeQuest"].tap()

        app.tabBars.buttons["Progress"].tap()
        snapshot("06-progress")
        app.swipeUp()
        snapshot("06b-progress-lower")

        app.tabBars.buttons["Settings"].tap()
        snapshot("07-settings")
    }
}
