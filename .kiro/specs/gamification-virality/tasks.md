# Implementation Plan: Gamification & Virality

## Overview

Incremental implementation of the Relationship Pet and Relationship Wrapped features. We start with the database migration and pure service logic (testable immediately), then build UI components, wire feeding integrations, and finish with the Wrapped experience. Property-based tests validate core pure functions alongside implementation.

## Tasks

- [x] 1. Install new dependencies and run database migration
  - [x] 1.1 Install `react-native-view-shot`, `expo-sharing`, and `react-native-pager-view` as project dependencies
    - Run `npx expo install react-native-view-shot expo-sharing react-native-pager-view`
    - Verify existing `lottie-react-native` remains in dependencies
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 1.2 Create Supabase migration adding pet columns to `relationships` table
    - Add `pet_name TEXT DEFAULT 'Buddy'`, `pet_health INTEGER DEFAULT 100 CHECK (0–100)`, `pet_total_xp INTEGER DEFAULT 0 CHECK (>=0)`, `pet_last_fed_at TIMESTAMPTZ DEFAULT NOW()`
    - _Requirements: 1.3_

- [x] 2. Implement petService.ts pure functions and persistence
  - [x] 2.1 Create `src/services/petService.ts` with `PetState` interface, `EvolutionStage` type, and pure functions: `decayHealth`, `getEvolutionStage`, `getPetMood`, `shouldScheduleInactivityNotification`
    - `decayHealth(currentHealth, lastFedAt, now)` → `Math.max(0, health - Math.floor(daysBetween) * 15)`
    - `getEvolutionStage(totalXp)` → egg (0–99), baby (100–499), teen (500–999), adult (1000+)
    - `getPetMood(health)` → sad if < 30, happy if >= 30
    - `shouldScheduleInactivityNotification(health, lastFedAt, now)` → true iff health === 0 AND days >= 7
    - _Requirements: 2.1, 2.2, 4.1, 5.2, 5.3, 6.1_

  - [ ]* 2.2 Write property test: Decay health formula with floor (Property 1)
    - **Property 1: Decay health formula with floor**
    - Use `fc.integer({min:0,max:100})` for health, `fc.date()` pairs where now >= lastFedAt
    - Assert `decayHealth(health, lastFedAt, now) === Math.max(0, health - Math.floor(daysBetween) * 15)`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.3 Write property test: Feeding function correctness (Property 2)
    - **Property 2: Feeding function correctness**
    - Use `fc.integer({min:0,max:100})` for health, `fc.nat()` for xp, `fc.integer({min:1,max:100})` for boosts
    - Assert `newHealth = Math.min(100, health + healthBoost)`, `newXp = xp + xpBoost`, `newLastFedAt >= oldLastFedAt`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 2.4 Write property test: Evolution stage derivation (Property 3)
    - **Property 3: Evolution stage derivation**
    - Use `fc.nat({max:5000})` for totalXp
    - Assert correct stage for each XP range
    - **Validates: Requirements 4.1**

  - [ ]* 2.5 Write property test: Pet mood derivation (Property 4)
    - **Property 4: Pet mood derivation**
    - Use `fc.integer({min:0,max:100})` for health
    - Assert sad when < 30, happy when >= 30
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 2.6 Write property test: Inactivity notification condition (Property 5)
    - **Property 5: Inactivity notification condition**
    - Use `fc.integer({min:0,max:100})` for health, `fc.date()` pairs
    - Assert true iff health === 0 AND days >= 7
    - **Validates: Requirements 6.1**

  - [x] 2.7 Implement `loadAndDecayPet(relationshipId)` — fetch pet state from Supabase, apply `decayHealth`, persist if changed, schedule notification if needed
    - Wrap notification scheduling in try/catch; silently skip if permissions denied
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

  - [x] 2.8 Implement `feedPet(relationshipId, healthBoost, xpBoost)` — increment health (capped 100) + XP, update `pet_last_fed_at`, persist to Supabase, update AppStore
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Extend AppStore with pet state
  - [x] 3.1 Add `petName`, `petHealth`, `petTotalXp`, `petLastFedAt`, and `setPetState` to `src/store/appStore.ts`
    - _Requirements: 1.1, 1.2_

