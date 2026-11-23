# Scrollkey

Earn your scroll time. Scrollkey is a free iPhone app where real-life quests —
walking, breathing, deep work, journaling — pay out **keys**, and keys buy
minutes of scroll time.

- **Quests** in five categories (Move, Mind, Focus, Create, Life), each with a
  key reward and a daily limit, plus quests you design yourself.
- **Verification where the iPhone can do it for free:** walking quests use the
  motion coprocessor's step counter, strict timers fail if you leave the app,
  breathing is guided, journaling needs a minimum word count. Everything else
  is honor-system with a press-and-hold confirm.
- **Scroll sessions:** spend keys on 5–60 minutes, get a nudge one minute
  before and when time's up, end early to get unused keys back.
- **Progress:** streaks, a 7-day earned-vs-spent chart, where your keys come
  from, quest history and a journal.
- No accounts, no ads, no subscription. All data stays on the phone (SwiftData).

## About app blocking

Actually *locking* apps like Instagram or TikTok requires Apple's Screen Time
APIs (Family Controls). Apple only grants that capability to paid Apple
Developer Program members, and it only works on a real iPhone, not the
simulator. With a free Apple ID, Scrollkey's sessions run on trust. When you
have a paid account, app blocking can be added on top of the existing
session system.

## Run it

You need a Mac with **Xcode 16 or newer** (free from the Mac App Store).

### In the iOS Simulator

1. Open `Scrollkey/Scrollkey.xcodeproj`.
2. Pick an iPhone simulator in the toolbar (e.g. *iPhone 16*).
3. Press **⌘R**.

The simulator has no step counter, so walking quests show a
*Simulate 250 steps* button in debug builds.

### On your own iPhone (free Apple ID)

1. Xcode → **Settings → Accounts** → add your Apple ID.
2. Select the **Scrollkey** target → **Signing & Capabilities**:
   - Team: *Your Name (Personal Team)*
   - Bundle Identifier: change `com.yourname.scrollkey` to something unique,
     e.g. `com.<yourname>.scrollkey`.
3. Plug in your iPhone, pick it in the toolbar, press **⌘R**.
4. First time only, on the phone:
   - **Settings → Privacy & Security → Developer Mode** → on (the phone restarts).
   - **Settings → General → VPN & Device Management** → trust your developer
     certificate.

Apps installed with a free Apple ID expire after **7 days** — just run it from
Xcode again to reinstall (your data is kept).

## Tests

```sh
xcodebuild test -project Scrollkey.xcodeproj -scheme Scrollkey \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

- `ScrollkeyTests` — key costs and refunds, streaks, word counts, and the
  wallet/session rules against an in-memory store.
- `ScrollkeyUITests` — onboarding, every quest type, buying and refunding a
  session, and a screenshot tour.

CI runs the same on every push (`.github/workflows/scrollkey-ios.yml`).

Launch arguments used by tests: `-inMemoryStore`, `-resetDefaults`,
`-seedDemoData`, `-fastTimers` (quest minutes become seconds),
`-skipPermissionPrompts`.

## Layout

```
Scrollkey/
  App/          app entry, notification delegate
  Models/       SwiftData models, quest catalog
  Logic/        Economy (pure rules), Store (all writes), preferences
  Services/     notifications, step counter, demo data
  Design/       theme, shared components
  Views/        Onboarding, Today, Quests, Runners, Progress, Settings
ScrollkeyTests/     unit tests
ScrollkeyUITests/   UI tests
```

Requires iOS 17 or later.
