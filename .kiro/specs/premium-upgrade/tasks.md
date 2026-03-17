# Implementation Plan: Premium Upgrade

## Overview

Incremental implementation of the Premium Upgrade feature across five areas: Calendar enhancements, Timeline interactivity, Bucket List map view, Global UI polish, and Conversation Deck streaks. Each task builds on previous steps, wiring components into the existing React Native / Expo + Supabase architecture.

## Tasks

- [x] 1. Install new dependencies and extend type definitions
  - [x] 1.1 Install required packages: `expo-calendar`, `react-native-maps`, `react-native-google-places-autocomplete`, `lottie-react-native`, `expo-linear-gradient`, `fast-check` (dev)
    - Run `npx expo install` for Expo-compatible packages and `npm install --save-dev fast-check` for testing
    - _Requirements: 3.1, 7.3, 8.1, 11.1, 10.2, 12.1_
  - [x] 1.2 Extend `BucketListItem` interface in `src/services/realtimeManager.ts` with `latitude`, `longitude`, `place_name` fields
    - Add `latitude: number | null`, `longitude: number | null`, `place_name: string | null`
    - _Requirements: 8.3, 8.4_
  - [x] 1.3 Update `RootStackParamList` in `src/navigation/RootNavigator.ts` with `MemoryDetailScreen` and `YearInReviewModal` routes
    - _Requirements: 4.1_

- [x] 2. Implement Calendar Screen enhancements
  - [x] 2.1 Create `MonthYearPicker` component (`src/components/MonthYearPicker.tsx`)
    - Bottom-sheet modal with scrollable month (Jan–Dec) and year picker wheels
    - Props: `visible`, `currentMonth`, `onSelect(month, year)`, `onDismiss()`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 2.2 Write property test for MonthYearPicker navigation
    - **Property 1: Month/Year Picker Navigation**
    - **Validates: Requirements 1.3**
  - [ ]* 2.3 Write property test for MonthYearPicker dismiss
    - **Property 2: Month/Year Picker Dismiss Preserves State**
    - **Validates: Requirements 1.4**
  - [x] 2.4 Replace `<Calendar />` with `<CalendarList />` in CalendarScreen
    - Configure `horizontal={true}`, `pagingEnabled={true}`
    - Make header month/year text a `Pressable` that opens `MonthYearPicker`
    - Wire `onVisibleMonthsChange` to update header text
    - Retain existing `dayComponent` renderer for stickers, notes, events
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.5 Write property test for swipe navigation direction
    - **Property 3: Swipe Navigation Direction**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Implement Device Calendar Sync (Premium)
  - [x] 3.1 Create `DeviceCalendarService` (`src/services/deviceCalendarService.ts`)
    - `requestPermissions(): Promise<boolean>`
    - `syncEventToDevice(event: { title, date, time }): Promise<{ success: boolean, error?: string }>`
    - Handle permission denial, write failure, and missing default calendar
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Add "Sync to Device Calendar" toggle to `AddEventModal`
    - Toggle visible only when `isPremium === true` from appStore
    - On save with toggle enabled: request permissions if needed, then sync via `DeviceCalendarService`
    - Show informational message on permission denial, error toast on sync failure
    - _Requirements: 3.1, 3.4, 3.5, 3.6_
  - [ ]* 3.3 Write property test for premium gate on sync toggle
    - **Property 4: Premium Gate for Device Calendar Sync Toggle**
    - **Validates: Requirements 3.6**
  - [ ]* 3.4 Write property test for device calendar sync round trip
    - **Property 5: Device Calendar Sync Round Trip**
    - **Validates: Requirements 3.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Timeline enhancements
  - [x] 5.1 Create `MemoryDetailScreen` (`src/screens/MemoryDetailScreen.tsx`)
    - Register as stack screen in RootNavigator
    - Receive `memory` param, render full-screen photo, caption with `FadeInDown`, audio player if `audio_url` exists
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 5.2 Write property test for memory detail field display
    - **Property 6: Memory Detail Displays All Fields**
    - **Validates: Requirements 4.2**
  - [x] 5.3 Add shared element transitions between MemoryCard and MemoryDetailScreen
    - Add `sharedTransitionTag={`memory-photo-${item.id}`}` to MemoryCard photo
    - Add matching tag to MemoryDetailScreen photo
    - Caption uses `FadeInDown` entering animation
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 5.4 Write property test for shared transition tag consistency
    - **Property 7: Shared Transition Tag Consistency**
    - **Validates: Requirements 5.1**