- [x] 4. Checkpoint — Verify pet service logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Build RelationshipPet component and integrate into TimelineScreen
  - [x] 5.1 Add placeholder Lottie animation JSON files to `assets/animations/` (8 files: 4 stages × 2 moods)
    - `pet-egg-happy.json`, `pet-egg-sad.json`, `pet-baby-happy.json`, `pet-baby-sad.json`, `pet-teen-happy.json`, `pet-teen-sad.json`, `pet-adult-happy.json`, `pet-adult-sad.json`
    - _Requirements: 4.2, 5.1_

  - [x] 5.2 Create `src/components/RelationshipPet.tsx`
    - Render pet name text, LottieView (animation source from stage + mood), health bar (width = petHealth%, background #FF7F50)
    - Fallback to static emoji if Lottie fails to load
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.3 Modify `src/screens/TimelineScreen.tsx` to render `RelationshipPet` above `AnniversaryBanner` in `ListHeaderComponent`
    - On mount when `relationshipId` exists: call `loadAndDecayPet`, store result via `setPetState`
    - _Requirements: 1.4, 5.6_

  - [ ]* 5.4 Write unit tests for `RelationshipPet` component
    - Test rendering of pet name, health bar width, correct animation source selection based on stage/mood
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Wire feeding actions into existing screens
  - [x] 6.1 In `MemoryCreationModal`, call `feedPet(relationshipId, 20, 20)` after successful memory insert
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 In `BucketListScreen`, call `feedPet(relationshipId, 20, 20)` after item marked complete
    - _Requirements: 3.2, 3.5_

  - [x] 6.3 In `DailyQuestionCard`, call `feedPet(relationshipId, 20, 20)` after question answered
    - _Requirements: 3.3, 3.5_

  - [x] 6.4 In `TimelineScreen` `handleDoubleTap`, call `feedPet(relationshipId, 5, 5)` after like upsert
    - _Requirements: 3.4, 3.5_

- [x] 7. Checkpoint — Verify pet system end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Wrapped experience
  - [x] 8.1 Create `src/utils/wrappedUtils.ts` with `calculateProgress(activeIndex, totalCards)` pure function
    - Returns `(activeIndex + 1) / totalCards`, always in range (0, 1]
    - _Requirements: 9.1_

  - [ ]* 8.2 Write property test: Wrapped progress calculation (Property 6)
    - **Property 6: Wrapped progress calculation**
    - Use `fc.nat({max:20})` for index, `fc.integer({min:1,max:20})` for total, with index < total
    - Assert `calculateProgress(i, n) === (i + 1) / n` and result is in (0, 1]
    - **Validates: Requirements 9.1**

  - [x] 8.3 Create `src/components/SummaryExportCard.tsx`
    - Render stats summary (memory count, adventure count), "Made with WeDo" watermark, share button
    - Wrap content in `ViewShot` ref for capture
    - _Requirements: 8.1_

  - [x] 8.4 Create `src/screens/WrappedScreen.tsx` replacing `YearInReviewModal`
    - Use `PagerView` with 4 pages: IntroCard, MemoryCountCard, AdventureCountCard, SummaryExportCard
    - Fetch memory count + completed bucket list count from Supabase for past year
    - Progress bar at top updated via `onPageSelected`
    - Share flow: `viewShot.capture()` → check `Sharing.isAvailableAsync()` → `Sharing.shareAsync(uri)`
    - Handle capture failure (show error alert) and share unavailable (show unsupported message)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

  - [x] 8.5 Update `RootNavigator` to register `WrappedScreen` and remove `YearInReviewModal` route
    - Update navigation from `AnniversaryBanner` to navigate to `WrappedScreen`
    - _Requirements: 7.5_

  - [ ]* 8.6 Write unit tests for `WrappedScreen` and `SummaryExportCard`
    - Test page order (4 items in correct sequence), watermark text renders, share error/unsupported flows
    - _Requirements: 7.2, 8.1, 8.4, 8.5_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the 6 correctness properties from the design using `fast-check`
- All pet logic pure functions are in `petService.ts` for clean testability
- TypeScript is used throughout (React Native + Expo project)
