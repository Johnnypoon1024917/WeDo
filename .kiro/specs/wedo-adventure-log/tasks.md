# Implementation Plan: WeDo — The Adventure Log

## Overview

This plan implements the WeDo couples app using React Native (Expo), Supabase backend, Zustand state management, NativeWind styling, and RevenueCat for IAP. Tasks are ordered to build foundational layers first (project setup, auth, navigation), then core features (Adventure Log, Calendar, Bucket List), then premium features, and finally polish (widgets, settings). Each task builds incrementally on previous work.

## Tasks

- [x] 1. Project scaffolding, Supabase client, and Zustand store setup
  - [x] 1.1 Initialize Expo project and install core dependencies
    - Create Expo project with TypeScript template
    - Install: `@supabase/supabase-js`, `zustand`, `nativewind`, `tailwindcss`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-image-manipulator`, `expo-av`, `expo-haptics`, `expo-local-authentication`, `expo-blur`, `react-native-calendars`, `react-native-purchases` (RevenueCat), `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@react-native-async-storage/async-storage`
    - Configure NativeWind/Tailwind with the app's dark theme (Charcoal #121212 background, Soft Coral #FF7F50 accent, Teal #40E0D0 secondary)
    - _Requirements: 8.1, 8.6_

  - [x] 1.2 Configure Supabase client and create database schema
    - Create `src/lib/supabase.ts` with Supabase client initialization (URL + anon key from env)
    - Write SQL migration for all tables: `users`, `relationships`, `pairing_codes`, `memories`, `bucket_list_items`, `calendar_stickers`, `custom_stickers`
    - Apply all column constraints, foreign keys, and defaults as specified in the design data models
    - Create the `get_my_relationship_id()` helper function
    - Apply RLS policies for all tables (memories, bucket_list_items, calendar_stickers, pairing_codes)
    - Create Supabase Storage bucket `wedo-assets` with path-scoped access policies
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.6, 12.8_

  - [x] 1.3 Create Zustand store with auth, premium, and vault slices
    - Create `src/store/appStore.ts` implementing the `AppStore` interface from the design
    - Include: `user`, `session`, `relationshipId`, `partnerId`, `isPremium`, `isVaultEnabled`, `isVaultLocked`, `connectionStatus`, `relationshipStartDate`
    - Include all setter actions: `setAuth`, `clearAuth`, `setIsPremium`, `setVaultEnabled`, `setVaultLocked`, `setConnectionStatus`, `setRelationshipStartDate`
    - _Requirements: 17.2, 10.6_

  - [ ]* 1.4 Write unit tests for Zustand store
    - Test auth state transitions (set/clear)
    - Test premium flag toggling
    - Test vault lock/unlock state transitions
    - _Requirements: 17.2, 10.6_

- [x] 2. Navigation architecture
  - [x] 2.1 Implement Root Navigator with Native Stack
    - Create `src/navigation/RootNavigator.tsx` using `createNativeStackNavigator()`
    - Register screens: `OnboardingStack`, `MainTabNavigator`, `PaywallModal` (presentation: 'modal'), `AddToListModal` (presentation: 'modal')
    - Conditionally render OnboardingStack vs MainTabNavigator based on auth + pairing state from Zustand
    - After pairing, replace OnboardingStack with MainTabNavigator (no back navigation)
    - _Requirements: 18.1, 18.6, 18.7_

  - [x] 2.2 Implement MainTabNavigator with Bottom Tabs
    - Create `src/navigation/MainTabNavigator.tsx` using `createBottomTabNavigator()`
    - Configure 5 tabs: Timeline (Tab 1), Calendar (Tab 2), Bucket List (Tab 3), Connection (Tab 4), Settings (Tab 5)
    - Set outlined icons for each tab, active tab highlighted in Soft Coral (#FF7F50), inactive in muted gray
    - Set default initial route to Timeline (Tab 1)
    - Create placeholder screen components for each tab
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.10_

  - [x] 2.3 Implement OnboardingStack navigator
    - Create `src/navigation/OnboardingStack.tsx` using `createNativeStackNavigator()`
    - Register screens: SplashScreen → AuthScreen → PairingGateway
    - While user is authenticated but not paired, prevent navigation to MainTabNavigator
    - _Requirements: 18.1, 9.9_

  - [ ]* 2.4 Write unit tests for navigation conditional rendering
    - Test that unauthenticated users see OnboardingStack
    - Test that authenticated but unpaired users stay on PairingGateway
    - Test that paired users see MainTabNavigator
    - _Requirements: 18.7, 9.9_

- [x] 3. Checkpoint — Verify project scaffolding and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Onboarding and pairing flow
  - [x] 4.1 Implement SplashScreen with animated logo
    - Create `src/screens/onboarding/SplashScreen.tsx`
    - Display animated WeDo logo using react-native-reanimated
    - Auto-navigate to AuthScreen after animation completes
    - _Requirements: 9.1_

  - [x] 4.2 Implement AuthScreen with Apple, Google, and Magic Link sign-in
    - Create `src/screens/onboarding/AuthScreen.tsx`
    - Add Apple OAuth button calling `supabase.auth.signInWithOAuth({ provider: 'apple' })`
    - Add Google OAuth button calling `supabase.auth.signInWithOAuth({ provider: 'google' })`
    - Add Magic Link email input calling `supabase.auth.signInWithOtp({ email })`
    - On successful auth, navigate to PairingGateway
    - Store auth state in Zustand via `setAuth()`
    - _Requirements: 9.1, 9.2_

  - [x] 4.3 Implement PairingGateway with code generation and joining
    - Create `src/screens/onboarding/PairingGateway.tsx`
    - "Start New Adventure" button: generate a unique 6-digit alphanumeric code, insert into `pairing_codes` table, display code on screen
    - "Join Partner" button: show text input for 6-digit code, validate against `pairing_codes` table (unused, not expired)
    - On valid code submission: create `relationships` record linking both user_ids, update both users' `relationship_id`
    - On invalid/expired code: display "Invalid code — please ask your partner for a new one."
    - On success: play confetti animation (react-native-reanimated) + haptic feedback (expo-haptics), navigate to MainTabNavigator
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 4.4 Write unit tests for pairing logic
    - Test code generation produces 6-digit alphanumeric codes
    - Test invalid code rejection
    - Test successful pairing creates relationship record
    - _Requirements: 9.4, 9.6, 9.7_

- [x] 5. Privacy Vault and biometric lock
  - [x] 5.1 Implement PrivacyVaultOverlay component
    - Create `src/components/PrivacyVaultOverlay.tsx`
    - Render full-screen `BlurView` (expo-blur) when `isVaultLocked` is true in Zustand
    - Set `pointerEvents="none"` on underlying content while blur is visible
    - Listen to `AppState` changes: on `background` + vault enabled → set `isVaultLocked: true`
    - On `active` + vault locked → call `LocalAuthentication.authenticateAsync({ fallbackLabel: 'Use PIN' })`
    - On biometric success → set `isVaultLocked: false`, dismiss blur, reveal last viewed tab
    - On biometric fail → offer PIN fallback via fallbackLabel option
    - If device has no biometrics → fall back to device passcode automatically
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.8_

  - [x] 5.2 Add Privacy Vault toggle to Settings screen
    - Create `src/screens/SettingsScreen.tsx` (initial implementation with vault toggle)
    - Add toggle switch that updates `isVaultEnabled` in Zustand and persists to AsyncStorage
    - While toggle is disabled, vault does not activate on background transition
    - _Requirements: 10.6, 10.7_

  - [ ]* 5.3 Write unit tests for Privacy Vault state machine
    - Test vault activates on background when enabled
    - Test vault does not activate when disabled
    - Test unlock flow on successful biometric auth
    - _Requirements: 10.1, 10.6, 10.7_

- [x] 6. Checkpoint — Verify onboarding, pairing, and privacy vault
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. RevenueCat integration and premium entitlement
  - [x] 7.1 Implement RevenueCat service and Paywall modal
    - Create `src/services/purchaseService.ts` implementing the `PurchaseService` interface
    - Configure RevenueCat SDK on app load with API key
    - Call `Purchases.logIn(supabaseUserId)` after auth
    - Call `Purchases.getCustomerInfo()` on app load, store `isPremium` in Zustand
    - Create `src/screens/PaywallModal.tsx`: full-screen slide-up modal with product info, $4.99 lifetime price, purchase button, restore link
    - Purchase flow: call `Purchases.purchasePackage()`, on success set `isPremium: true` in Zustand
    - On purchase verification failure: display "Purchase could not be verified — please try again."
    - On `isPremium` change to true: immediately unlock all premium features without restart
    - _Requirements: 17.1, 17.2, 17.7, 17.8, 17.10_

  - [x] 7.2 Add Restore Purchases to Settings screen
    - Add "Restore Purchases" button to SettingsScreen
    - Call `Purchases.restorePurchases()`, update Zustand `isPremium` accordingly
    - If no active entitlements found: display "No previous purchase found."
    - _Requirements: 17.9, 17.11_

  - [ ]* 7.3 Write unit tests for premium entitlement logic
    - Test `isPremium` is set correctly from RevenueCat customer info
    - Test purchase success updates Zustand store
    - Test restore with no entitlements shows correct message
    - _Requirements: 17.2, 17.7, 17.11_

- [x] 8. Image compression service
  - [x] 8.1 Implement ImageCompressor service
    - Create `src/services/imageCompressor.ts` implementing the `ImageCompressor` interface
    - Use `expo-image-manipulator` to resize longest dimension to ≤1200px preserving aspect ratio
    - Compress to JPEG format with quality 0.7
    - Check output file size; if >200KB, iteratively lower quality in 0.1 steps down to 0.3
    - If still >200KB at quality 0.3, reject with message "This photo is too large to process — please choose another."
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 8.2 Write property test for image compression round-trip integrity
    - **Property 1: Round-trip integrity — compressing then uploading then downloading then displaying produces a visually equivalent image**
    - **Validates: Requirements 3.6**

  - [ ]* 8.3 Write unit tests for ImageCompressor
    - Test resize logic preserves aspect ratio
    - Test quality step-down sequence (0.7 → 0.6 → ... → 0.3 → reject)
    - Test output file size constraint (≤200KB)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Real-time subscription manager
  - [x] 9.1 Implement RealtimeManager service
    - Create `src/services/realtimeManager.ts` implementing the `RealtimeManager` interface
    - `subscribeToMemories(relationshipId, onInsert, onUpdate)`: subscribe to `memories` table changes filtered by relationship_id
    - `subscribeToStickers(relationshipId, onInsert)`: subscribe to `calendar_stickers` table inserts
    - `subscribeToBucketList(relationshipId, onInsert, onUpdate)`: subscribe to `bucket_list_items` table changes
    - `unsubscribeAll()`: clean up all active channels
    - Handle channel status events (`CHANNEL_ERROR`, `TIMED_OUT`): update Zustand `connectionStatus` to 'reconnecting', display "Reconnecting..." indicator
    - On reconnect: fetch latest data from DB to reconcile missed events using `created_at` timestamps
    - _Requirements: 6.1, 6.5, 6.6_

  - [ ]* 9.2 Write unit tests for RealtimeManager
    - Test subscription setup scoped to relationship_id
    - Test reconnection status updates in Zustand
    - Test unsubscribeAll cleans up channels
    - _Requirements: 6.1, 6.5, 6.6_

- [x] 10. Checkpoint — Verify services (compression, realtime, RevenueCat)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Adventure Log — Timeline screen and Memory Entry creation
  - [x] 11.1 Implement TimelineScreen with Adventure Log feed
    - Create `src/screens/TimelineScreen.tsx`
    - Render `FlatList` of `MemoryCard` components in reverse-chronological order, querying `memories` table filtered by `relationship_id`
    - Display each entry with compressed photo, caption text, and formatted creation timestamp
    - Apply Charcoal (#121212) background, glassmorphism card styling (semi-transparent background with blur)
    - Use Sans-Serif typeface for captions, Serif typeface for date headers
    - Use Teal (#40E0D0) for date headers and timestamps
    - Empty state: illustration with message "No adventures yet — complete a date from your Bucket List to start!"
    - Support vertical scrolling with smooth momentum
    - Activate real-time subscription via RealtimeManager on mount; animate new entries with spring animation (react-native-reanimated)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.2, 8.1, 8.2, 8.3, 8.4, 8.6_

  - [x] 11.2 Implement Memory Entry creation modal
    - Create `src/components/MemoryCreationModal.tsx`
    - Triggered when a Bucket List item is marked as completed
    - Require exactly one photo selection (device gallery or camera)
    - Require caption between 1 and 500 characters
    - On submit: compress photo via ImageCompressor, upload to Supabase Storage at `{relationship_id}/memories/{entry_id}.jpg`, create `memories` record with server-generated timestamp, `revealed: false`
    - On cancel: discard unsaved input, return to previous screen
    - On network error: display "Upload failed — please check your connection and try again", retain user input for retry
    - Use Soft Coral (#FF7F50) for the create/submit button
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.3, 8.6_

  - [ ]* 11.3 Write property test for Memory Entry data round-trip integrity
    - **Property 2: Round-trip data integrity — for all Memory_Entry records written to Supabase_DB, reading the record back returns field values identical to those written**
    - **Validates: Requirements 7.5**

  - [ ]* 11.4 Write unit tests for Memory Entry creation
    - Test photo + caption validation (caption length 1–500)
    - Test cancel discards input
    - Test network error displays retry message and retains input
    - _Requirements: 2.2, 2.3, 2.5, 2.6_

- [x] 12. Scratch-Off reveal mechanic
  - [x] 12.1 Implement ScratchOffOverlay component
    - Create `src/components/ScratchOffOverlay.tsx`
    - Render silver metallic gradient overlay positioned absolutely over the memory photo
    - Use `PanGestureHandler` to track touch coordinates; each touch-move adds circular erased regions (~20px radius) to a mask
    - Use SVG `ClipPath` or canvas-based approach to cut holes in the overlay
    - Track erased area percentage; at ≥60%, trigger auto-complete with fade-out animation (`withTiming` from reanimated)
    - On auto-complete: update `revealed: true` in Supabase DB, sync to partner via realtime
    - Haptic feedback on each touch-move event: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
    - Overlay is only interactive when `memory.created_by !== currentUserId` (partner scratches)
    - Creator always sees the photo directly without overlay
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.5_

  - [ ]* 12.2 Write unit tests for ScratchOffOverlay
    - Test overlay renders for partner (non-creator)
    - Test overlay does not render for creator
    - Test auto-complete triggers at 60% erased
    - Test revealed state persists to Supabase
    - _Requirements: 4.3, 4.5, 4.6_

- [x] 13. Audio Memory attachment (Premium)
  - [x] 13.1 Implement AudioRecorder and AudioPlayer components
    - Create `src/services/audioRecorderService.ts` implementing the `AudioRecorderService` interface
    - Record in .m4a format (MPEG4 AAC) using `expo-av` `Audio.Recording`
    - Display live duration counter and stop button during recording
    - Auto-stop at 60 seconds
    - On stop: upload .m4a to Supabase Storage at `{relationship_id}/audio/{entry_id}.m4a`, link to Memory_Entry
    - On upload failure: retain local file, display "Upload failed — tap to retry."
    - Create `src/components/AudioPlayer.tsx`: waveform visualization + play/pause button using `expo-av` `Audio.Sound`
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.4_

  - [x] 13.2 Wire premium gating for audio feature
    - On revealed Memory_Entry: show microphone icon (Soft Coral #FF7F50) if user is Premium
    - If Free_User taps microphone icon: display PaywallModal
    - Allow only one audio note per Memory_Entry
    - When audio is attached, sync waveform + play button to partner via realtime
    - _Requirements: 5.1, 5.2, 5.9, 6.4, 17.4_

  - [ ]* 13.3 Write unit tests for AudioRecorder
    - Test recording starts and stops correctly
    - Test auto-stop at 60 seconds
    - Test upload failure retains local file with retry message
    - Test only one audio note per entry
    - _Requirements: 5.5, 5.7, 5.9_

- [x] 14. Checkpoint — Verify Adventure Log (timeline, memory creation, scratch-off, audio)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Interactive Sticker Calendar
  - [x] 15.1 Implement CalendarScreen with Sticker Calendar
    - Create `src/screens/CalendarScreen.tsx`
    - Render full-screen monthly calendar using `react-native-calendars` `Calendar` component
    - Support horizontal swiping to navigate between months
    - Apply dark theme styling (Charcoal background)
    - Activate real-time subscription for `calendar_stickers` on mount
    - When a sticker record is received via realtime, display it at saved coordinates with spring entrance animation
    - _Requirements: 11.1, 11.2, 11.7_

  - [x] 15.2 Implement StickerDrawer with drag-and-drop
    - Create `src/components/StickerDrawer.tsx` as a bottom sheet
    - Include 20 default sticker images in `src/assets/stickers/`
    - Stickers are draggable via `react-native-gesture-handler`
    - On drop onto a calendar day cell: capture exact X/Y coordinates within the cell
    - Persist sticker record to `calendar_stickers` table (sticker_id, day, x_coordinate, y_coordinate, relationship_id, placed_by)
    - Allow multiple stickers on the same day cell
    - On network error: display inline error, revert sticker to drawer
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.8, 11.9_

  - [ ]* 15.3 Write property test for sticker placement round-trip integrity
    - **Property 3: Round-trip data integrity — for all sticker placements written to Supabase_DB, reading the record back returns coordinates and metadata identical to those written**
    - **Validates: Requirements 11.10**

  - [ ]* 15.4 Write unit tests for StickerDrawer
    - Test drag-and-drop captures correct coordinates
    - Test multiple stickers on same day
    - Test network error reverts sticker to drawer
    - _Requirements: 11.5, 11.8, 11.9_

- [x] 16. Shared Bucket List and Social Catcher
  - [x] 16.1 Implement BucketListScreen with real-time sync
    - Create `src/screens/BucketListScreen.tsx`
    - Render `FlatList` of `BucketListItem` components ordered by `created_at`
    - Activate real-time subscription for `bucket_list_items` on mount
    - FAB "+" button opens AddToListModal
    - Free_User: enforce max 10 items; on 11th item attempt, show PaywallModal instead of AddToListModal
    - Premium_User: unlimited items
    - Mark item as completed: update `completed` state, sync to partner via realtime
    - On completion: trigger Memory Entry creation modal
    - Header icon for Indecision Wheel navigation
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.9, 16.1, 17.3_

  - [x] 16.2 Implement AddToListModal
    - Create `src/screens/AddToListModal.tsx` as full-screen slide-up modal
    - Title input (required), optional URL field
    - On submit: persist to `bucket_list_items` table (id, relationship_id, title, url, completed: false, created_by, created_at)
    - On network error: display "Save failed — please check your connection and try again", retain input
    - _Requirements: 12.3, 12.8, 12.10_

  - [x] 16.3 Implement Social Catcher with Expo Config Plugin
    - Create Expo Config Plugin to register native intent filters
    - iOS: configure `CFBundleURLTypes` and share extension entries in `app.json`
    - Android: configure `intentFilters` with `action: "android.intent.action.SEND"`, `category: "android.intent.category.DEFAULT"`, `data: { mimeType: "text/plain" }`
    - Handle incoming URLs via `Linking.getInitialURL()` and `Linking.addEventListener('url')`
    - Parse shared URL and navigate to AddToListModal with URL pre-populated
    - _Requirements: 12.6, 12.7_

  - [ ]* 16.4 Write unit tests for Bucket List
    - Test free user 10-item cap enforcement
    - Test premium user unlimited items
    - Test item completion triggers memory creation modal
    - Test Social Catcher URL pre-population
    - _Requirements: 12.4, 12.5, 16.1_

- [x] 17. Indecision Wheel
  - [x] 17.1 Implement WheelScreen with physics-based roulette
    - Create `src/screens/WheelScreen.tsx`, pushed onto Root stack from Bucket List header icon
    - Render circular wheel segments using `react-native-reanimated` with rotation transforms, each labeled with an uncompleted bucket list item title
    - Spin gesture via `PanGestureHandler`: derive initial angular velocity from gesture velocity
    - Deceleration animation using `withDecay`; final resting angle determines selected item
    - Selection logic: `selectedIndex = Math.floor((finalAngle % 360) / segmentAngle)`
    - On land: strong haptic feedback `Haptics.notificationAsync(NotificationFeedbackType.Success)`
    - On land: send push notification to partner with selected item title (via Expo Push Notifications or Supabase Edge Function)
    - Display selected item prominently with option to mark as completed
    - Empty state: "Add some ideas to your Bucket List first!" with spin disabled
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 18.9_

  - [ ]* 17.2 Write unit tests for Indecision Wheel
    - Test wheel populates with uncompleted items only
    - Test empty state when no uncompleted items
    - Test selection logic maps angle to correct segment
    - _Requirements: 13.2, 13.6_

- [x] 18. Checkpoint — Verify Calendar, Bucket List, Social Catcher, and Wheel
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Deep Connection Conversation Deck (Premium)
  - [x] 19.1 Create conversation prompts JSON and implement ConnectionScreen
    - Create `src/assets/deep_questions.json` with 300+ conversation starter prompts (each with id, category, prompt)
    - Create `src/screens/ConnectionScreen.tsx`
    - On mount: load prompts from local JSON, shuffle using Fisher-Yates algorithm
    - Render swipeable/tap-to-flip cards using `react-native-reanimated`
    - Premium_User: full access to swipe through all cards
    - Free_User: display single preview card (`shuffled[0]`) followed by a locked card with "Lock" icon
    - When Free_User taps locked card: display PaywallModal
    - No remote data fetching — all data from local JSON
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 17.5_

  - [ ]* 19.2 Write unit tests for Conversation Deck
    - Test Fisher-Yates shuffle produces valid permutation
    - Test free user sees only 1 preview + locked card
    - Test premium user can access all cards
    - _Requirements: 15.3, 15.5, 15.6_

- [x] 20. Custom Stickers (Premium)
  - [x] 20.1 Add Custom Photo tab to StickerDrawer
    - Add "Custom Photo" tab to StickerDrawer (visible only for Premium_User)
    - Allow photo selection from device gallery, crop to square
    - Upload cropped image to Supabase Storage at `{relationship_id}/stickers/{sticker_id}.jpg`
    - Custom sticker is draggable onto calendar using same drag-and-drop mechanic as default stickers
    - Free_User: hide "Custom Photo" tab; if user taps where tab would appear, show PaywallModal
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 17.6_

  - [ ]* 20.2 Write unit tests for Custom Stickers
    - Test custom sticker upload and storage path
    - Test free user cannot access custom photo tab
    - Test custom sticker drag-and-drop works like default stickers
    - _Requirements: 16.4, 16.5, 16.6_

- [x] 21. Home Screen Widgets
  - [x] 21.1 Implement widget data bridge (React Native → local storage)
    - On app foreground: fetch `relationships.start_date` from Supabase DB
    - Write `{ startDate, isPremium }` to AsyncStorage and to iOS App Group (`UserDefaults(suiteName: "group.com.wedo.app")`) / Android SharedPreferences
    - Trigger widget refresh: iOS `WidgetCenter.shared.reloadAllTimelines()`, Android `AppWidgetManager.updateAppWidget()`
    - _Requirements: 14.3, 14.5_

  - [x] 21.2 Implement iOS Home Screen Widget (SwiftUI/WidgetKit)
    - Create SwiftUI widget extension reading from App Group UserDefaults
    - Timeline provider returns single entry, refreshed on app foreground
    - Display "X Days Together" counter where X = today - startDate
    - Default theme for free users; premium themes (additional color schemes/layouts) for premium users
    - _Requirements: 14.1, 14.4, 14.6, 14.7_

  - [x] 21.3 Implement Android Home Screen Widget
    - Create `AppWidgetProvider` reading from SharedPreferences
    - `RemoteViews` renders "X Days Together" counter text
    - Widget updated via `AppWidgetManager.updateAppWidget()` triggered from React Native bridge
    - Default theme for free users; premium themes for premium users
    - _Requirements: 14.2, 14.4, 14.6, 14.7_

  - [ ]* 21.4 Write unit tests for widget data bridge
    - Test correct days calculation from start date
    - Test data written to shared storage matches Supabase data
    - _Requirements: 14.4, 14.5_

- [x] 22. Settings screen completion
  - [x] 22.1 Complete SettingsScreen with all sections
    - Finalize `src/screens/SettingsScreen.tsx` with all sections:
    - User profile display and Partner info
    - Privacy Vault toggle (already wired in task 5.2)
    - Theme selector
    - Subscription management: show premium status, Restore Purchases button (already wired in task 7.2)
    - Home Screen Widget installation instructions for iOS and Android
    - App preferences
    - _Requirements: 14.8, 16.8, 18.8_

- [x] 23. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at natural breakpoints
- Property tests validate universal correctness properties (data round-trip integrity)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation tasks use TypeScript/React Native
- Real-time subscriptions are activated per-screen on mount and cleaned up on unmount via RealtimeManager
