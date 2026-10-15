# Fitora — Phase 1 UX demo

Clickable Expo prototype combining a HealthifyMe-style nutrition experience (calorie budget, food diary, Snap, Saathi AI coach, premium plans) with a "Six Pack in 30 Days"-style training experience (30-day plans, guided player, streaks, reports).

Local-only: no backend, no real auth or payments. All data is mock data stored on the device (AsyncStorage).

## Run

```bash
npm install
npx expo start --ios       # iOS simulator (Expo Go)
npx expo start --android   # Android emulator (Expo Go)
```

Or scan the QR code from `npx expo start` with Expo Go on a phone.

## Demo tips

- Any 10-digit phone number and any 4-digit OTP work; "Continue with Google" skips straight in.
- After onboarding, the app opens on the dashboard on every launch.
- Me → Demo controls → **Restart onboarding** or **Reset all demo data** to run the demo again.

## Structure

- `src/app/` — Expo Router screens (`(tabs)/`: Home, Training, Reports, Me)
- `src/components/` — shared UI kit (`ui.tsx`) and feature components
- `src/data/` — mock foods, workouts, 30-day programs, plans
- `src/lib/` — app state (`store.tsx`) and calculations (`calc.ts`)
