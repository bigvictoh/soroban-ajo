# Contribution Streak Tracker

## Overview

Tracks consecutive on-time contributions with a visual calendar, milestone celebrations, and animated indicators. Built to integrate with the existing gamification system (`UserGamification` model, `/api/gamification/stats` endpoint).

---

## Files Created

### `src/hooks/useStreak.ts`

Core data hook. Fetches streak and contribution history, computes milestones, and caches results for 3 minutes.

- When `authenticated: true` — calls `/api/gamification/stats` and `/api/contributions` in parallel using `backendApiClient`
- When unauthenticated — generates deterministic mock data seeded by wallet address
- Falls back to mock data on API error
- Exposes `refresh()` to bust the cache and re-fetch

**Returned values:**

| Field | Type | Description |
|---|---|---|
| `currentStreak` | `number` | Days in the current consecutive streak |
| `longestStreak` | `number` | All-time best streak |
| `totalContributions` | `number` | Total contributions made |
| `lastContribution` | `string \| null` | ISO timestamp of last contribution |
| `history` | `StreakDay[]` | 90-day window of contribution activity |
| `milestones` | `StreakMilestoneData[]` | Progress toward 3/7/14/30/60/90-day milestones |
| `loading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Error message if fetch failed |
| `refresh` | `() => void` | Clears cache and re-fetches |

---

### `src/components/streaks/StreakTracker.tsx`

Main orchestrator component. Composes the header, calendar, and milestones into a single view.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `walletAddress` | `string` | — | User's wallet address |
| `authenticated` | `boolean` | `false` | Whether to fetch real API data |
| `className` | `string` | — | Additional Tailwind classes |

**Features:**
- Gradient header card with animated streak counter (spring animation on value change)
- Flame indicator that scales with streak intensity (✨ low, ⚡ medium, 🔥 high)
- Longest streak and total contributions stat pills
- Retry button shown when API falls back to cached/mock data
- `StreakMilestoneCelebration` overlay triggered once per milestone via `AnimatePresence`
- Full skeleton loading state

**Usage:**
```tsx
<StreakTracker walletAddress={address} authenticated={isAuthenticated} />
```

---

### `src/components/streaks/StreakCalendar.tsx`

Interactive monthly calendar showing contribution activity.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `history` | `StreakDay[]` | 90-day history from `useStreak` |
| `month` | `Date` | Optional initial month (defaults to current) |

**Features:**
- Prev/next month navigation
- Color-coded days: green = contributed, gray = missed, ring = today
- Staggered entry animation per day cell (8ms delay each)
- Correct weekday alignment via `date-fns` `getDay`
- Full ARIA grid roles and labels for accessibility

---

### `src/components/streaks/StreakMilestone.tsx`

Two exported components:

**`StreakMilestone`** — individual milestone card

| Prop | Type | Description |
|---|---|---|
| `milestone` | `StreakMilestoneData` | Milestone data from `useStreak` |
| `currentStreak` | `number` | Current streak for progress calculation |
| `index` | `number` | Used for staggered animation delay |

- Reached milestones: amber gradient + shimmer sweep animation
- Next milestone: indigo gradient + animated progress bar
- Future milestones: muted surface style
- Emoji icons per milestone tier: 🌱 → 🔥 → ⚡ → 🏆 → 💎 → 👑

**`StreakMilestoneCelebration`** — full-screen modal overlay

| Prop | Type | Description |
|---|---|---|
| `milestone` | `StreakMilestoneData` | The milestone that was reached |
| `onDismiss` | `() => void` | Called when user dismisses |

- Spring-animated modal with backdrop blur
- Bouncing emoji animation on entry
- Dismisses on backdrop click or button press

---

## Milestone Tiers

| Days | Label | Icon |
|---|---|---|
| 3 | Getting Started | 🌱 |
| 7 | One Week Strong | 🔥 |
| 14 | Two Week Warrior | ⚡ |
| 30 | Monthly Master | 🏆 |
| 60 | Two Month Champion | 💎 |
| 90 | Quarter Legend | 👑 |

---

## Backend Integration

The hook reads from two existing endpoints:

- `GET /api/gamification/stats` — returns `contributionStreak` and `lastContribution` from `UserGamification`
- `GET /api/contributions` — returns contribution records with `createdAt` timestamps

The `contributionStreak` field is maintained by `StreakService.updateContributionStreak()` which is called automatically by `GamificationService.handleContribution()` on every contribution event. No backend changes were needed.

---

## Dependencies Used

All already present in `package.json`:

- `framer-motion` — animations
- `date-fns` — calendar date math
- `clsx` — conditional class names
- `zustand` / React state — local UI state
- `backendApiClient` — authenticated API calls
