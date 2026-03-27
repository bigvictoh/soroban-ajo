# Issue #397: Create Mobile App (React Native)

## Overview
Build a production-ready React Native mobile app for iOS and Android that integrates with the existing Ajo backend and Soroban smart contract flows. The mobile app should support core savings-group workflows, real-time updates, and secure wallet-aware authentication.

## Objectives
- Deliver a native mobile client for iOS and Android from a single React Native codebase.
- Reuse existing backend APIs and business rules where possible.
- Provide an excellent mobile-first UX for core user journeys.
- Support offline-friendly behavior for read paths and safe retry for write operations.
- Maintain security parity with the web app (auth, token handling, data protection).

## Scope
### In Scope (MVP)
- Authentication and session management.
- Groups listing, details, membership, and contribution actions.
- Transaction history and contribution timeline/calendar view.
- Notifications center and unread state.
- Basic profile/settings.
- Deep links for group invites.
- Analytics and crash monitoring.

### Out of Scope (Phase 2+)
- Full chat parity if backend/mobile push strategy is not finalized.
- Advanced onboarding experiments.
- Non-essential admin features.

## Product Requirements
- Platform support: iOS (latest 2 major versions), Android (API 26+).
- Performance:
  - Cold start target: under 3.0s on mid-tier Android.
  - Primary screen transitions: under 300ms perceived latency.
- Accessibility:
  - Screen reader labels on all controls.
  - Keyboard and switch-access navigability where applicable.
- Reliability:
  - App must gracefully handle intermittent network.
  - Retry strategy with exponential backoff for transient failures.

## Proposed Tech Stack
- React Native with Expo (managed workflow) for rapid cross-platform delivery.
- TypeScript for strict typing.
- React Navigation for routing.
- TanStack Query for server state and cache.
- Zustand for lightweight client state.
- Axios for networking.
- date-fns for date and timezone-safe formatting.
- react-native-mmkv or secure storage combo for token/session storage.
- Expo Notifications / FCM / APNs for push notifications.
- Sentry for crash/error monitoring.

## Architecture
### App Layers
- Presentation Layer: screens/components with platform-adaptive UI.
- Domain Layer: hooks/use-cases for feature logic.
- Data Layer: API clients, DTO mapping, cache/persistence adapters.
- Platform Layer: push notifications, deep links, secure storage, biometrics (optional).

### Data Flow
1. Screen action triggers domain hook.
2. Hook calls API/contract service via TanStack Query mutation or query.
3. API responses are normalized into mobile domain models.
4. Query cache updates UI immediately and persists critical snapshots for offline display.

## Suggested Repository Structure
Create a new top-level mobile workspace:

```text
mobile/
  app/
    src/
      components/
      screens/
      navigation/
      hooks/
      services/
      store/
      utils/
      types/
      constants/
    assets/
    app.json
    package.json
    tsconfig.json
```

## API Integration Plan
- Reuse existing backend endpoints for auth, groups, contributions, transactions, and notifications.
- Define a mobile API client with:
  - request/response typing,
  - auth interceptor,
  - retry and timeout policies,
  - consistent error mapping to user-friendly states.
- Add API compatibility checks in CI using mocked responses from backend contracts.

## Authentication and Security
- Use wallet-linked login flow consistent with current backend expectations.
- Store access/refresh tokens in secure storage (never AsyncStorage for secrets alone).
- Implement silent token refresh and session invalidation.
- Protect sensitive screens behind auth guards.
- Add jailbreak/root detection as a hardening follow-up task.

## Offline and Sync Strategy
- Read-through cache for groups, transactions, and profile data.
- Queue write intents (contribute/join) only when safe and idempotent.
- Surface sync state to user: Pending, Synced, Failed.
- Use deterministic idempotency keys for mutation retries.

## Calendar and Timeline Experience
- Add monthly contribution calendar view in mobile detail screen.
- Color coding:
  - paid,
  - pending,
  - late,
  - missed.
- Day detail sheet with amount, member context, and transaction status.
- Export/subscribe calendar follow-up via backend-generated ICS endpoint if needed.

## Notifications and Real-Time
- Push categories:
  - contribution due reminders,
  - successful contribution confirmations,
  - payout events,
  - group activity highlights.
- Optional socket polling fallback if persistent websocket is not stable on backgrounded apps.

## Observability
- Add Sentry (errors, stack traces, release health).
- Add analytics events for key funnel steps:
  - app_open,
  - login_success,
  - contribution_initiated,
  - contribution_success,
  - invite_opened.
- Add feature flags for staged rollout.

## Testing Strategy
### Unit Tests
- Hooks, reducers/store, date helpers, API mappers.

### Component Tests
- Critical screens and state transitions (loading, error, empty, success).

### Integration Tests
- Auth flow, group join, contribution flow, transaction list refresh.

### E2E Tests
- Use Detox/Appium for smoke paths on iOS and Android CI runners.

### Non-Functional
- Performance baseline test on low/medium devices.
- Accessibility audit pass for major screens.

## CI/CD and Release
- Add mobile CI pipeline:
  - lint,
  - type-check,
  - unit/component tests,
  - build validation for iOS/Android.
- Use EAS Build for signed artifacts.
- Rollout strategy:
  - internal QA,
  - closed beta,
  - phased production rollout.

## Delivery Plan
### Phase 0: Foundations (Week 1)
- Bootstrap mobile app workspace.
- Configure navigation, theming, env management, secure storage.
- Set up CI and crash reporting.

### Phase 1: Core User Flows (Week 2-3)
- Auth/session flow.
- Group listing and detail screens.
- Join and contribution mutations.

### Phase 2: History + Calendar + Notifications (Week 4)
- Transaction history and contribution calendar.
- Push notification integration.
- Deep link invites.

### Phase 3: Hardening and Launch Prep (Week 5)
- E2E coverage, performance tuning, accessibility fixes.
- Beta release and feedback loop.

## Risks and Mitigations
- Wallet interaction differences on mobile:
  - Mitigation: abstraction layer and early POC with target wallet providers.
- Network instability and transaction reliability:
  - Mitigation: idempotent retries and explicit sync states.
- Scope creep from web parity pressure:
  - Mitigation: MVP scope lock and feature flagging.

## Acceptance Criteria
- Mobile app builds and runs on iOS and Android.
- User can authenticate, view groups, join group, contribute, and view transaction history.
- Calendar/timeline for contribution activity is available and readable.
- Notifications arrive for at least contribution and payout events.
- Core flows have automated tests and pass CI.
- Crash monitoring and analytics are active in non-local environments.

## Branch
- Working branch for this issue: `feature/mobile-app-react-native-397`
