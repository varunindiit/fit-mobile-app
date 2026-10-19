# Fittelo — Mobile Fitness & Nutrition App

An Expo / React Native application that combines calorie-and-nutrition tracking with a
30-day bodyweight training system and a **Pro personal-trainer (coaching) experience**.

> **Important — read this first.**
> This repository is a **fully offline, front-end-only product prototype**. There is **no
> backend, no API, no database, no real authentication and no real payment processing**.
> Every piece of data lives on the device in `AsyncStorage`, and every "service" (AI coach,
> trainer chat, trainer calls, cloud backup, meal photo scan, health sync) is a local
> simulation written in TypeScript. This is verified: the source contains **zero** network
> calls (`fetch`, `axios`, `XMLHttpRequest`) and **zero** environment variables.
>
> The code is deliberately structured so that each simulation sits behind one clearly
> marked seam that a real service can replace later. Those seams are documented in
> [Where a real backend would plug in](#where-a-real-backend-would-plug-in).

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Current build status](#2-current-build-status)
3. [Technology stack](#3-technology-stack)
4. [Project structure](#4-project-structure)
5. [Architecture](#5-architecture)
6. [Navigation and route map](#6-navigation-and-route-map)
7. [**Coach & Personal Trainer system (primary module)**](#7-coach--personal-trainer-system-primary-module)
   - [7.1 Two different "coaches"](#71-two-different-coaches)
   - [7.2 Trainer data model](#72-trainer-data-model)
   - [7.3 Trainer availability engine](#73-trainer-availability-engine)
   - [7.4 Trainer-authored workout plans](#74-trainer-authored-workout-plans)
   - [7.5 Trainer chat engine](#75-trainer-chat-engine)
   - [7.6 Audio and video calls](#76-audio-and-video-calls)
   - [7.7 Pro-only exercise demonstrations](#77-pro-only-exercise-demonstrations)
   - [7.8 Screen-by-screen walkthrough](#78-screen-by-screen-walkthrough)
   - [7.9 Complete user journey](#79-complete-user-journey)
   - [7.10 Roles and responsibilities](#710-roles-and-responsibilities)
   - [7.11 Entry points to coaching](#711-entry-points-to-coaching)
   - [7.12 Coach & trainer implementation status](#712-coach--trainer-implementation-status)
   - [7.13 Recommendations for the coaching experience](#713-recommendations-for-the-coaching-experience)
8. [Subscription plans: Free, Smart and Pro](#8-subscription-plans-free-smart-and-pro)
9. [Workout and training module](#9-workout-and-training-module)
10. [Nutrition and diet module](#10-nutrition-and-diet-module)
11. [Progress, analytics, history and streaks](#11-progress-analytics-history-and-streaks)
12. [Onboarding and authentication](#12-onboarding-and-authentication)
13. [Profile, settings and account](#13-profile-settings-and-account)
14. [Data model reference](#14-data-model-reference)
15. [APIs, database and persistence](#15-apis-database-and-persistence)
16. [Configuration and environment](#16-configuration-and-environment)
17. [Installation, running and building](#17-installation-running-and-building)
18. [Testing and quality gates](#18-testing-and-quality-gates)
19. [Feature implementation status](#19-feature-implementation-status)
20. [Known issues and gaps](#20-known-issues-and-gaps)
21. [Recommendations and roadmap](#21-recommendations-and-roadmap)
22. [Assets, media licensing and legal notes](#22-assets-media-licensing-and-legal-notes)

---

## 1. Project overview

**Fittelo** (package name `fit-mobile-app`, app name `Fittelo`, slug `fittelo`) is a
mobile-first fitness companion built with Expo Router. It is aimed at an Indian audience
(Indian food database, rupee-free USD pricing, Hindi/Tamil/Marathi-speaking coaches) and
covers three product pillars:

| Pillar | What it does |
| --- | --- |
| **Nutrition** | Calorie budget from BMR/TDEE, 50-item Indian food database, five-meal diary, "Snap" meal-photo simulation, water and step tracking, Saathi AI nutrition chat |
| **Training** | Three 30-day programs, 10 body-focus sessions, 8 guided classes, 25-exercise library with looping animations, a full workout player with rest timers and resume |
| **Coaching (Pro)** | A dedicated personal trainer with profile, certifications, availability, weekly schedule, trainer-written workout plans, one-to-one chat, audio/video call UI, and exercise demonstration videos |

The product is monetised through three tiers — **Free**, **Smart** and **Pro** — enforced by
a single entitlement layer (`src/lib/entitlements.ts`).

**Target audience of this document:** a new developer joining the codebase, a project
manager scoping the next phase, or a client reviewing what has actually been built.

---

## 2. Current build status

Everything below was executed in this repository and the output observed:

| Check | Command | Result |
| --- | --- | --- |
| Type safety | `npx tsc --noEmit` | **Pass** — no errors |
| Lint | `npx expo lint` | **Pass** — exit code 0, no warnings |
| Unit tests | `npm test` | **Pass** — 5 suites, **79 tests**, ~3.6 s |

Code size: **103 source files**, ~**24,400 lines** of TypeScript/TSX under `src/`.

Repository state at time of writing: branch `UiUx_theam_change`, 72 commits.

---

## 3. Technology stack

### Runtime and framework

| Package | Version | Purpose |
| --- | --- | --- |
| `expo` | `~57.0.28` | Expo SDK 57 |
| `react-native` | `0.86.3` | Native runtime |
| `react` / `react-dom` | `19.2.3` | UI library (React Compiler enabled) |
| `expo-router` | `~57.0.26` | File-based navigation (`src/app/`) |
| `typescript` | `~6.0.3` | Strict mode enabled |

### Expo modules in use

`expo-constants`, `expo-device`, `expo-font`, `expo-glass-effect`, `expo-haptics`,
`expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-splash-screen`,
`expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `@expo/ui`,
`@expo/vector-icons` (Ionicons).

### React Native libraries

| Package | Version | Purpose |
| --- | --- | --- |
| `react-native-reanimated` | `4.5.1` | All animation (worklets, shared values, layout transitions) |
| `react-native-worklets` | `0.10.1` | `scheduleOnRN` bridge for Reanimated 4 |
| `react-native-gesture-handler` | `~2.32.0` | Gestures |
| `react-native-safe-area-context` | `~5.7.0` | Insets |
| `react-native-screens` | `~4.26.0` | Native screen containers |
| `react-native-svg` | `15.15.4` | Charts, rings, confetti, gauges |
| `@react-native-async-storage/async-storage` | `2.2.0` | The **only** persistence layer |
| `react-native-web` | `~0.21.0` | Web preview target |

### Dev / test

`jest` `~29.7.0` with the `jest-expo` preset, `@testing-library/react-native` `^14.1.0`,
`eslint` `^9` with `eslint-config-expo`.

### Notably absent

There is **no** state library (Redux/Zustand/Jotai), **no** data-fetching library
(React Query/SWR), **no** form library, **no** i18n library, **no** analytics SDK, **no**
payments SDK (RevenueCat / `expo-in-app-purchases`), **no** camera module
(`expo-camera`), **no** push-notification module (`expo-notifications`), and **no**
WebRTC/calling SDK. Every one of those capabilities is currently a local simulation.

---

## 4. Project structure

```
fit-mobile-app/
├── app.json                  # Expo app config (name, icons, splash, plugins)
├── package.json              # Deps, scripts, Jest config + @/ path aliases
├── tsconfig.json             # strict: true, @/* → src/*, @/assets/* → assets/*
├── eslint.config.js          # eslint-config-expo flat config
├── jest.setup.js             # AsyncStorage mock
├── AGENTS.md / CLAUDE.md     # AI-agent working instructions for this repo
├── LICENSE                   # MIT (inherited from the Expo starter template)
├── assets/
│   ├── images/
│   │   ├── CREDITS.md        # ⚠️ Mandatory media attributions — read before shipping
│   │   ├── exercises/        # 25 still poses
│   │   ├── exercises/anim/   # 25 looping animated WebPs (© Gym visual)
│   │   ├── exercises/pro/    # Pro photo demonstrations (public domain) + posters/ for the Pro videos
│   │   ├── glyphs/           # Food + icon artwork keyed by emoji
│   │   ├── onboarding/       # Generated onboarding imagery
│   │   ├── trainers/         # Coach portraits (generated, fictional people)
│   │   └── tabIcons/, expo.icon/, splash, favicon …
│   └── videos/               # Empty placeholder dirs (_incoming/, pro/)
├── ios/  android/            # Generated by CNG — git-ignored, never edit by hand
└── src/
    ├── app/                  # Expo Router routes (every file = a screen)
    │   ├── _layout.tsx       # Root stack + StoreProvider + ToastProvider + splash
    │   ├── index.tsx         # Redirect: onboarded ? /(tabs) : /onboarding
    │   ├── (tabs)/           # Home, Workout, Diet, Analytics, Me
    │   ├── trainer/          # ⭐ Pro coaching: dashboard, chat, call (Pro-gated layout)
    │   ├── workout/[id].tsx  # Guided class player
    │   ├── food/[id].tsx     # Food detail + portion picker
    │   └── …                 # coach, plans, player, program-day, snap, etc.
    ├── components/
    │   ├── ui.tsx            # The design-system kit (Button, Card, Sheet, Dialog, Toast…)
    │   ├── motion.tsx        # Shared Reanimated primitives
    │   ├── trainer/parts.tsx # ⭐ TrainerAvatar, AvailabilityLine, TrainerPlanCard
    │   ├── premium/locked.tsx# LockBadge, LockedCard, LockedScreen paywall surfaces
    │   ├── program/          # Exercise art, exercise sheet, session helpers
    │   ├── profile/          # ProfileBody (Me tab), backup card, sheets
    │   ├── onboarding/       # 20+ onboarding step components
    │   ├── food/             # DiaryView and shared food UI
    │   ├── home/             # Home-tab cards (calorie ring, water, week strip…)
    │   ├── charts/           # Calendar + line/bar charts
    │   └── glyphs.ts         # Emoji → artwork mapping, exercise art registries
    ├── data/                 # All mock data, shaped like API responses
    │   ├── trainers.ts       # ⭐ 3 coaches, availability engine, demo bookings
    │   ├── trainerPlans.ts   # ⭐ 6 coach-written workouts
    │   ├── trainerChat.ts    # ⭐ Scripted trainer reply engine
    │   ├── proDemos.ts       # ⭐ Pro photo-demonstration registry (18 exercises)
    │   ├── program.ts        # 25 exercises, 3 programs, 10 focus sessions
    │   ├── foods.ts          # 50 foods, meals, snap samples
    │   ├── fitness.ts        # 8 guided classes, manual-log activities
    │   ├── plans.ts          # Smart/Pro pricing, marketing coaches, testimonials
    │   └── notifications.ts  # 6 static notifications
    ├── lib/
    │   ├── store.tsx         # Single global store (Context + useState + actions)
    │   ├── entitlements.ts   # ⭐ Single source of truth for plan gating
    │   ├── useAccess.ts      # ⭐ The only hook screens use to ask "can this user…?"
    │   ├── persist.ts        # AsyncStorage load/save, type-safe merge, migrations
    │   ├── calc.ts           # BMR/TDEE/macros, date keys, BMI, unit conversion
    │   ├── demo.ts           # 30-day demo history generator
    │   ├── useToday.ts       # Date key that rolls over at midnight
    │   └── __tests__/        # 5 Jest suites, 79 tests
    └── theme.ts              # Design tokens (colors, gradients, radii, shadows, motion)
```

**Convention:** only route files live in `src/app/`. Everything else (components, hooks,
data, lib) lives outside it, as required by Expo Router.

---

## 5. Architecture

### 5.1 One global store

`src/lib/store.tsx` holds the entire application state in a single React Context. There is
no reducer and no external state library — state is one `useState<AppState>` plus a frozen
`actions` object built with `useMemo`.

```
StoreProvider (src/lib/store.tsx)
 ├─ state: AppState            # one object, ~30 keys
 ├─ hydrated: boolean          # false until AsyncStorage has been read
 ├─ targets: {...}             # memoised calorie/macro targets derived from the profile
 └─ ~45 action functions       # addFood, logWorkout, subscribe, addTrainerMsg, …
```

Consumers call `useStore()`. Calling it outside the provider throws.

### 5.2 Persistence pipeline

```
App start
  → loadState(INITIAL)                 # AsyncStorage.getItem('fitora-state-v1')
  → JSON.parse → migrate() → mergeTyped(defaults, saved)
  → sanitize(state)                    # drops malformed records
  → withDemo(state)                    # seeds 30 days of demo history once
  → setHydrated(true)

Any state change
  → mark dirty → debounce 300 ms → saveState()
  → immediate flush on AppState !== 'active' (and on web 'pagehide')
  → on failure: retry after 2 s
```

Safety properties, all covered by tests in `src/lib/__tests__/persist.test.ts` and
`store.test.tsx`:

- **Corruption never destroys data.** Unreadable JSON is copied to
  `fitora-state-v1.corrupt-<timestamp>` before falling back to defaults.
- **A failed read never triggers a write.** `loadFailed` blocks saving so an empty
  `INITIAL` can never overwrite real history.
- **Type drift is absorbed.** `mergeTyped` keeps a saved value only when its type matches
  the default; anything else falls back. Unknown keys are dropped.
- **Malformed records are filtered** by `sanitize()` — bad dates, `NaN` numbers, invalid
  chat roles, unknown exercise ids in plan edits.
- **Caps** prevent unbounded growth: 100 AI chat messages, 200 trainer messages, 50 call
  records, 8 recent searches.
- **Schema version** is `1`; `migrate()` is the hook for future upgrades.

### 5.3 Entitlement layer

The most architecturally important file in the project is `src/lib/entitlements.ts`.
Screens **never** read `state.premium.tier`. They call `useAccess()`:

```ts
const access = useAccess();

access.isFree / isSmart / isPro      // booleans
access.can('trainer.chat')           // boolean
access.lock('progress.full')         // Lock | null  → render a paywall
access.lockFor('program:belly:7')    // Lock | null  → session-level gate
access.lockClass('Advanced')         // Lock | null  → guided-class gate
access.daysOpen()                    // highest program day this plan may train
access.active / expired / cancelled / endsOn / purchased
```

Nine gateable features are declared in one table, so a pricing change is a one-file edit:

```ts
const ENTITLEMENTS: Record<Feature, Tier> = {
  'program.allDays': 'smart',
  'library.full':    'smart',
  'progress.full':   'smart',
  'plan.customise':  'smart',
  trainer:           'pro',
  'trainer.chat':    'pro',
  'trainer.call':    'pro',
  'trainer.demos':   'pro',
  'trainer.plans':   'pro',
};
```

The plan-comparison table in `src/components/plans/PlanPicker.tsx` is generated from the
same `can()` function, so marketing copy cannot drift from enforcement.

### 5.4 Design system

`src/theme.ts` defines all tokens: one brand green `#56D661` (with `onPrimary` ink for
content on green fills because the green is light — 1.88:1 on white), warm stone
neutrals, macro colours, gradients (`G.premium`, `G.photo`), radii, shadows and motion
constants. `src/components/ui.tsx` (786 lines) is the component kit: `Screen`, `Header`,
`Card`, `Button`, `Chip`, `OptionCard`, `Segmented`, `Toggle`, `Stepper`, `ProgressBar`,
`Ring`, `MacroBar`, `Sheet`, `Dialog`, `ToastProvider`, `ListRow`, `EmptyState`, `Pill`,
plus `tap()` / `impact()` haptics helpers.

Accessibility and motion are treated as first-class: `useReducedMotion()` is respected
across animated components, `accessibilityRole`/`accessibilityLabel`/
`accessibilityState` are set on interactive elements, and `nativeOnly()` guards
native-only entering animations on web.

---

## 6. Navigation and route map

`expo-router` with a root `Stack`, one nested `Tabs` group and one nested Pro-gated stack.

| Route | File | Notes |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Redirects to `/(tabs)` or `/onboarding` |
| `/onboarding` | `src/app/onboarding.tsx` | 23-step flow, fade transition, gestures off |
| `/(tabs)` | `src/app/(tabs)/_layout.tsx` | Custom animated tab bar (5 tabs) |
| `/(tabs)` → Home | `(tabs)/index.tsx` | Photo hero, calorie card, water, steps, weight |
| `/(tabs)/fitness` → Workout | `(tabs)/fitness.tsx` | Program, coach card, activity, library |
| `/(tabs)/diet` → Diet | `(tabs)/diet.tsx` → `DiaryView` | Food diary |
| `/(tabs)/progress` → Analytics | `(tabs)/progress.tsx` | Weight, calories, steps, trends |
| `/(tabs)/me` → Me | `(tabs)/me.tsx` → `ProfileBody` | Account, plan, settings |
| **`/trainer`** | `src/app/trainer/index.tsx` | ⭐ **Pro coaching dashboard** |
| **`/trainer/chat`** | `src/app/trainer/chat.tsx` | ⭐ **Trainer conversation** |
| **`/trainer/call`** | `src/app/trainer/call.tsx` | ⭐ **Audio/video call (full-screen modal)** |
| `/pro-welcome` | `src/app/pro-welcome.tsx` | Pro activation celebration (full-screen modal) |
| `/coach` | `src/app/coach.tsx` | Saathi AI nutrition chat |
| `/plans` | `src/app/plans.tsx` | Paywall, plan comparison, FAQ, restore |
| `/select-plan` | `src/app/select-plan.tsx` | Pick a 30-day program, 30-day grid |
| `/program-day` | `src/app/program-day.tsx` | Session details, edit exercises, start |
| `/player` | `src/app/player.tsx` | Session player (full-screen modal) |
| `/workout/[id]` | `src/app/workout/[id].tsx` | Guided class overview + player |
| `/snap` | `src/app/snap.tsx` | Meal-photo scan simulation (full-screen modal) |
| `/food-search` | `src/app/food-search.tsx` | Search / browse / favourites |
| `/food/[id]` | `src/app/food/[id].tsx` | Food detail, portions, micros |
| `/diary` | `src/app/diary.tsx` → `DiaryView` | Pushed version of the diary |
| `/history` | `src/app/history.tsx` | Workout history by month |
| `/streak` | `src/app/streak.tsx` | Post-workout celebration + rewards |
| `/notifications` | `src/app/notifications.tsx` | Static notification list |
| `/profile` | `src/app/profile.tsx` → `ProfileBody` | Pushed version of "Me" |
| `/edit-profile` | `src/app/edit-profile.tsx` | Edit name, body, goal, pace, activity |
| `/settings` | `src/app/settings.tsx` | App settings, help, about |

**Everything under `/trainer` is gated once**, in `src/app/trainer/_layout.tsx`. A non-Pro
account never reaches a trainer screen — it gets `LockedScreen` instead. A Pro account
without a trainer is assigned one on arrival.

Deep-linking scheme: `fittelo://`. Typed routes are **off** (`experiments.typedRoutes:
false`), so route strings are plain strings cast to `Href` where needed.

---

## 7. Coach & Personal Trainer system (primary module)

This is the flagship Pro feature and the most developed module in the app. It spans
4 route files, 1 shared component file, 4 data files, 3 store slices and 5 entitlement
features.

### 7.1 Two different "coaches"

The app contains **two separate coaching concepts**. Confusing them is the single most
common misreading of this codebase.

| | **Saathi — AI nutrition coach** | **Personal trainer — human coach** |
| --- | --- | --- |
| Route | `/coach` | `/trainer`, `/trainer/chat`, `/trainer/call` |
| Engine | `reply()` in `src/app/coach.tsx` | `trainerReply()` in `src/data/trainerChat.ts` |
| Domain | Food, calories, macros, water, weight, general workouts | Training, form, programming, scheduling |
| Persona | App assistant ("Saathi") | A named coach with a profile and certifications |
| Stored in | `state.coachChat` (`ChatMsg[]`) | `state.trainerChat` (`TrainerMsg[]`) |
| Gating | **None — open to Free, Smart and Pro** | **Pro only** (`trainer.chat`) |
| Capabilities | State-aware canned replies + one action button per reply | Scripted replies + shareable workout plans + delivery receipts + calls |
| Explicitly defers | Medical questions → recommends Pro | Nutrition questions → redirects to Saathi |

The two engines deliberately defer to each other. Saathi, asked about a trainer or a
medical condition, routes to `/plans?tier=pro`. The trainer, asked about diet, replies:
*"Nutrition isn't my side — I'd be guessing. Ask Saathi in the app, it has your actual logs
and targets."*

There is also a third, purely cosmetic concept: `COACHES` in `src/data/plans.ts`
(Dr. Kavya Iyer — Clinical Nutritionist, Arjun Mehta — Fitness Trainer, Sneha Kulkarni —
Diabetes Educator). This is **marketing content shown on the paywall only**. The
nutritionist and diabetes-educator personas have **no implementation behind them**.

### 7.2 Trainer data model

`src/data/trainers.ts` — shaped like a `GET /trainers` response so the screens can be
pointed at a real endpoint without layout changes.

```ts
type Trainer = {
  id: string;                      // 'arjun-mehta'
  name: string;
  role: string;                    // 'Strength & Conditioning Coach'
  specialities: string[];          // rendered as chips
  years: number;
  rating: number;                  // 4.8
  reviews: number;                 // 412
  clients: number;                 // 38 — supports a "limited slots" feel
  city: string;
  languages: string[];
  intro: string;                   // first-person coaching philosophy
  certifications: { title; body; year }[];
  photo?: number;                  // optional require() — falls back to initials
  color: string;                   // per-coach brand accent used across all surfaces
  icon: IconName;
  hours: Record<Weekday, string[]>;// working hours per weekday; [] = off
  replyMins: number;               // typical response time
};
```

**Three coaches are defined:**

| Coach | Role | Specialities | Yrs | Rating | City | Languages | Accent | Portrait | Reply |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `arjun-mehta` | Strength & Conditioning | Fat loss, Core strength, Home workouts, Beginners | 7 | 4.8 (412) | Pune | EN/HI/MR | `#2563EB` | ✅ photo | 12 min |
| `kavya-iyer` | Mobility & Rehab | Posture, Back care, Mobility, Post-natal | 9 | 4.9 (587) | Bengaluru | EN/HI/TA | `#7C3AED` | initials | 20 min |
| `rohit-shetty` | HIIT & Endurance | HIIT, Conditioning, Athletic performance, Advanced | 11 | 4.7 (903) | Mumbai | EN/HI | `#E5484D` | initials | 35 min |

Each carries 2–3 real-world certification bodies (NSCA, ACE, FMS, ACSM, Yoga Alliance,
NASM, Red Cross).

Helpers: `trainerById()` (falls back to `TRAINERS[0]`, never returns `undefined`),
`firstName()`, `weekdayOf()`, `DEFAULT_TRAINER_ID`.

**Ethics guardrail built into the code:** `TrainerAvatar` renders a portrait only when the
trainer has one, otherwise initials tinted with the coach's accent. The portraits that do
exist are AI-generated images of fictional people (see `assets/images/CREDITS.md`). The
code comments state explicitly that no photograph of a real person may be presented as the
member's coach.

### 7.3 Trainer availability engine

`availability(trainer, now)` in `src/data/trainers.ts` computes live status from the
coach's `hours` map:

```ts
type Availability = {
  online: boolean;                        // inside a working hour right now
  label: string;                          // 'Online now' | 'Back at 18:00'
                                          // | 'Next on Thu at 07:00' | 'Off this week'
  todaySlots: string[];                   // remaining slots today
  next: { day: Weekday; time: string } | null;
};
```

Rules: a slot counts as "online" for the 60 minutes after it starts; if nothing is left
today, the engine scans forward up to 7 days for the next slot; if the coach has no hours
at all, it returns `'Off this week'` rather than crashing. Both edge cases are covered by
tests in `src/lib/__tests__/trainerData.test.ts`.

Surfaced by `<AvailabilityLine />` (status dot + label) on the dashboard hero, the chat
header, the Pro welcome coach card and the Workout-tab coach card.

### 7.4 Trainer-authored workout plans

`src/data/trainerPlans.ts` — the key architectural decision here is that **a coach plan is
an ordinary `Session`**:

```ts
type TrainerPlan = Session & {
  trainerId: string;
  note: string;    // what the coach wants from this session
  focus: string;   // headline body area
  day: Weekday;    // where it sits in the member's week
};
// key format: `trainer:<slug>`
```

Because the key is `trainer:…`, the plan flows through the exact same machinery as a
program day or a focus session — `findSession()` resolves it, `/program-day` renders it,
`/player` runs it with rest timers and resume, `completeSession()` logs it, and
`sessionMeta()` credits the author (`"Written by Arjun Mehta"`). No parallel player, no
duplicated UI.

**Six plans are defined:**

| Key | Title | Focus | Day | Coach | Exercises |
| --- | --- | --- | --- | --- | --- |
| `trainer:chest-triceps` | Chest & Triceps | Chest | Mon | Arjun Mehta | 6 |
| `trainer:core-builder` | Core Builder | Abs | Tue | Arjun Mehta | 6 |
| `trainer:full-body-burn` | Full Body Burn | Full body | Wed | Rohit Shetty | 6 |
| `trainer:legs-glutes` | Legs & Glutes | Leg | Thu | Arjun Mehta | 6 |
| `trainer:mobility-reset` | Mobility Reset | Back | Fri | Kavya Iyer | 5 |
| `trainer:upper-finisher` | Upper Body Finisher | Arm | Sat | Rohit Shetty | 5 |

Every plan carries a hand-written coaching note in the coach's voice, e.g.:

> *"Chest day, bodyweight only. Keep your elbows at about 45°, not flared out. If the full
> push-up breaks down, drop to your knees and finish the set clean — I would rather have
> 8 good reps than 15 sloppy ones."*

**Every `exerciseId` is validated against the 25-exercise `EXERCISES` library by a test**
(`trainerData.test.ts`), so a coach plan can never reference a movement the app cannot
demonstrate or explain.

Helpers: `plansFor(trainerId)`, `weekPlan(trainerId)` (falls back to the default coach so
the dashboard is never empty), `planOnDay(trainerId, day)`, `planSummary()` (moves /
minutes / kcal), `planExercises()`, `isTrainerKey()`.

### 7.5 Trainer chat engine

`src/data/trainerChat.ts`. **There is no AI model and no network call.** `trainerReply()`
is keyword matching that returns an array of bubbles, each with its own typing delay —
deliberately shaped like one turn of a conversation API so a real messaging service can
replace this single function.

```ts
type ReplyBubble = { text: string; planKey?: string; delay: number };
function trainerReply(raw: string, trainerId: string, name: string): ReplyBubble[];
```

**Intent coverage (13 branches, plus a fallback):**

| Member says… | Coach responds with |
| --- | --- |
| greeting | Personal hello using the member's first name |
| thanks | Acknowledgement + asks for post-session feedback |
| chest / push-up / arms / triceps | 3 bubbles + shares `trainer:chest-triceps` |
| abs / core / belly / six pack | 3 bubbles + shares `trainer:core-builder` |
| legs / squat / glute / lunge | 3 bubbles + shares `trainer:legs-glutes` |
| cardio / HIIT / fat loss | 3 bubbles + shares `trainer:full-body-burn` |
| **pain / back hurt / sore / stiff** | **"Don't train through it"** + shares `trainer:mobility-reset` + *"I'm not a doctor — if it isn't settling in a few days, please see a physio."* |
| 15 min / quick / busy | Shares `trainer:upper-finisher` |
| form / technique / "am I doing" | Suggests a video call + points to the exercise "Common mistakes" tab |
| diet / protein / calories | **Declines** and redirects to Saathi |
| call / video / talk | Points at the call button |
| tomorrow / schedule / week | Points at the dashboard schedule |
| done / finished | Asks RPE (7/10 or 9/10), says the log will be reviewed |
| *(anything else)* | Asks which area to train |

The pain/injury branch is notable: it refuses to coach through pain, offers a recovery
session instead, and includes an explicit non-medical disclaimer.

**Five quick-ask chips** (`QUICK_ASKS`) sit above the composer so the scripted paths are
discoverable.

`seedConversation(trainerId, name)` builds the 4-message thread a new Pro member starts
with: coach introduction → first shared plan → member reply → coach asking for feedback,
with timestamps 180 / 179 / 120 / 118 minutes in the past and realistic delivery states.

A test asserts that **every `planKey` in every scripted reply resolves to a real plan**, and
that `trainerReply()` always returns at least one bubble.

### 7.6 Audio and video calls

`src/app/trainer/call.tsx` (457 lines). **No camera, no microphone, no network, no
permissions.** No media or WebRTC package is imported anywhere in the project.

The lifecycle is isolated in one hook, `useCallSession(kind)`, which the file documents as
the provider swap point:

```
'calling' ──1200 ms──▶ 'ringing' ──2500 ms──▶ 'connected' ──[End call]──▶ 'ended' ──1500 ms──▶ close
```

- A 1-second ticker drives the duration display once connected.
- `end(outcome?)` logs a `CallSession` via `logCall()`, shows a toast, holds the
  "Call ended" state, then dismisses the modal.
- Outcome is inferred: `'ended'` if the call connected, `'missed'` if closed first.
  `'declined'` exists in the type for a real provider to report.
- Android hardware back **hangs up** instead of dropping out of a live call.
- Modal presentation: `fullScreenModal`, `gestureEnabled: false`.

**Audio call UI:** premium gradient background, pulsing rings while ringing, 132 px coach
avatar, name, role, live duration, availability hint, and three controls — Mute,
Speaker, End call. All toggles are local UI state only.

**Video call UI:** navy background with a gradient "video placeholder" stage captioned
*"Video placeholder — no camera is used"*, a connection pill (Connecting… / Connected /
Disconnected), a duration pill, a static self-preview tile styled like a draggable PiP,
and five controls — Camera, Mute, Camera-flip, Speaker, End call.

**Disclosure is unmissable and permanent:** a `DemoPill` reading
*"Demo call — no audio or video is transmitted"* stays on screen for the entire call, in
both modes.

### 7.7 Pro-only exercise demonstrations

`src/data/proDemos.ts` is one of the most carefully documented files in the repo.

**Demonstration videos (primary).** All 25 exercises have a muted, seamlessly looping
demonstration video (`PRO_VIDEOS`, `assets/videos/exercises/pro/`, built by
`scripts/pro-videos/`). `ProVideo` (expo-video) plays it in large tiles — the player, rest
screen and exercise sheet — only while the screen is focused and the app is in the foreground;
small tiles and reduced motion show its first-frame poster. Where a video exists it wins over the
photo demonstration below, which stays as the fallback.

**Photo demonstrations (fallback) — what they are, precisely:** two photographs of a real athlete per exercise (start and end
of the movement), registered onto each other and encoded as a 12-frame animated WebP that
holds each pose and cross-fades between them. They are **photo demonstrations, not video**,
and the in-between frames are a cross-fade, **not synthesised motion**. The file states that
screens must not describe them as video or as footage of the member's own coach.

- **18 of the 25 exercises** have a photo demonstration.
- **Seven have no photo** (they are covered by video), each with a recorded reason: `burpees` and
  `cobra-stretch` (source has neither), `jumping-jacks` (nearest clip starts in a
  half-squat with feet apart), `bent-leg-twist`, `cross-arm-crunches`, `dead-bug` (both
  source photos are the start position), `mountain-climber` (hips above the shoulder-heel
  line — the app's own listed common mistake).
- Known imperfections are documented inline rather than hidden: `leg-raises` is performed
  on a bench, `russian-twist` holds a weight plate, `plank` is a single still.

**The entitlement chokepoint** is a pair of functions:

```ts
export const proDemo = (id: string | undefined, pro: boolean) =>
  (pro && id ? PRO_DEMOS[id] : undefined);
export const proVideo = (id: string | undefined, pro: boolean) =>
  (pro && id ? PRO_VIDEOS[id] : undefined);
```

`ExerciseArt` is the only component that calls them, and it receives `pro` exclusively from
`access.can('trainer.demos')`. A Free or Smart account therefore **cannot** be handed a Pro
asset, which is asserted directly by tests in `entitlements.test.ts`
("Pro demonstrations stay Pro-only").

A caption component, `<ProDemoNote ids={…} />`, renders `proDemoCredit(ids)` —
*"Video demonstration · for form reference"*, or the photo credit
(*"Photo demonstration · free-exercise-db (public domain)"*) when any of them is a photo — and is required under every
surface that shows one — the trainer plan card, the exercise detail sheet.

Free and Smart continue to see the illustrated looping animations in
`EXERCISE_ANIM` (`src/components/glyphs.ts`), which are untouched by this feature.

### 7.8 Screen-by-screen walkthrough

#### `src/app/trainer/_layout.tsx` — the gate (38 lines)

```ts
const pro = access.can('trainer');
useEffect(() => { if (pro && !state.trainerId) assignTrainer(DEFAULT_TRAINER_ID); }, …);
if (!pro) return <LockedScreen lock={access.lock('trainer')!} eyebrow="Personal coaching" … />;
```

One gate for the whole subtree; a Pro member with no coach yet gets one automatically.

#### `src/app/trainer/index.tsx` — coaching dashboard (383 lines)

Seven sections, each with a staggered entrance animation:

1. **Hero** (premium gradient) — avatar with live online dot, "MY PERSONAL TRAINER"
   eyebrow, name, role, rating + review count, years coaching, city, speciality chips,
   availability pill, and three round actions: **Message**, **Audio session**,
   **Video session**.
2. **Today's session** — the plan scheduled for today as a full `TrainerPlanCard`
   (coach note, exercise rows with demonstrations, Details / Start workout). If the coach
   scheduled nothing, a **Rest card** names the next session and the day it lands on.
3. **Your training week** — Mon–Sun strip. Each day shows the plan's artwork and focus
   word, today is highlighted, completed plans carry a green tick, and tapping a day opens
   that plan. Rest days render a moon icon and are not pressable.
4. **Upcoming sessions** — booked one-to-one sessions with relative day labels
   (Today / Tomorrow / weekday), time, Video or Audio, duration, topic, and a **Join**
   button that starts the call of the matching kind. Footnote:
   *"Demo bookings for the Pro preview — nothing here is on a real calendar."*
5. **Training progress** — three animated counters (coach workouts completed, total
   minutes, total kcal) computed from `state.workouts` filtered to `sessionKey`s starting
   `trainer:`, plus a "Plans <Coach> scheduled" progress bar (`weekDone / plans.length`).
6. **Conversation** — the last two messages with author labels, an unread count or the
   coach's typical reply time, and a link into the thread. Empty state invites a hello.
7. **About <Coach>** — first-person intro, languages, and a certification list with
   ribbon tiles.

Plus a **"Replay your Pro introduction"** row (the welcome only auto-runs once, so this is
the way back to it) and a closing disclosure:
*"Coach profiles, calls and messages in this preview are simulated, not a real person."*

#### `src/app/trainer/chat.tsx` — trainer conversation (390 lines)

A production-quality messaging UI:

- **Header** — back, avatar with online dot, name, `typing…` indicator (replacing the
  availability line while the coach composes), audio-call and video-call buttons tinted
  with the coach's accent.
- **Permanent notice** — *"Demo coaching chat · <Coach> is a sample coach and every reply
  is scripted"*, with a refresh button that offers "Start a new conversation".
- **Day separators** — TODAY / YESTERDAY / `12 Mar`.
- **Delivery receipts** on the member's latest message: `sending` → `sent` → `delivered` →
  `read`, with matching icons and labels. "Read" lands just before the coach starts typing,
  as it would in a real thread.
- **Coach bubbles** tinted with the coach's accent, each optionally carrying an inline
  `TrainerPlanCard` the member can open or start immediately.
- **Animated typing dots** — three staggered dots, held static under reduced motion.
- **Quick-ask chips** — the five `QUICK_ASKS`, disabled while the coach is typing.
- **Composer** — accent-coloured focus border, animated send button that fills when there
  is something to send, `returnKeyType="send"`.
- **No lost replies.** Pending bubbles are tracked in a ref; if the screen unmounts
  mid-reply, the remaining bubbles are written into the store as `delivered` instead of
  being dropped.
- **Seeding** — if the thread is empty on arrival, `seedConversation()` fills it and all
  coach messages are marked read.

#### `src/app/trainer/call.tsx` — see [7.6](#76-audio-and-video-calls)

#### `src/app/pro-welcome.tsx` — Pro activation celebration (401 lines)

A one-time (per activation) full-screen experience in three acts:

1. **Celebration** — spring-popped gold medal, expanding halo, 8-dot SVG confetti ring.
   The stage shrinks responsively so the headline is readable without scrolling on short
   or narrow screens.
2. **Meet your personal trainer** — "PRO COACH" gold badge, responsive portrait with
   online dot, name, role, availability, three stats (rating + review count, years
   coaching, certification count), speciality chips, the coach's intro as a pull-quote,
   the full certification list, languages and city.
3. **What you've unlocked** — six expandable benefit cards: Personalized Workout Plans,
   Direct Coach Chat, Audio Calls, Video Coaching, Workout Recommendations, Progress
   Guidance. "Explore My Pro Benefits" expands all six and scrolls to them.

Footer actions: **Meet My Trainer** (`replace('/trainer')`), **Explore / Hide benefits**,
**Continue to Home**.

**Trigger logic** (tested in `store.test.tsx`, "Pro welcome shows once per activation"):

```ts
needsProWelcome(s) =
  s.premium?.tier === 'pro' && isPremiumActive(s.premium) && s.proIntroFor !== s.premium.since;
```

Keying on `premium.since` rather than a boolean means a **renewal or restore never
repeats** the welcome, while a genuinely new activation after a lapse shows it again. It is
fired from two places: the paywall success screen (for a purchase) and
`(tabs)/_layout.tsx` (for activations that bypass the paywall — e.g. a demo log-in or a
restore), where it waits until a tab route is actually visible so it never stacks on top of
the purchase celebration. The screen also redirects a non-Pro account away immediately.

#### `src/components/trainer/parts.tsx` — shared coaching components (235 lines)

| Component | Purpose |
| --- | --- |
| `TrainerAvatar` | Portrait or accent-tinted initials, optional online dot |
| `AvailabilityLine` | Status dot + availability label |
| `ProDemoNote` | Mandatory caption under any Pro demonstration |
| `TrainerPlanCard` | Full plan card: gradient icon, title, moves/min/kcal, coach note with avatar, exercise rows with demonstrations and rep/time pills, `+n more`, Details + Start workout |
| `TrainerAction` | Round accent button used for chat / audio / video |
| `openPlan(key)` / `startPlan(key)` | Navigate to `/program-day` or `/player` |

### 7.9 Complete user journey

```
┌─ Free or Smart member ────────────────────────────────────────────────────┐
│ Home premium card → "Get a personal nutritionist & trainer"               │
│ Workout tab → "Your coach" section → LockedCard                          │
│ Me tab → no trainer row                                                   │
│ Any /trainer deep link → LockedScreen (Pro features + "nothing you have   │
│                          logged is lost") → Upgrade to Pro                │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ purchase Pro (3 / 6 / 12 months)
                                ▼
                   Paywall Success screen
                   "Arjun Mehta is your personal trainer.
                    Your first week is already written."
                                │ "Meet my trainer"
                                ▼
                   /pro-welcome  (once per activation)
                   celebration → coach profile → 6 benefits
                                │ "Meet My Trainer"
                                ▼
┌─ /trainer — coaching dashboard ───────────────────────────────────────────┐
│ Coach assigned automatically (DEFAULT_TRAINER_ID) on first arrival        │
│                                                                           │
│ Today's session ──▶ Details ──▶ /program-day ──▶ Start ──▶ /player        │
│                 └─▶ Start workout ─────────────────────▶ /player          │
│ Week strip ─────▶ tap any day ─▶ /program-day                            │
│ Upcoming ───────▶ Join ────────▶ /trainer/call?mode=video|audio           │
│ Conversation ───▶ /trainer/chat                                           │
│ Message / Audio / Video buttons in the hero                               │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌─ /trainer/chat ───────────────────────────────────────────────────────────┐
│ Thread seeded with 4 messages if empty; coach messages marked read        │
│ Member sends → sending → sent → delivered → read → coach types → replies  │
│ Reply may include a plan card → Details or Start workout                   │
│ Call buttons in the header → /trainer/call                                │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌─ /trainer/call ───────────────────────────────────────────────────────────┐
│ calling → ringing → connected (duration ticks) → End call → ended → close │
│ CallSession written to state.calls                                        │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
┌─ /player — running a coach workout ───────────────────────────────────────┐
│ Same player as program days: countdown → work → rest → next              │
│ Pro accounts see demonstration videos instead of illustrations            │
│ Quit mid-way → resume saved per session key                               │
│ Finish → completeSession({ sessionKey: 'trainer:…' }) → /streak           │
└───────────────────────────────┬───────────────────────────────────────────┘
                                ▼
         Dashboard "Training progress" counters increase;
         the week strip shows a green tick on that day
```

### 7.10 Roles and responsibilities

The app models a two-party relationship, but **only the member's side is interactive** —
the coach side is pre-authored data.

| | **Member (the user)** | **Trainer (simulated)** |
| --- | --- | --- |
| Can do | Open the dashboard; read the coach's profile and certifications; view the weekly schedule; open or start any assigned plan; edit a session's exercises (Smart+); send messages; tap quick asks; start audio or video calls; join a booked session; clear the conversation; replay the Pro introduction | Writes the weekly plans (`TRAINER_PLANS`); attaches a coaching note to each; replies in chat; shares plans in chat; publishes working hours; "books" sessions (`BOOKED_SESSIONS`); "answers" calls |
| Cannot do | Choose or change coach; book, reschedule or cancel a session; rate or review the coach; send photos or videos; share a form-check clip; set training goals with the coach; see call history | Read anything the member sends; see the member's logs; adapt a plan to real progress; initiate contact; send a push notification |

**There is no trainer-facing application.** No coach login, no coach dashboard, no admin
panel. Roles exist only as data shapes.

### 7.11 Entry points to coaching

| Location | File | Behaviour |
| --- | --- | --- |
| Home premium card | `(tabs)/index.tsx:113-119` | Pro → `/trainer`; Smart → `/coach`; Free → `/plans` |
| Workout tab, "Your coach" | `(tabs)/fitness.tsx:231` | Pro → `CoachCard` → `/trainer`; otherwise `LockedCard` |
| Me tab, Preferences | `ProfileBody.tsx:622-632` | Pro only: "Your personal trainer · <Coach>'s plans, chat & calls" |
| Paywall success | `plans.tsx:554-568` | Pro purchase → coach intro → "Meet my trainer" → `/pro-welcome` |
| Pro welcome footer | `pro-welcome.tsx:273` | "Meet My Trainer" → `/trainer` |
| Tabs layout | `(tabs)/_layout.tsx:120-127` | Auto-opens `/pro-welcome` for an un-introduced Pro activation |
| Saathi AI chat | `coach.tsx` | Medical / "human coach" questions → `/plans?tier=pro` |
| Notifications | `data/notifications.ts` | "Fittelo Pro: 40% off" → `/plans` |
| Any locked trainer feature | `premium/locked.tsx` | `LockedScreen` / `LockedCard` → `/plans?tier=pro` |

### 7.12 Coach & trainer implementation status

#### ✅ Fully implemented

- Pro-only gating of the entire `/trainer` subtree, with a second gate inside `/player` so
  a deep link cannot start a locked session
- Automatic trainer assignment on first Pro arrival
- Full coach profile: role, specialities, years, rating, reviews, city, languages, intro,
  certifications, accent colour, portrait-or-initials avatar
- Live availability engine with four label states and next-slot lookahead
- Weekly schedule with per-day plans, rest days, completion ticks and tap-through
- Six coach-written plans that run through the real session player, with rest timers,
  per-session resume, plan edits and workout logging
- Coaching notes attached to every plan and displayed above the exercise list
- Full messaging UI: persistence, delivery receipts, typing indicator, day separators,
  quick asks, plan sharing in-thread, unread counts, read-on-open, new-conversation reset,
  and no-lost-replies on unmount
- Scripted reply engine with 13 intents including an injury/pain branch with a medical
  disclaimer, and a domain boundary that defers nutrition to Saathi
- Audio and video call lifecycle with duration tracking, controls, Android back handling
  and persistent "no audio or video is transmitted" disclosure
- Call records written to `state.calls` (newest first, capped at 50)
- Pro-only demonstration videos (photo fallback) with a single entitlement chokepoint and a mandatory
  credit caption
- Pro welcome screen that fires exactly once per activation and is replayable on demand
- Coaching progress stats derived from real workout logs
- Clear, repeated disclosure that the coach is simulated — on the dashboard, the chat, both
  call screens and the Pro welcome
- Test coverage: `trainerData.test.ts` (plan integrity, session resolution, chat integrity,
  profile edge cases), `entitlements.test.ts` (Pro-only enforcement), `store.test.tsx`
  (trainer slice persistence, read semantics, call history, welcome-once logic)

#### ⚠️ Partially implemented

| Feature | What works | What is missing |
| --- | --- | --- |
| **Coach selection** | Three fully specified coaches; `assignTrainer(id)` action exists | No browse / compare / choose UI. Everyone is assigned `arjun-mehta`. Kavya's and Rohit's profiles are reachable only through their plans appearing in chat |
| **Session booking** | `BOOKED_SESSIONS` renders with Join buttons | Bookings are static demo data. No booking, rescheduling, cancelling or calendar integration. `availability().todaySlots` is computed but never offered as bookable slots |
| **Calls** | Complete lifecycle, controls and logging | No real media. No camera/mic permission request. Call history is written but **never displayed** |
| **Chat** | Everything above | No real person, no model, no attachments, no voice notes, no push notifications. Keyword matching means unanticipated phrasing falls through to the generic reply |
| **Workout recommendations** | Advertised in the Pro welcome; the week is pre-scheduled | Nothing reads logs, skips or RPE to adapt the next session |
| **Progress guidance** | Coach-workout counters and a weekly completion bar | No coach-authored feedback, trend reading or load/recovery adjustment |
| **Form check** | The coach suggests a video call and points at "Common mistakes" | No video upload, no annotation, no async review |
| **Pro demonstrations** | Video for all 25 exercises | Clips are short loops (2.5–9 s); thumbnails show a still poster |

#### ❌ Not implemented

- Trainer-side application of any kind (coach login, client list, plan builder, inbox)
- Real-time messaging (sockets, presence, read receipts from a server)
- Real calling (WebRTC / Agora / Twilio), screen share, recording
- Coach ratings or reviews submitted by the member
- Nutritionist module — `COACHES` in `plans.ts` advertises a Clinical Nutritionist and a
  Diabetes Educator, and the paywall FAQ promises *"in-app chat with your nutritionist and
  trainer"*, but **no nutritionist chat, profile or plan exists**. The only nutrition
  coaching is the Saathi AI chat, which is available to every tier
- "Weekly 1-on-1 video check-ins" as a scheduled, recurring commitment (the Pro plan's
  advertised headline benefit)
- "Custom plans for diabetes, PCOS & thyroid" (advertised in `PLAN_TIERS`) — health
  conditions are collected in the profile but never used to shape a plan
- Coach-initiated messages, nudges or push notifications
- Media sharing in chat (photos, videos, PDFs)
- Multi-coach assignment (e.g. one trainer plus one nutritionist)
- Payment or commission flow for coaches

### 7.13 Recommendations for the coaching experience

Ordered by value-to-effort, highest first.

1. **Ship a coach-selection flow.** Three complete coach profiles already exist and
   `assignTrainer(id)` is already wired. A browse-and-choose screen (filter by speciality,
   compare rating and availability, confirm) would unlock the other two coaches and four of
   the six existing plans with almost no new data work. Today the Pro experience is
   identical for every member.
2. **Make bookings real.** `availability().todaySlots` and `next` already compute bookable
   slots. Add a `BookedSession[]` slice to the store, a "Book a session" sheet driven by
   those slots, and reschedule/cancel actions. Replace the static `BOOKED_SESSIONS` map.
   This also delivers the advertised "weekly 1-on-1 video check-in".
3. **Surface call history.** `state.calls` is written on every call and never read. A
   "Recent calls" section on the dashboard (kind, duration, outcome, date) is a few lines
   of UI over data that already persists.
4. **Close the advertising gap.** Either build the nutritionist module or remove the
   nutritionist and condition-specific promises from `PLAN_TIERS`, `COACHES` and the
   paywall FAQ. Promising a "dedicated certified nutritionist" and "custom plans for
   diabetes, PCOS & thyroid" that do not exist is a consumer-protection risk, not just a
   documentation one.
5. **Give the coach a reason to look at the logs.** `completeSession()` already records
   which coach plan was completed. A post-session "How did that feel?" RPE prompt written
   into the thread, plus a scripted coach response that references the actual log, would
   make the relationship feel bidirectional without any backend.
6. **Fix the chat re-seed.** A cleared conversation is re-seeded the next time the screen
   mounts (see [Known issues](#20-known-issues-and-gaps)). Persist a `trainerChatSeeded`
   flag in the store rather than a component ref.
7. **Plan the real backend seams.** The code already isolates them; document the contracts:
   `GET /trainers`, `GET /trainers/:id/plans`, `GET /trainers/:id/availability`,
   `POST /trainer/:id/messages` (replacing `trainerReply`), `POST /bookings`, and a token
   endpoint for the calling provider (replacing the three timers in `useCallSession`).
8. **Add an escalation path for pain.** The chat handles injury well in copy. Pair it with a
   structured flow: log the niggle, flag the affected movements, auto-substitute them in
   the week's plans, and surface a "see a professional" card.

---

## 8. Subscription plans: Free, Smart and Pro

### 8.1 Pricing (`src/data/plans.ts`)

Prices are in **USD** and are **display-only** — nothing is charged.

| Plan | Tagline | 3 months | 6 months | 12 months |
| --- | --- | --- | --- | --- |
| **Free** | — | $0 | $0 | $0 |
| **Fittelo Smart** | AI-powered plan that adapts to you | **$17.99** (was $29.99) | **$23.99** (was $49.99) · *Popular* | **$29.99** (was $79.99) · *Best value* |
| **Fittelo Pro** | Your own expert nutritionist & trainer | **$89.99** (was $129.99) | **$139.99** (was $219.99) · *Popular* | **$199.99** (was $349.99) · *Best value* |

Marketing feature lists (as written in `PLAN_TIERS`):

- **Smart:** Unlimited Snap meal scans · Saathi AI coach, 24×7 · Personalised meal &
  workout plans · Smart insights on every meal · Ad-free experience
- **Pro:** Everything in Smart · Dedicated certified nutritionist · Personal fitness
  trainer · Weekly 1-on-1 video check-ins · Custom plans for diabetes, PCOS & thyroid

> ⚠️ Three of these claims are **not backed by code**: Snap and the Saathi AI coach are
> available to Free accounts with no limit (no entitlement gates them); there is no
> nutritionist module; and condition-specific plans are not generated. See
> [Known issues](#20-known-issues-and-gaps).

### 8.2 What each tier actually unlocks (enforced)

| Capability | Free | Smart | Pro |
| --- | --- | --- | --- |
| Onboarding, profile, goals | ✅ | ✅ | ✅ |
| Calorie budget, macros, food diary | ✅ | ✅ | ✅ |
| Food search, 50-food database, favourites | ✅ | ✅ | ✅ |
| Snap meal scan | ✅ *(ungated)* | ✅ | ✅ |
| Saathi AI coach chat | ✅ *(ungated)* | ✅ | ✅ |
| Water, steps, weight logging | ✅ | ✅ | ✅ |
| Workout history, streaks, rewards | ✅ | ✅ | ✅ |
| 30-day program | **Day 1 only** | All 30 days | All 30 days |
| Body-focus session library | **Beginner only** | Full library | Full library |
| Guided classes | **Beginner only** | All levels | All levels |
| Progress & analytics | **Recent summary** | Full history | Full history |
| Customise a workout's exercises | ❌ | ✅ | ✅ |
| **Personal trainer dashboard** | ❌ | ❌ | ✅ |
| **Trainer chat** | ❌ | ❌ | ✅ |
| **Trainer audio / video calls** | ❌ | ❌ | ✅ |
| **Trainer-built plans** | ❌ | ❌ | ✅ |
| **Real-athlete photo demonstrations** | ❌ | ❌ | ✅ |
| Pro welcome experience | ❌ | ❌ | ✅ |

`FREE_PROGRAM_DAYS = 1`. The Free cap is **absolute** — it does not move with progress, so
a member who completed 12 days on Smart and then lapsed keeps every tick and every log but
can only train Day 1 again until they renew. Nothing is ever deleted; `LockedScreen` says
so explicitly: *"Everything you have already logged stays exactly as it is."*

### 8.3 Subscription lifecycle

```ts
type Premium = { tier: 'smart' | 'pro'; months: number; since: string; cancelledAt?: string };
```

| Event | Action | Effect |
| --- | --- | --- |
| Purchase | `subscribe(tier, months, amount)` | Renewing the **same active tier** extends it (months accumulate, `since` unchanged). A **different tier** starts today. Logged to `state.purchases` |
| Cancel | `cancelPremium()` | Sets `cancelledAt`. **Access continues to the end of the paid period** |
| Expiry | automatic | `planStatus()` returns `tier: 'free'`, `expired: true`, and remembers `purchased` so "Renew Pro" can be offered |
| Restore | `plans.tsx` → `restore()` | Replays the last entry in `state.purchases` through the same status rules. A plan that has since ended reports *"Nothing to restore — that plan has ended"* |
| Account log-in | `setPremium()` | Demo accounts each carry a plan (see [12.2](#122-authentication-demo-only)) |
| Malformed record | `planStatus()` | Treated as Free rather than crashing |

All six paths are covered by `entitlements.test.ts` and `store.test.tsx`.

### 8.4 Paywall surfaces

| Surface | File | Used when |
| --- | --- | --- |
| `LockBadge` | `premium/locked.tsx` | A locked row, card or day tile — small SMART/PRO chip |
| `LockDisc` | `premium/locked.tsx` | Overlaying artwork |
| `LockedCard` | `premium/locked.tsx` | A locked section inside an otherwise usable screen |
| `LockedScreen` | `premium/locked.tsx` | Replaces locked content entirely; sells the needed plan, lists its features, shows "from $X/mo", reassures about data |
| `/plans` | `plans.tsx` | Full paywall: tier cards, duration chips, feature matrix, Saathi card, coach band, testimonials, FAQ, restore |
| `/plans?tier=pro` | — | Paywall pre-selected on Pro |
| Onboarding paywall | `onboarding.tsx` step `paywall` | Uses the same `PlanPicker`, so both sell identical plans |
| Success screen | `plans.tsx:502` | Purchase celebration; Pro adds the coach introduction |

Lock copy is **composed in `entitlements.ts`, never in screens** — `featureLock()` and
`sessionLock()` return `{ need, title, text, badge }` and the UI just renders it.

---

## 9. Workout and training module

### 9.1 Exercise library (25 exercises)

`src/data/program.ts`:

```ts
type Exercise = {
  id, name, emoji,
  kind: 'reps' | 'time',
  base: number,                            // reps, or seconds when kind === 'time'
  focus: string[],                         // 'Rectus abdominis', 'Obliques', 'Chest' …
  muscles: string,
  instructions: string[],                  // 3 steps
  mistakes: { title, text }[],             // common mistakes
  breathing: string[],
};
```

Full list: jumping-jacks, abdominal-crunches, russian-twist, mountain-climber, heel-touch,
leg-raises, plank, bent-leg-twist, reverse-crunches, v-crunch, flutter-kicks,
cross-arm-crunches, bicycle-crunches, side-plank, dead-bug, push-ups, wide-push-ups,
tricep-dips, squats, lunges, glute-bridge, superman, burpees, cobra-stretch, spine-twist.

Every exercise has a still pose (`EXERCISE_ART`) **and** a looping animated WebP
(`EXERCISE_ANIM`) — 25 of each. 18 also have a Pro photo demonstration.

`ExerciseSheet` shows each exercise with large artwork and a three-tab segmented control:
**Instructions**, **Common mistakes**, **Breathing**. Pro accounts get the photo
demonstration plus its credit caption.

### 9.2 30-day programs (3)

| Id | Title | Level | Intensity | Users shown | Pool | Base count | Multiplier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `belly` | Lose Belly Fat | Beginner | ⚡ | 89,58,192+ | 10 exercises | 8 | 1.0 |
| `abs` | Rock Hard Abs | Intermediate | ⚡⚡ | 61,16,700+ | 12 exercises | 12 | 1.3 |
| `sixpack` | Six Pack Abs | Advanced | ⚡⚡⚡ | 38,40,500+ | 16 exercises | 16 | 1.6 |

`programDay(programId, day)` generates a **deterministic** session for any day 1–30:

- Every 7th day is a **rest day** (`isRestDay(day) = day % 7 === 0`).
- Exercise count grows with the day: `min(pool + 6, baseCount + floor(day / 6))`.
- Always warm-up first (jumping jacks, 30 s) and a stretch last (cobra or spine twist,
  alternating by day parity).
- The middle rotates by `(i + day * 3) % body.length`, so no two days are identical.
- Volume scales by `mult * (1 + day * 0.03)` — reps rounded, seconds rounded to 5 s.

Session keys: `program:<programId>:<day>`.

### 9.3 Body-focus sessions (10)

`FOCUS_SESSIONS` — keys `focus:<slug>`, each with a body part, a level and a fixed exercise
list. Card subtitles are **recomputed from `sessionStats()`** at module load so the
advertised duration always matches the real one.

| Key | Part | Level | Equipment |
| --- | --- | --- | --- |
| `focus:abs-beginner` | Abs | Beginner | — |
| `focus:stronger-abs` | Abs | Intermediate | — |
| `focus:rock-hard` | Abs | Advanced | — |
| `focus:chest-beginner` | Chest | Beginner | none |
| `focus:chest-dumbbell` | Chest | Advanced | ✅ |
| `focus:arm-toning` | Arm | Beginner | — |
| `focus:leg-day` | Leg | Intermediate | — |
| `focus:back-relief` | Back | Beginner | — |
| `focus:intense-shred` | Full body | Advanced | — |
| `focus:ultimate-core` | Full body | Advanced | ✅ |

Body parts filter: Abs, Chest, Arm, Leg, Back, Full body.

### 9.4 Guided classes (8)

`src/data/fitness.ts` — a separate concept from sessions: timed class segments with a named
(cosmetic) coach, run by `/workout/[id]`.

| Id | Title | Category | Min | Kcal | Level | Equipment | Coach |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `morning-yoga` | Morning Yoga Flow | Yoga | 20 | 90 | Beginner | Yoga mat | Anjali R. |
| `fat-burn-hiit` | Fat Burn HIIT | HIIT | 15 | 180 | Intermediate | None | Rohit S. |
| `full-body-strength` | Full Body Strength | Strength | 30 | 210 | Intermediate | Dumbbells | Vikram M. |
| `brisk-walk` | Brisk Walk | Walking | 30 | 140 | Beginner | None | Self-paced |
| `dance-cardio` | Bollywood Dance Cardio | Cardio | 25 | 220 | Beginner | None | Meera K. |
| `core-blast` | 10-min Core Blast | Strength | 10 | 70 | Beginner | Yoga mat | Rohit S. |
| `power-yoga` | Power Yoga | Yoga | 35 | 200 | Advanced | Yoga mat | Anjali R. |
| `cycling` | Indoor Cycling Intervals | Cardio | 30 | 260 | Advanced | Bike | Vikram M. |

These class "coaches" are **names on a card only** — they have no profile, no chat and no
relationship to the Pro trainer system.

The class player runs at a **configurable demo speed** (1× / 5× / 10×, default 5×, stored in
`settings.classSpeed`) so a 30-minute class can be demonstrated in minutes. Progress is
persisted in `state.classRun`.

### 9.5 Session player (`/player`)

The core training experience, shared by program days, focus sessions and coach plans.

- Phases: `ready` (configurable 5–15 s countdown) → `work` → `rest` → next
- Timed exercises count down; rep exercises wait for the member
- Rest duration from `settings.restSeconds` (10–60 s, 5 s steps)
- Pause / resume; auto-pause when the app backgrounds
- **Active wall-clock time** is tracked (paused time excluded) for an accurate log
- **Resume is persisted on every step** (`sessionResume[key] = { idx, done, elapsedMs, date }`),
  so a crash or app kill can still continue
- Exercise info sheet reachable mid-session
- Quit confirmation dialog
- Completion → `completeSession()` → workout log + program advance → `/streak`
- **Second entitlement gate**: a deep link into a locked session shows `LockedScreen`

`completeSession()` advances `programProgress[pid]` only when the finished day is exactly
the next one, and `removeWorkout()` rolls the program back if the log for the latest
completed day is deleted.

### 9.6 Session details (`/program-day`)

- Parallax hero themed with the session's own gradient (`accentTheme`)
- Stats: exercise count, estimated minutes, estimated kcal — recomputed from the member's
  rest setting
- Exercise list with artwork, muscles and rep/time pills; tap for the full exercise sheet
- **Edit mode** (Smart+, `plan.customise`): remove or reorder exercises. Edits persist per
  session key in `planEdits` and are honoured by the player. Reverting to the original list
  clears the edit
- Resume banner with completion percentage when a session was left midway
- Workout settings sheet: rest seconds, countdown, coach voice, music
- Rest days show recovery tips instead of a list
- Completed days show a tick

### 9.7 Workout tab (`/(tabs)/fitness`)

Sections: collapsing header with program day and weekly count · streak and notification
actions · **Today's workout** (ChallengeCard) with "Switch plan" · **Your coach** (Pro
dashboard card, or a `LockedCard`) · **Your activity** (steps with simulated sync, manual
activity logging from 8 activities with kcal/min rates, today's logs with undo) ·
**Level up** / **Got gear? Try these** / **Target an area** carousels with lock badges ·
**Train with a coach** (guided classes, filtered by category, with level locks).

### 9.8 Manual activity logging

8 activities with calories per minute: Walking 4.5, Running 10, Cycling 8, Yoga 4,
Swimming 9, Badminton 7, Cricket 5, Gym workout 6.5. The last used activity and duration
are remembered in `settings.lastActivity`.

### 9.9 Streak and rewards (`/streak`)

Shown after a completed session: animated celebration, session summary, consecutive-day
streak (`workoutStreak()` counts back from today, or yesterday if nothing is logged yet
today) and reward unlocking into `state.unlockedRewards`.

---

## 10. Nutrition and diet module

### 10.1 Food database (50 items)

`src/data/foods.ts`. Indian-first, per-unit nutrition with realistic household units
("1 katori (150 g)", "1 plate (180 g)", "1 piece (35 g)").

```ts
type Food = {
  id, name, emoji,
  category: 'Breakfast'|'Meals'|'Breads & Rice'|'Snacks'|'Fruits'|'Beverages'|'Protein'|'Sweets',
  unit, kcal, protein, carbs, fat, fiber,
  type: 'veg' | 'egg' | 'nonveg',
  score: number,   // health score out of 10
  note?: string,   // coaching tip
};
```

Examples: Poha (270 kcal, score 7), Idli (58 kcal, score 8), Sprouts Salad (120 kcal,
score 10), Samosa (262 kcal, score 2), Gulab Jamun (150 kcal, score 1).

Five meal slots with budget shares: Breakfast 25%, Morning Snack 10%, Lunch 30%, Evening
Snack 10%, Dinner 25%. `currentMeal()` picks the slot matching the time of day.

### 10.2 Calorie and macro engine (`src/lib/calc.ts`)

```
BMR     = 10·kg + 6.25·cm − 5·age + (male ? +5 : −161)      # Mifflin-St Jeor
TDEE    = BMR × activity factor                              # 1.2 / 1.375 / 1.55 / 1.725
Budget  = TDEE ∓ (pace × 1100)                               # lose / gain·muscle
          clamped to a floor of 1500 (male) / 1200 (female), rounded to 10
Protein = budget × (goal === 'muscle' ? 0.25 : 0.20) / 4
Fat     = budget × 0.28 / 9
Carbs   = budget × (1 − proteinShare − 0.28) / 4
Fibre   = 38 g (male) / 30 g (female)
Water   = 8 glasses
Steps   = 7,000 sedentary / 10,000 default / 12,000 very active
Weeks   = ceil(|current − target| / max(pace, 0.25))
```

Also: `bmi()`, `bmiLabel()` (Underweight < 18.5, Healthy < 23, Overweight < 27.5, Obese),
`kcalFromSteps()` (0.04 kcal/step), `kmFromSteps()` (0.00076 km/step), `cmToFtIn()`,
date-key helpers (`todayKey`, `addDays`, `relDay`, `fmtDate`).

### 10.3 Food diary (`/(tabs)/diet`, `/diary`)

`src/components/food/DiaryView.tsx`: week strip with logged-day markers, day navigation,
per-meal accordions with totals, add-food shortcut per meal, swipe/tap delete with
**undo that restores the entry at its original position and id**, "copy yesterday" (a no-op
if the target day already has food, so a double tap cannot duplicate), macro bars and a
day summary.

### 10.4 Food search and detail

`/food-search`: query search, 9 category filters, popular foods, favourites, recent
searches (deduped, capped at 8, clearable), meal selector, camera button into `/snap`.

`/food/[id]`: large artwork, per-unit nutrition, quick portions (0.5× / 1× / 1.5× / 2× / 3×)
plus a custom amount, macro breakdown, deterministic demo micronutrients derived from
macros, health score, coaching note, favourite toggle, add-to-meal.

### 10.5 Snap — meal photo scan (`/snap`)

A **simulation**. `expo-camera` is not installed; the viewfinder is a styled surface with
animated focus brackets.

Flow: `camera` → (shutter) → `analyzing` (animated scan) → `result`. The result cycles
through three hand-authored `SNAP_SAMPLES` (Home-style thali, South Indian breakfast,
Protein bowl). The member can toggle items off, adjust quantities, then log. A
**meal score** is computed as a kcal-weighted average of the items' health scores, with a
verdict band (≥ 8 well balanced, ≥ 5 decent, otherwise heavy).

`logSnap()` writes the `SnapLog` and all its food entries in **one atomic update**, linking
each entry to the snap via `snapId`.

### 10.6 Saathi AI coach (`/coach`)

See [7.1](#71-two-different-coaches) for how this differs from the Pro trainer.

The reply engine (`reply()` in `coach.tsx`) is keyword matching over a live context object
built from real app state — today's eaten/burned/remaining calories, protein gap, water,
steps, diet kind (veg/vegan/egg/nonveg), active program and progress, units, plan.

13 intents: greeting · thanks · treats & cheat meals (with a calories-fit calculation for
biryani) · high-protein snacks · meal plates per diet kind (with an automatic "keep it
light" fallback when the budget is nearly spent) · 30-day program status · workout
suggestion · water · medical conditions (routes to Pro) · day summary · weight and
plateaus · plans and pricing · sleep and stress · fallback.

Every reply can carry **one action button** — log a food, open the diary, start a workout,
add a glass of water, see plans. Six suggestion chips seed the conversation. Replies are
delayed 900–1500 ms behind a typing indicator, and the pending reply is held back visually
but written to the store so leaving the screen never loses it.

Chat persists in `state.coachChat`, capped at 100 messages, clearable.

### 10.7 Water and steps

Water: 8-glass goal, tap a glass to fill, `addWater(delta)` computes relatively from the
latest state so rapid taps never drop one, clamped 0–16 per day.

Steps: per-day counter with a simulated "Sync" button (sets a value with a spinner — no
HealthKit or Google Fit integration), converted to calories at 0.04 kcal/step and included
in `burnedOn()`.

---

## 11. Progress, analytics, history and streaks

### 11.1 Analytics tab (`/(tabs)/progress`)

- KPI tiles
- **Weight section**: SVG trend line, start/current/target, change since start, add a
  weigh-in (one per date — a second entry replaces it and updates `profile.weightKg`),
  delete with confirmation
- **Trends**, **Weekly Calories** (eaten vs burned bars), **Activity & Nutrition**
- **Gating**: without `progress.full` (Free), the full history is replaced by a
  `LockedCard` and only a recent summary is shown

### 11.2 Workout history (`/history`)

Month-grouped workout logs with per-month totals (kcal, minutes), session artwork resolved
via `logArt()`, and a date parameter so other screens can deep-link to a specific day.

### 11.3 Derived statistics (`src/lib/store.tsx`)

| Function | Returns |
| --- | --- |
| `dayTotals(entries, date)` | kcal/protein/carbs/fat/fibre, overall and per meal |
| `burnedOn(state, date)` | `{ workoutKcal, stepKcal, total }` |
| `workoutDays(state)` | Set of distinct dates with a workout |
| `workoutStreak(state)` | Consecutive workout days ending today (or yesterday) |
| `weekProgress(state)` | Current week's dates (Sun–Sat), how many are done |
| `isPremiumActive(premium)` | Whether the paid period still covers today |
| `needsProWelcome(state)` | Whether this Pro activation still owes a welcome |

### 11.4 Demo history generator (`src/lib/demo.ts`)

A fresh account is seeded **once** with 30 days of plausible history so every screen has
something to show immediately:

- All five meals on every past day, rotated across 6–7 plates per slot, scaled to the
  member's calorie budget and filtered by their diet (veg / vegan / egg / nonveg)
- Water and step history
- Training history with program progress, two deliberately missed days (11 and 18 days
  back) and a guided class every fourth session
- Weigh-ins trending from a computed start weight down to the sign-up weight
- Snap logs kept in step with the matching diary entries
- **Today is left half-done on purpose** — breakfast, morning snack and lunch logged
  (~50% of the budget), water and steps at half goal, today's session still pending

`withDemo()` runs once per install and **never seeds over real logs** — an account that
already has entries or workouts just gets the flag set. Ten tests in `demo.test.ts` assert
these properties.

---

## 12. Onboarding and authentication

### 12.1 Onboarding flow (23 steps)

`src/app/onboarding.tsx` (986 lines) plus ~20 step components in
`src/components/onboarding/`.

```
intro ─┬─▶ login  ──▶ (tabs)
       ├─▶ signup ──▶ welcome
       └─▶ welcome
welcome → gender → shape → desired → birth → height → weight → target
        → preview → timeline → benefits → experience → level → activity
        → rest → diet → dietinfo → reward → motivation → analysis
        → result → paywall → (tabs)
```

Steps are grouped into labelled sections shown in a persistent progress header:
**Goal & Focus** (gender, current shape, desired shape) · **Know Your Body** (birth year,
height, weight, target) · **Fitness Assessment** (preview, experience, level, activity,
rest days, diet) · **Know Your Goal** (timeline) · **Program Benefits** · **Nutrition
Plan** (diet info, reward).

Notable interactions: body-shape picker on a 0–6 body-fat scale, year wheel for age with
an age-bracket insight, ruler picker for height (cm/ft) and weight (kg/lb), BMI gauge,
goal-curve projection, pace picker, rest-day planner, before/after preview, animated
"analysis" step, then a plan result and the paywall.

**Draft persistence:** every answer is saved to `state.onboardingDraft`, so a kill mid-flow
resumes at the same step with the same answers. `completeOnboarding()` clears the draft.

**Chosen intensity sets the program:** Ease into it → `belly`, Break a sweat → `abs`,
Push me → `sixpack`.

**Re-onboarding never destroys data.** `completeOnboarding()` keeps every log; only a
genuinely fresh user gets their onboarding weight written as the first weigh-in.

### 12.2 Authentication (demo only)

There is **no real auth**: no password hashing, no token, no session, no OAuth, no
server. `src/components/onboarding/Auth.tsx` + `src/components/AccountSheet.tsx`.

| Method | Behaviour |
| --- | --- |
| **Email + password** | Any valid-looking email and any password work. On **log-in** the account is granted **Pro** (12 months); on **sign-up** no plan |
| **Continue with Google** | Opens a demo account sheet with 3 accounts: the member's own name (Free), "Demo User" (Smart), "Fitness Team" (Pro) |
| **Continue with Apple** | Same, including a "Hide My Email" private-relay address for the Pro account |

Each demo account carries a plan which is applied with `setPremium({ tier, months: 12, since: today })`.
The chosen account becomes the linked backup account (`state.backup`) with its provider.

A returning user **on the same device** (any existing weights or entries) goes straight back
in via `logIn()` with all saved data; a genuinely new account runs the full question flow.

### 12.3 Cloud backup (simulated)

`src/components/profile/backup.tsx`: a "Backup & Restore" card with a simulated
account-picker → consent → loading → connected flow, a "Sync now" button that spins and
updates `lastSync`, and a sign-out dialog. **Nothing leaves the device.**

---

## 13. Profile, settings and account

`src/components/profile/ProfileBody.tsx` (1,311 lines) powers both the **Me** tab and the
pushed `/profile` screen.

**Sections:** profile header (avatar initials, name, plan badge) · Backup & Restore card ·
body stats and BMI · goal summary with "Adjust goals" · program progress with "Start Day N" ·
**Your plan** (status, renewal/expiry date, cancel, upgrade) · **Preferences** (App
settings · **Your personal trainer** *(Pro only)* · Workout preferences · Language ·
Diet preference · Health conditions · Notifications · Membership) · **Love Fittelo?**
(rate the app 1–5, stored so it is not asked twice; invite a friend) · Help & FAQ ·
About & Privacy · **Demo controls** (Restart onboarding · Reset all demo data · Log out).

`/edit-profile` edits name, phone, gender, age, height, goal, target weight, pace and
activity level.

`/settings` covers meal/water/weigh-in reminders, units (kg/lb), height unit (cm/ft),
language, and a workout-preferences sheet (rest seconds, countdown, coach voice, music).
Reminder toggles are **stored but never scheduled** — `expo-notifications` is not installed.

`/notifications` lists 6 static notifications with per-type icon tiles, read-state
tracking (`state.readNotifs`) and deep links into the app.

---

## 14. Data model reference

### 14.1 `AppState` (the complete persisted shape)

```ts
type AppState = {
  onboarded: boolean;
  profile: Profile;                                  // 30+ fields, see below
  entries: FoodEntry[];                              // { id, foodId, meal, qty, date, snapId? }
  water: Record<string, number>;                     // dateKey → glasses (0–16)
  steps: Record<string, number>;                     // dateKey → steps
  workouts: WorkoutLog[];                            // { id, workoutId?, sessionKey?, title,
                                                     //   emoji, minutes, kcal, date }
  weights: WeightEntry[];                            // { id, date, kg } — one per date
  premium: Premium | null;                           // { tier, months, since, cancelledAt? }
  purchases: { tier, months, date, amount? }[];
  readNotifs: string[];
  settings: Settings;                                // 15 fields
  programProgress: Record<string, number>;           // programId → completed days
  backup: { name, email, lastSync, provider? } | null;
  planEdits: Record<string, SessionItem[]>;          // sessionKey → edited exercise list
  sessionResume: Record<string, SessionResume>;      // sessionKey → { idx, done, elapsedMs, date }
  classRun: ClassRun | null;                         // in-progress guided class
  seenTips: string[];
  unlockedRewards: string[];
  snaps: SnapLog[];
  coachChat: ChatMsg[];                              // Saathi AI — capped at 100
  recentSearches: string[];                          // capped at 8
  favoriteFoods: string[];
  onboardingDraft: OnboardingDraft | null;
  rating: number | null;                             // 1–5
  demoSeeded: boolean;

  /* ---------- Pro coaching slice ---------- */
  trainerId: string | null;                          // assigned coach
  trainerChat: TrainerMsg[];                         // capped at 200
  calls: CallSession[];                              // capped at 50, newest first
  proIntroFor: string | null;                        // premium.since of the introduced activation
};
```

### 14.2 `Profile`

`name`, `phone`, `email`, `goal` (`lose|maintain|gain|muscle|healthy`), `motivations[]`,
`gender`, `age`, `heightCm`, `weightKg`, `targetKg`, `pace` (kg/week), `activity`
(`sedentary|light|moderate|very`), `exercise`, `diet`, `cuisines[]`, `restrictions[]`,
`conditions[]`, `sleep`, `waterHabit`, `challenges[]`, `mealTimes`, `healthSync`,
`notifications`, `startWeightKg`, `program` (`belly|abs|sixpack`), `weeklyGoal`,
`bodyShape` (0–6), `targetShape` (0–6), `birthYear`, `experience`, `workoutLevel`,
`restDays[]`, `dietType`, `rewards[]`.

### 14.3 Coaching types

```ts
type MsgStatus  = 'sending' | 'sent' | 'delivered' | 'read';
type TrainerMsg = { id; from: 'user'|'trainer'; text; at; status: MsgStatus; planKey? };
type CallSession= { id; trainerId; kind: 'audio'|'video'; at; seconds;
                    outcome: 'ended'|'missed'|'declined' };
type Trainer    = { …see 7.2 };
type TrainerPlan= Session & { trainerId; note; focus; day };
type Availability = { online; label; todaySlots; next };
type BookedSession= { id; inDays; time; minutes; kind; topic };
```

### 14.4 Relationships (there is no relational database — these are logical links)

```
Profile ─1:1─ AppState
Profile ──▶ ProgramId ──▶ programProgress[programId]

Session (key)
 ├── 'program:<pid>:<day>'  ← generated by programDay()
 ├── 'focus:<slug>'         ← FOCUS_SESSIONS
 └── 'trainer:<slug>'       ← TRAINER_PLANS ──▶ Trainer (trainerId)
      │
      ├─▶ planEdits[key]        (member's edited exercise list)
      ├─▶ sessionResume[key]    (where to continue)
      └─▶ WorkoutLog.sessionKey (what was completed)

SessionItem.exerciseId ──▶ Exercise ──┬─▶ EXERCISE_ART / EXERCISE_ANIM (all tiers)
                                      └─▶ PRO_DEMOS (Pro only, 18 of 25)

FoodEntry.foodId ──▶ Food
FoodEntry.snapId ──▶ SnapLog          (a snapped meal and its entries)
FoodEntry.meal   ──▶ MealKey ──▶ MEALS (budget share)

trainerId ──┬─▶ TRAINERS           (profile, hours, certifications)
            ├─▶ TRAINER_PLANS      (the member's week)
            ├─▶ BOOKED_SESSIONS    (demo bookings)
            ├─▶ trainerChat        (conversation)
            └─▶ calls              (call history, write-only today)

premium ──▶ planStatus() ──▶ Tier ──▶ ENTITLEMENTS ──▶ Feature gates
premium.since ──▶ proIntroFor       (welcome-once-per-activation key)
```

---

## 15. APIs, database and persistence

### 15.1 There is no API and no database

Verified by search: no `fetch`, no `axios`, no `XMLHttpRequest`, no GraphQL client, no
`process.env`, no `expo-constants` config read, no SQLite, no Realm, no Firebase, no
Supabase. The only I/O in the entire project is `AsyncStorage`.

### 15.2 Local persistence

| | |
| --- | --- |
| Engine | `@react-native-async-storage/async-storage` 2.2.0 |
| Key | `fitora-state-v1` |
| Schema version | `1` (`SCHEMA_VERSION` in `src/lib/persist.ts`) |
| Format | `JSON.stringify({ ...state, version })` |
| Corruption backup key | `fitora-state-v1.corrupt-<timestamp>` |
| Write strategy | 300 ms debounce, immediate flush on background/`pagehide`, 2 s retry on failure |
| Migration hook | `migrate(saved)` — add a step and bump `SCHEMA_VERSION` |

### 15.3 Where a real backend would plug in

Each simulation is deliberately isolated. These are the exact seams:

| Capability | Today | Replace |
| --- | --- | --- |
| Trainer directory | `TRAINERS` in `src/data/trainers.ts` | `GET /trainers`, `GET /trainers/:id` — the type already matches a response shape |
| Trainer availability | `availability()` in `src/data/trainers.ts` | `GET /trainers/:id/availability` |
| Coach plans | `TRAINER_PLANS` in `src/data/trainerPlans.ts` | `GET /trainers/:id/plans` — the file names this contract explicitly |
| Trainer messaging | `trainerReply()` in `src/data/trainerChat.ts` | `POST /trainer/:id/messages` returning bubbles with delays — **one function** |
| Trainer calls | the three timers in `useCallSession()` (`src/app/trainer/call.tsx`) | Agora / Twilio / WebRTC join, remote-joined and disconnected callbacks; toggles map to the client's mute/speaker/camera calls |
| Bookings | `BOOKED_SESSIONS` in `src/data/trainers.ts` | `GET/POST/DELETE /bookings` |
| AI nutrition coach | `reply()` in `src/app/coach.tsx` | An LLM endpoint with the same `Reply { text, action? }` contract |
| Meal photo scan | `SNAP_SAMPLES` + the `analyzing` stage in `src/app/snap.tsx` | `expo-camera` capture + a vision/nutrition API |
| Steps | the `sync()` handler in `(tabs)/fitness.tsx` | HealthKit / Google Fit via `expo-health` or a native module |
| Cloud backup | `BackupCard` in `src/components/profile/backup.tsx` | A real account + sync service |
| Auth | `AuthScreen` + `demoAccounts()` | A real identity provider; `state.backup` already models the linked account |
| Payments | `subscribe()` / `restore()` in `src/lib/store.tsx` and `src/app/plans.tsx` | RevenueCat or StoreKit/Play Billing; `planStatus()` already models periods, renewals, cancellation and expiry |
| Notifications | `NOTIFICATIONS` in `src/data/notifications.ts` + reminder toggles | `expo-notifications` + a push service |

---

## 16. Configuration and environment

### 16.1 Environment variables

**None.** There is no `.env`, no `.env.example`, and no `process.env` or
`Constants.expoConfig.extra` read anywhere in `src/`. Nothing needs configuring to run the
app.

### 16.2 `app.json`

```json
{
  "name": "Fittelo", "slug": "fittelo", "version": "1.0.0",
  "orientation": "portrait", "scheme": "fittelo", "userInterfaceStyle": "light",
  "icon": "./assets/images/icon.png",
  "ios": {
    "icon": "./assets/expo.icon",
    "bundleIdentifier": "com.dev.fittelo",
    "infoPlist": {
      "NSAppleMusicUsageDescription": "…play music during your workouts.",
      "NSPhotoLibraryUsageDescription": "…add progress and profile pictures."
    }
  },
  "android": {
    "package": "com.dev.fittelo",
    "adaptiveIcon": { "backgroundColor": "#56D661", … },
    "predictiveBackGestureEnabled": false
  },
  "web": { "output": "static", "favicon": "./assets/images/favicon.png" },
  "plugins": ["expo-router", ["expo-splash-screen", { "backgroundColor": "#56D661", … }]],
  "experiments": { "typedRoutes": false, "reactCompiler": true }
}
```

> Note: the two iOS usage descriptions are declared but **no code requests either
> permission** — there is no Apple Music integration and no photo picker. Either wire them
> up or remove them before an App Store submission, since unused purpose strings invite
> review questions.

### 16.3 TypeScript paths

```
@/*        → ./src/*
@/assets/* → ./assets/*
```

Mirrored in the Jest `moduleNameMapper`. `strict: true`.

### 16.4 Native projects

`ios/` and `android/` exist locally but are **git-ignored** (`/ios`, `/android` in
`.gitignore`) because the project uses **Continuous Native Generation**. Never edit them by
hand — configure native behaviour in `app.json` and config plugins, and regenerate with
`npx expo prebuild --clean`.

---

## 17. Installation, running and building

### 17.1 Prerequisites

- Node.js 20+
- For local native builds: Xcode (iOS) / Android Studio (Android). Not needed for EAS.
- `npm` (the repository ships `package-lock.json`; there is no `bun.lock`, so use `npm`)

### 17.2 Install and run

```bash
npm install

npx expo start            # dev server + QR code
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
npx expo start --web      # browser preview
```

Or via the package scripts:

```bash
npm start          # expo start
npm run ios        # expo run:ios      (local native build)
npm run android    # expo run:android  (local native build)
npm run web        # expo start --web
```

Expo Go is sufficient — every dependency is part of the Expo SDK, so no custom
development build is required today. **Adding any library with native code will change
that.**

Always use `npx expo install <package>` rather than `npm install` for Expo-ecosystem
packages, so SDK-compatible versions are resolved.

### 17.3 Quality gates

```bash
npx tsc --noEmit    # typecheck
npx expo lint       # lint
npm test            # jest
npx expo-doctor     # dependency / config diagnosis
npx expo install --fix   # repair incompatible versions
```

Run the first three before declaring any task done.

### 17.4 Building with EAS

> **There is no `eas.json` in this repository yet.** Run
> `npx eas-cli@latest build:configure` once to create it before the commands below will
> work.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure

npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile preview     --platform android
npx eas-cli@latest build --profile production  --platform all

npx eas-cli@latest submit --platform ios
npx eas-cli@latest update --branch production --message "…"
```

Docs: https://docs.expo.dev/eas/

### 17.5 Demo walkthrough tips

- **Any** valid-looking email and **any** password sign you in. An email **log-in** grants
  Pro, so the coaching module is reachable in two taps.
- "Continue with Google" / "Continue with Apple" offer three demo accounts each: Free,
  Smart and Pro.
- Already signed in and want Pro? **Me → Your plan → Upgrade**, or
  **Me → Membership → Restore purchases**.
- A fresh install arrives with 30 days of history and today half-logged.
- **Me → Demo controls** → *Restart onboarding* (replay the flow) or *Reset all demo data*
  (wipe the device state).
- Guided classes run at 5× by default — tap the speed badge in the player to change it.

---

## 18. Testing and quality gates

**5 suites, 79 tests, all passing.** Tests live in `src/lib/__tests__/`.

| Suite | Tests | Covers |
| --- | --- | --- |
| `store.test.tsx` | 25 | Onboarding and re-onboarding; demo seeding exactly once and never over real logs; every user action surviving a restart; immediate save on background; retry on failed save; no overwrite after a failed read; malformed-record filtering; water clamping and rapid taps; invalid quantities; undo restoring id and position; `copyDay` idempotence; atomic snap logging; recent-search dedupe; program progress advance and rollback; premium renew/cancel; **the whole Pro trainer slice**; **Pro-welcome-once-per-activation** |
| `entitlements.test.ts` | 18 | `planStatus` for no purchase / active / cancelled / expired / malformed; `can()` tier inclusion; trainer features Pro-only; Free capped at Day 1 and the cap not moving with progress; out-of-range days; library and trainer-plan locks; guided-class locks; lock copy naming the required plan; **Pro demonstrations unreachable for Free and Smart** |
| `demo.test.ts` | 10 | All 30 days logged; five meals near budget; today half done; training history and program progress; weigh-in trend; snaps in step with entries; vegetarian/vegan respect; scaling with budget; every meal slot covered |
| `trainerData.test.ts` | 15 | Every plan item is a real, demonstrable exercise; every plan has a key, note and real coach; usable summaries; `findSession` resolving trainer keys; unknown keys returning `undefined`; `sessionMeta` crediting the author; every Pro demo id being a real exercise; every shared plan key in every scripted reply resolving; at least one reply bubble always; seeded conversation ordering; availability labels and next slots; an all-week-off coach; unknown trainer id falling back; every coach having a renderable week |
| `persist.test.ts` | 8 | `mergeTyped` type matching, fallbacks, unknown-key dropping; serialize/deserialize round-trip; empty storage and garbage handling; persistence across a reload; corruption backup |

### Gaps in test coverage

- **No component or screen tests.** `@testing-library/react-native` is installed and used
  only to drive the store in `store.test.tsx`. No screen renders in a test.
- **No E2E tests** (no Detox, no Maestro).
- `src/lib/calc.ts` (BMR, TDEE, macros, BMI, dates) has **no direct unit tests**, despite
  being the engine behind every nutrition number in the app.
- No snapshot or accessibility tests.
- No CI workflow (`.github/workflows/` does not exist), so none of the gates run
  automatically.

---

## 19. Feature implementation status

### ✅ Complete and production-shaped

Onboarding (23 steps, draft-resumable) · calorie/macro/BMI engine · 50-food database ·
food diary with undo and copy-day · food search with favourites and recents · food detail
with portions · water tracking · manual activity logging · 25-exercise library with
instructions, mistakes and breathing · 25 looping exercise animations · 3 × 30-day programs
with deterministic generation · 10 body-focus sessions · 8 guided classes · full session
player with rest, resume, pause and accurate active-time logging · workout logging with
program advance and rollback · streaks and rewards · weight tracking with trend chart ·
analytics tab · workout history · notifications list with read state · profile, edit
profile, settings · **the complete three-tier entitlement system** · all paywall surfaces ·
subscription lifecycle (purchase, renew, cancel, expire, restore) · **the whole Pro
coaching module as described in section 7** · demo history generator · robust persistence ·
design system · reduced-motion and accessibility support.

### ⚠️ Partial or simulated

| Feature | State |
| --- | --- |
| Authentication | UI complete, zero security. Any credentials work |
| Payments | UI and lifecycle complete, no payment processor |
| Snap meal scan | Full UX, no camera and no recognition — 3 fixed samples |
| Saathi AI coach | State-aware and useful, but keyword matching, not a model |
| Trainer chat | Full messaging UX, scripted replies |
| Trainer calls | Full lifecycle and controls, no media; history written but never shown |
| Session bookings | Rendered with Join buttons, but static demo data |
| Coach selection | 3 coaches defined, 1 ever assigned, no chooser |
| Step sync | Button and spinner, no HealthKit / Google Fit |
| Cloud backup | Full flow, nothing leaves the device |
| Reminders | Toggles persist, nothing is ever scheduled |
| Health conditions | Collected in the profile, never used to shape a plan |
| Pro demonstrations | 18 of 25 exercises |
| Language setting | Stored, but the app is English-only — no i18n layer |
| Units (kg/lb, cm/ft) | Honoured in most places; verify any new surface |

### ❌ Missing entirely

Backend, API and database · real auth and account recovery · real payments and receipts ·
push notifications · camera and photo-based logging · barcode scanning · custom/user-created
foods and recipes · HealthKit/Google Fit/wearables · real-time messaging · real calling ·
nutritionist module · trainer-facing app or admin panel · booking/scheduling · coach
reviews · social features (friends, challenges, leaderboards) · i18n and localisation ·
offline/online sync and conflict resolution · analytics and crash reporting · A/B testing ·
dark mode (`userInterfaceStyle` is pinned to `light`) · tablet/landscape layouts ·
data export or GDPR delete · CI/CD.

---

## 20. Known issues and gaps

Ordered by severity. Each is a verified observation about the current code, not a
speculation.

### High — commercial and legal

1. **Exercise animations need a licence before shipping.**
   `assets/images/CREDITS.md` states that `exercises/*.webp` and `exercises/anim/*.webp`
   are **© Gym visual** (https://gymvisual.com/), redistributed at 180 px with the rights
   holder's permission *in the source dataset*. Using them in a shipped product
   **requires a licence obtained directly from Gym visual**. These are the animations every
   Free and Smart user sees on every exercise — the single largest commercial blocker in
   the repository.

2. **Three advertised plan features do not exist.** `PLAN_TIERS` and the paywall FAQ
   promise a *"Dedicated certified nutritionist"*, *"Weekly 1-on-1 video check-ins"* and
   *"Custom plans for diabetes, PCOS & thyroid"*. None is implemented. The paywall also
   shows three named "certified coaches" (`COACHES`) who have no module behind them.

3. **Two Smart features are not actually gated.** "Unlimited Snap meal scans" and
   "Saathi AI coach, 24×7" are sold as Smart benefits, but `/snap` and `/coach` have **no
   entitlement check at all** — a Free account gets both, unlimited. Either add
   `snap.unlimited` / `coach.ai` features to `ENTITLEMENTS`, or stop selling them.

### Medium — functional

4. **Call history is written but never read.** `logCall()` persists every `CallSession` to
   `state.calls` (capped at 50, newest first, with duration and outcome), and no screen
   displays it. Pure dead data today; a few lines of UI away from being a feature.

5. **A cleared trainer conversation comes back.** In `src/app/trainer/chat.tsx` the
   seed guard is a component ref (`seeded.current`). Clearing the thread keeps it empty for
   the current visit, but leaving the screen and returning re-runs
   `seedConversation()` because `chatLen === 0` again. The code comment states the opposite
   intent ("a thread the member deliberately cleared stays empty until they write").
   Fix: persist a `trainerChatSeeded` flag in the store.

6. **Only one coach is reachable.** `trainer/_layout.tsx` always assigns
   `DEFAULT_TRAINER_ID` (`arjun-mehta`). Kavya Iyer and Rohit Shetty — two complete
   profiles with portraits, certifications, hours and plans — are never assigned to anyone.
   Three of the six trainer plans (`full-body-burn`, `mobility-reset`, `upper-finisher`)
   never appear on the dashboard week and surface only when the chat engine shares them.

7. **Bookings are decorative.** `BOOKED_SESSIONS` is a static map keyed by trainer. The
   Join button works, but there is no way to create, move or cancel a session, and
   `availability().todaySlots` — which already computes bookable slots — is never offered.

8. **Reminder toggles do nothing.** `settings.mealReminders`, `waterReminders` and
   `weighInReminders` persist but schedule nothing (`expo-notifications` is not installed).

9. **The language setting has no effect.** `settings.language` is stored and displayed, but
   every string in the app is a hard-coded English literal. There is no i18n layer.

10. **The repository README was stale before this rewrite.** It documented a
    phone-plus-OTP login that no longer exists (the current flow is email/password plus
    Google/Apple demo sheets) and tab names ("Training", "Reports") that have since been
    renamed to "Workout" and "Analytics".

### Low — housekeeping

11. **Two orphaned Pro demo assets.** `assets/images/exercises/pro/` contains
    `dead-bug.webp` and `mountain-climber.webp`, but both exercises are **deliberately
    excluded** from `PRO_DEMOS` (documented reasons: both source photos are the start
    position; hips above the shoulder-heel line). The files ship in the bundle unused.

12. **Empty asset directories.** `assets/videos/_incoming/` and `assets/videos/pro/` are
    both empty, left over from the exploration that produced the photo-demonstration
    pipeline.

13. **Unused iOS purpose strings.** `NSAppleMusicUsageDescription` and
    `NSPhotoLibraryUsageDescription` are declared in `app.json` but no code requests either
    permission.

14. **`LICENSE` is the Expo starter template's MIT licence**
    ("Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)"). It is not a deliberate
    licence choice for this product and does not reflect the media restrictions in
    `CREDITS.md`.

15. **`spine-twist` reuses `bent-leg-twist` artwork** for both its still and its animation.
    This is documented and intentional (the source dataset's own spine twist is a *seated*
    movement), but it means two different exercises show the same illustration.

16. **No `typecheck` npm script.** `npx tsc --noEmit` has to be remembered manually; adding
    `"typecheck": "tsc --noEmit"` to `package.json` would make the gate discoverable.

17. **`sessionStats()` hard-codes a 30 s rest default** in its signature while the player
    uses `settings.restSeconds`. Callers that forget to pass the setting show a duration
    that disagrees with the one the member will experience. Most callers do pass it;
    `planLine()` in `trainerChat.ts` does not.

---

## 21. Recommendations and roadmap

### Phase 1 — make the prototype defensible (days)

1. **Resolve the Gym visual licence** or replace those 50 assets. Nothing else should ship
   before this is settled.
2. **Align marketing copy with enforcement.** Either gate Snap and Saathi behind Smart, or
   remove them from the Smart feature list. Remove the nutritionist, weekly-check-in and
   condition-specific promises until they exist.
3. Delete the two orphaned Pro assets, the two empty video directories and the unused iOS
   purpose strings; replace `LICENSE` with a deliberate choice.
4. Add `"typecheck": "tsc --noEmit"` and a GitHub Actions workflow running
   typecheck + lint + test on every push.
5. Add unit tests for `src/lib/calc.ts` — it is the least-tested, highest-leverage file in
   the project.

### Phase 2 — complete the coaching experience (weeks)

6. **Coach selection flow** — unlocks two finished coach profiles and three finished plans
   with no new data work. See [7.13](#713-recommendations-for-the-coaching-experience).
7. **Real bookings** over the availability engine that already exists, which also delivers
   the advertised weekly check-in.
8. **Surface call history** on the dashboard.
9. **Fix the chat re-seed** with a persisted flag.
10. **Post-session feedback loop** — an RPE prompt written into the thread plus a scripted
    coach response that cites the actual log.
11. Add screen-level tests for the four trainer surfaces; they are the most valuable
    screens and currently have no render coverage.

### Phase 3 — build the backend (months)

12. **Auth and accounts** — a real identity provider; `state.backup` already models the
    linked account.
13. **API layer** behind the seams in [15.3](#where-a-real-backend-would-plug-in). Keep the
    existing data files as fixtures so the UI can run offline and tests stay fast.
14. **Real-time messaging** for trainer chat, with presence and server-side receipts. The
    client already models `sending → sent → delivered → read`.
15. **Real calling** (Agora/Twilio/WebRTC) replacing the three timers in `useCallSession`,
    plus camera and microphone permission flows.
16. **Payments** via RevenueCat or native billing. `planStatus()` already models periods,
    renewals, cancellation and expiry, so only the purchase call changes.
17. **Trainer-facing application** — the missing half of the product. Coach login, client
    list, plan builder writing `TrainerPlan` records, inbox, and session calendar.
18. **Push notifications** to replace the static list and activate the reminder toggles.
19. **Camera and real meal recognition** to make Snap genuine.
20. **Health platform integration** (HealthKit / Google Fit) to replace the simulated step
    sync.

### Phase 4 — scale and polish

21. i18n (the `language` setting is already there, waiting), dark mode, tablet layouts.
22. Offline-first sync with conflict resolution — the local store is already the source of
    truth, which is the right starting point.
23. Analytics and crash reporting; data export and account deletion for GDPR/DPDP.
24. Social features (friends, challenges, leaderboards) and coach reviews.
25. E2E tests (Maestro or Detox) over the five critical journeys: onboarding, logging a
    meal, completing a workout, upgrading to Pro, and messaging the coach.

---

## 22. Assets, media licensing and legal notes

`assets/images/CREDITS.md` is **required reading before any release**. Summary:

| Asset group | Source | Licence | Obligation |
| --- | --- | --- | --- |
| `exercises/*.webp`, `exercises/anim/*.webp` | Gym visual via the `exercises-dataset` repo | **© Gym visual** — dataset text is MIT, the *media* is not | ⚠️ **A licence from Gym visual is required to ship.** Attribution must stay intact. Resolution must not exceed 180 px |
| `exercises/pro/*.webp` | `free-exercise-db` (yuhonas) | **Unlicense / public domain** | None required. The app shows `PRO_DEMO_CREDIT` anyway |
| `trainers/*.webp` | AI-generated for this project | Project-owned | Fictional people only — never present as a real coach |
| `onboarding/*.webp` | AI-generated for this project | Project-owned | No real people or third-party likeness |
| `home-hero.jpg` | Wikimedia Commons (Shixart1985) | **CC BY 2.0** | Attribution required — currently only in `CREDITS.md`, **not surfaced in the app** |
| `welcome-bg.jpg` | Wikimedia Commons (Filip Mroz) | **CC0** | None |

`CREDITS.md` additionally records, per exercise, exactly which source clip was used, which
four are the closest available rather than an exact depiction (`flutter-kicks`, `plank`,
`leg-raises`, `superman`), and why `spine-twist` deliberately reuses another exercise's
artwork. `src/data/proDemos.ts` does the same for the Pro demonstrations, including the
seven exercises that are deliberately excluded. **Keep both documents accurate** — they are
the only record of these decisions.

### Other legal considerations

- **Health and fitness content.** Exercise instructions, calorie targets and macro splits
  are generated by formulas with no medical review. The trainer chat includes a non-medical
  disclaimer in its injury branch; no equivalent disclaimer appears on the calorie engine,
  the programs or the Saathi nutrition advice. Add one before release.
- **Simulated people.** Coaches are fictional and the app says so on the dashboard, the
  chat, both call screens and the Pro welcome. Keep those disclosures if the coaches stay
  simulated; remove them only when real coaches exist.
- **Pricing.** All prices are USD display strings with struck-through "was" values. Verify
  the discount claims and local pricing rules before charging anyone.
- **Data.** Everything is device-local, so there is currently no privacy policy surface
  beyond the "About & Privacy" row. A real backend changes that completely.

---

## Quick reference for new developers

| I want to… | Go to |
| --- | --- |
| Change what a plan unlocks | `src/lib/entitlements.ts` — one table |
| Ask "can this user…?" in a screen | `useAccess()` from `src/lib/useAccess.ts` |
| Add a screen | A new file in `src/app/` (Expo Router) |
| Add or change global state | `src/lib/store.tsx` — add the field to `AppState`, `INITIAL` and `sanitize()` |
| Add an exercise | `EXERCISES` in `src/data/program.ts`, then artwork in `src/components/glyphs.ts` |
| Add a food | `FOODS` in `src/data/foods.ts` |
| Change a coach | `TRAINERS` in `src/data/trainers.ts` |
| Add a coach workout | `TRAINER_PLANS` in `src/data/trainerPlans.ts` (ids are validated by tests) |
| Change what the coach says | `trainerReply()` in `src/data/trainerChat.ts` |
| Change what Saathi says | `reply()` in `src/app/coach.tsx` |
| Change colours, spacing or motion | `src/theme.ts` |
| Reuse a UI component | `src/components/ui.tsx` |
| Change prices | `PLAN_TIERS` in `src/data/plans.ts` |
| Understand the maths | `src/lib/calc.ts` |
| See what is tested | `src/lib/__tests__/` |