- [x] 6. Implement Anniversary Banner and Year-in-Review
  - [x] 6.1 Create anniversary window calculation utility (`src/utils/anniversaryUtils.ts`)
    - Pure function: `isWithinAnniversaryWindow(startDate: Date, currentDate: Date): boolean`
    - Returns true if current date is within ±7 days of yearly anniversary
    - _Requirements: 6.2, 6.5_
  - [ ]* 6.2 Write property test for anniversary window calculation
    - **Property 8: Anniversary Window Calculation**
    - **Validates: Requirements 6.2, 6.5**
  - [x] 6.3 Create `AnniversaryBanner` component (`src/components/AnniversaryBanner.tsx`)
    - Reads `relationshipStartDate` from appStore
    - Renders glowing banner with pulsing animation when within anniversary window
    - `onPress` opens `YearInReviewModal`
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 6.4 Create `YearInReviewModal` screen (`src/screens/YearInReviewModal.tsx`)
    - Instagram-Story-style paginated format using horizontal FlatList
    - Pages: total memories, total bucket list items completed, total calendar events (past year)
    - Fetch aggregate data from Supabase on mount
    - Register in RootNavigator
    - _Requirements: 6.3, 6.4_
  - [ ]* 6.5 Write property test for year-in-review statistics accuracy
    - **Property 9: Year-in-Review Statistics Accuracy**
    - **Validates: Requirements 6.4**
  - [x] 6.6 Wire `AnniversaryBanner` into TimelineScreen at top of feed
    - _Requirements: 6.2, 6.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Bucket List Map View
  - [x] 8.1 Create `SegmentedControl` component (`src/components/SegmentedControl.tsx`)
    - Two-option toggle: "List" / "Map"
    - Props: `selectedIndex`, `onChange(index)`
    - _Requirements: 7.1, 7.4_
  - [ ]* 8.2 Write property test for segment view switching
    - **Property 10: Segment View Switching**
    - **Validates: Requirements 7.2, 7.3**
  - [x] 8.3 Create `BucketListMapView` component (`src/components/BucketListMapView.tsx`)
    - Uses `react-native-maps` `<MapView>` with custom markers
    - Filter: show pins only for uncompleted items with non-null lat/lng
    - _Requirements: 9.1, 9.2_
  - [ ]* 8.4 Write property test for map pin visibility filtering
    - **Property 13: Map Pin Visibility**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 8.5 Create `PinPreviewModal` component (`src/components/PinPreviewModal.tsx`)
    - Shows bucket list item title and place name on marker press
    - Dismiss returns to map at same position/zoom
    - _Requirements: 9.3, 9.4_
  - [x] 8.6 Wire `SegmentedControl`, `BucketListMapView`, and `PinPreviewModal` into `BucketListScreen`
    - Default to "List" (index 0) on mount
    - Toggle between FlatList and MapView based on selected segment
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9. Implement Bucket List Location Data
  - [x] 9.1 Add `LocationSearch` component to `AddToListModal` (`src/components/LocationSearch.tsx`)
    - Uses `react-native-google-places-autocomplete`
    - Stores `place_name`, `latitude`, `longitude` in form state
    - Location is optional
    - _Requirements: 8.1, 8.2, 8.4_
  - [ ]* 9.2 Write property test for location selection storing all fields
    - **Property 12: Location Selection Stores All Fields**
    - **Validates: Requirements 8.2**   
  - [x] 9.3 Wire `LocationSearch` into `AddToListModal` and persist location fields on save
    - Persist `latitude`, `longitude`, `place_name` to `bucket_list_items` table
    - _Requirements: 8.3, 8.4_
  - [ ]* 9.4 Write property test for location data persistence round trip
    - **Property 11: Location Data Persistence Round Trip**
    - **Validates: Requirements 8.3, 8.4**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Global UI Components
  - [x] 11.1 Create `SkeletonCard` component (`src/components/SkeletonCard.tsx`)
    - Shimmer animation using `expo-linear-gradient` + `react-native-reanimated`
    - Configurable shape prop: `'card' | 'row' | 'circle'`
    - _Requirements: 10.1, 10.2_
  - [ ]* 11.2 Write property test for skeleton-to-content transition
    - **Property 14: Skeleton-to-Content Transition**
    - **Validates: Requirements 10.3**
  - [x] 11.3 Replace text-based loading indicators with `SkeletonCard` on Timeline, Calendar, BucketList, and Connection screens
    - _Requirements: 10.1, 10.3_
  - [x] 11.4 Create `LottieOverlay` component (`src/components/LottieOverlay.tsx`)
    - Wraps `lottie-react-native` `<LottieView>`
    - Plays neon checkmark + confetti animation once, auto-removes after finish
    - `pointerEvents="none"` to avoid blocking interaction
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 11.5 Wire `LottieOverlay` into `BucketListScreen` on item completion
    - Trigger animation when `handleToggleComplete` marks an item as completed
    - _Requirements: 11.1_
  - [x] 11.6 Create `MeshGradient` component (`src/components/MeshGradient.tsx`)
    - Animated gradient using `expo-linear-gradient` + `react-native-reanimated`
    - Slow-moving color transitions that loop continuously
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 11.7 Apply `MeshGradient` to SplashScreen and PaywallModal backgrounds
    - Replace solid `#121212` backgrounds
    - _Requirements: 12.1, 12.2_

- [x] 12. Implement Conversation Deck Streaks
  - [x] 12.1 Create `DailyQuestionService` (`src/services/dailyQuestionService.ts`)
    - Deterministic selection: `index = daysSinceEpoch % totalQuestions`
    - Exports `getDailyQuestion(date: Date): Prompt`
    - Loads from existing `deep_questions.json`
    - _Requirements: 13.1, 13.3, 13.4_
  - [ ]* 12.2 Write property test for daily question determinism
    - **Property 15: Daily Question Determinism**
    - **Validates: Requirements 13.1, 13.4**
  - [x] 12.3 Create `StreakService` (`src/services/streakService.ts`)
    - `getStreak(relationshipId): Promise<StreakData>`
    - `markDiscussed(relationshipId, userId): Promise<void>`
    - Streak increments only when both partners discuss on same calendar day
    - Streak resets to 0 if a day is missed
    - Use Supabase RPC/transaction for atomic streak increment
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [ ]* 12.4 Write property test for streak increment on both partners completing
    - **Property 16: Streak Increment on Both Partners Completing**
    - **Validates: Requirements 14.2**
  - [ ]* 12.5 Write property test for streak reset on missed day
    - **Property 17: Streak Reset on Missed Day**
    - **Validates: Requirements 14.3**
  - [ ]* 12.6 Write property test for streak increment idempotence
    - **Property 18: Streak Increment Idempotence**
    - **Validates: Requirements 14.4**
  - [x] 12.7 Create `StreakCounter` component (`src/components/StreakCounter.tsx`)
    - Displays 🔥 icon + current streak count
    - Dimmed style when streak is 0, bright/active when > 0
    - Subscribes to Supabase realtime on `daily_streaks` table
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [ ]* 12.8 Write property test for streak counter visual style
    - **Property 19: Streak Counter Visual Style**
    - **Validates: Requirements 15.2, 15.3**
  - [x] 12.9 Create `DailyQuestionCard` component and wire into `ConnectionScreen`
    - Display daily question in visually distinct card at top of screen
    - Add `StreakCounter` at top of ConnectionScreen
    - Add "Mark as Discussed" button that calls `StreakService.markDiscussed`
    - Update daily question at midnight UTC
    - _Requirements: 13.1, 13.2, 13.3, 15.1_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` library with minimum 100 iterations per property
- Checkpoints ensure incremental validation across the five feature areas
- All Supabase mutations follow the existing optimistic update + rollback pattern
