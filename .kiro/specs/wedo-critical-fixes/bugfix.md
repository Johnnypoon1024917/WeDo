# Bugfix & Feature Requirements Document

## Introduction

The WeDo React Native Expo app has four critical bugs that prevent core features from functioning: (1) the Android home screen widget crashes at runtime because required XML resource files are missing, and the iOS widget extension lacks proper Xcode project configuration from the Expo config plugin; (2) spinning the "Indecision Wheel" silently fails to notify the partner because the `notifications` table does not exist in the database; (3) uploaded photos, custom stickers, and audio recordings produce broken URLs because the `wedo-assets` storage bucket is private yet the code calls `getPublicUrl()`; (4) new users who sign in via Supabase Auth cannot be found in the `public.users` table because no trigger copies them from `auth.users`, causing the pairing and relationship flows to fail.

In addition to these bugfixes, the app requires a comprehensive set of new features across all five tabs (Timeline, Calendar, Bucket List, Connection, Settings), a shared timetable system, multi-language support (i18n), and updated settings for pairing/unpairing logic.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Android widget (`WeDoDaysWidget`) attempts to inflate its layout THEN the system crashes with a resource-not-found error because `R.layout.widget_days_together`, `R.id.widget_days_count`, `R.id.widget_days_label`, `R.id.widget_background`, and `R.id.widget_heart` do not exist (no `res/xml/wedo_days_widget_info.xml` or `res/layout/widget_days_together.xml` files are present)

1.2 WHEN the Expo prebuild runs the `withWidgetBridge` config plugin for iOS THEN the system does not generate the widget extension target, bundle identifier, Info.plist, or entitlements in the Xcode project, so the `WeDoDaysWidget` extension is never built or embedded in the app bundle

1.3 WHEN the wheel lands on a bucket list item in `WheelScreen.tsx` and `notifyPartner()` calls `supabase.from('notifications').insert({...})` THEN the system returns a database error (relation "notifications" does not exist) and the partner is never notified

1.4 WHEN `MemoryCreationModal.tsx` uploads a photo and calls `supabase.storage.from('wedo-assets').getPublicUrl(storagePath)` THEN the returned URL is inaccessible because the `wedo-assets` bucket is created with `public: false`, resulting in a broken image

1.5 WHEN `StickerDrawer.tsx` uploads a custom sticker and calls `supabase.storage.from('wedo-assets').getPublicUrl(storagePath)` THEN the returned URL is inaccessible because the bucket is private, resulting in a broken sticker image

1.6 WHEN `audioRecorderService.ts` uploads an audio recording and calls `supabase.storage.from('wedo-assets').getPublicUrl(storagePath)` THEN the returned URL is inaccessible because the bucket is private, resulting in broken audio playback

1.7 WHEN a new user signs in via Supabase Auth (OAuth or magic link) and `AuthScreen.tsx` queries `supabase.from('users').select('relationship_id').eq('id', session.user.id).single()` THEN the query returns no rows because no trigger copies the new user from `auth.users` to `public.users`, causing the onboarding flow to fail or behave unpredictably

1.8 WHEN `PairingGateway.tsx` attempts to update `relationship_id` on both users via `supabase.from('users').update({...}).eq('id', userId)` THEN the update silently affects zero rows for any user whose record was never inserted into `public.users`, leaving the relationship unlinked

### Expected Behavior (Correct)

2.1 WHEN the Android widget inflates its layout THEN the system SHALL successfully resolve `R.layout.widget_days_together` and all referenced view IDs (`widget_days_count`, `widget_days_label`, `widget_background`, `widget_heart`) from properly generated XML resource files (`res/xml/wedo_days_widget_info.xml` and `res/layout/widget_days_together.xml`)

2.2 WHEN the Expo prebuild runs the `withWidgetBridge` config plugin for iOS THEN the system SHALL configure the `WeDoDaysWidget` extension target in the Xcode project with the correct bundle identifier, Info.plist, App Group entitlement, and embed the widget extension in the app bundle

2.3 WHEN the wheel lands on a bucket list item and `notifyPartner()` is called THEN the system SHALL successfully insert a record into the `notifications` table with columns `id`, `relationship_id`, `recipient_id`, `sender_id`, `type`, `title`, `body`, `read` (default false), and `created_at`, and the partner SHALL be able to receive the notification via realtime subscription

2.4 WHEN `MemoryCreationModal.tsx` calls `getPublicUrl()` on an uploaded photo THEN the system SHALL return an accessible public URL because the `wedo-assets` bucket is configured with `public: true`

2.5 WHEN `StickerDrawer.tsx` calls `getPublicUrl()` on an uploaded custom sticker THEN the system SHALL return an accessible public URL because the `wedo-assets` bucket is configured with `public: true`

2.6 WHEN `audioRecorderService.ts` calls `getPublicUrl()` on an uploaded audio recording THEN the system SHALL return an accessible public URL because the `wedo-assets` bucket is configured with `public: true`

2.7 WHEN a new user signs in via Supabase Auth THEN the system SHALL automatically create a corresponding row in `public.users` (with `id`, `email`, and `created_at` from `auth.users`) via a PostgreSQL trigger function `handle_new_user()` that fires on INSERT to `auth.users`

2.8 WHEN `PairingGateway.tsx` updates `relationship_id` on both users THEN the system SHALL successfully update the rows because both users already exist in `public.users` thanks to the auth trigger

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the iOS widget extension reads data from `UserDefaults(suiteName: "group.com.wedo.app")` THEN the system SHALL CONTINUE TO correctly display the "Days Together" count using the existing `WidgetData.load()` and `DaysTogetherProvider` logic

3.2 WHEN the Android `WidgetBridgeModule` writes to `SharedPreferences` and triggers `WeDoDaysWidget.updateWidgets()` THEN the system SHALL CONTINUE TO pass data correctly between the React Native bridge and the native widget code

3.3 WHEN existing bucket list items are fetched, created, updated, or deleted THEN the system SHALL CONTINUE TO work correctly with the existing `bucket_list_items` table and RLS policies

3.4 WHEN authenticated users upload files to the `wedo-assets` bucket with a path prefixed by their `relationship_id` THEN the existing RLS storage policies (read, write, update, delete scoped to `get_my_relationship_id()`) SHALL CONTINUE TO enforce access control

3.5 WHEN existing users who already have rows in `public.users` sign in THEN the system SHALL CONTINUE TO query their `relationship_id` and proceed through the auth flow without creating duplicate rows

3.6 WHEN the `withWidgetBridge` config plugin adds the App Group entitlement to the iOS entitlements plist THEN the system SHALL CONTINUE TO include `group.com.wedo.app` in the entitlements

3.7 WHEN the `withWidgetBridge` config plugin registers the `WeDoDaysWidget` receiver in the Android manifest THEN the system SHALL CONTINUE TO include the correct intent-filter and meta-data entries

3.8 WHEN memories, calendar stickers, custom stickers, and relationships are accessed THEN the existing RLS policies and realtime subscriptions SHALL CONTINUE TO function correctly

---

## Feature Requirements

### Tab 1: Timeline (Adventure Log)

4.1 WHEN the user opens the Timeline tab THEN the system SHALL fetch and display all completed memories in reverse-chronological order as a scrollable feed

4.2 WHEN a non-creator user views an unrevealed memory THEN the system SHALL render a ScratchOffOverlay using Reanimated/GestureHandler; erasing 60% of the foil SHALL reveal the photo and update `revealed: true` in the database

4.3 WHEN the memory creator views their own memory THEN the system SHALL NOT display the scratch-off foil; the photo SHALL be visible immediately

4.4 WHEN a memory has an attached `.m4a` audio URL THEN the system SHALL render a waveform visualization and a play button to listen to the voice note

4.5 WHEN a Premium user taps the mic icon on a revealed memory without audio THEN the system SHALL allow recording and uploading a voice note up to 60 seconds; WHEN a Free user taps the mic icon THEN the system SHALL display the PaywallModal

4.6 WHEN the memory creator views their own MemoryCard THEN the system SHALL display a "Trash" icon or "..." menu; pressing it SHALL delete the memory record from Supabase and remove the associated photo/audio files from Supabase Storage

### Tab 2: Calendar (Interactive Sticker Calendar)

5.1 WHEN the user opens the Calendar tab THEN the system SHALL render a full-screen monthly calendar view (react-native-calendars) that supports swiping between months

5.2 WHEN the user opens the sticker drawer THEN the system SHALL display a bottom sheet with 20 default emoji stickers (Free) and a "Custom Photo" tab (Premium)

5.3 WHEN the user drags a sticker from the drawer to a calendar day cell THEN the system SHALL use react-native-gesture-handler to track the drag, save the exact X/Y coordinates to the `calendar_stickers` table in Supabase

5.4 WHEN a Premium user selects the "Custom Photo" tab THEN the system SHALL allow uploading a photo, cropping it to a circle, and using it as a custom sticker

5.5 WHEN the user long-presses a placed sticker on the calendar THEN the system SHALL prompt "Remove this sticker?" and delete the sticker from Supabase if confirmed

5.6 WHEN the user taps a calendar day THEN the system SHALL open a modal for entering a text note (e.g., "Dinner reservation at 8 PM") and save it to a new `calendar_notes` table

### Tab 3: Bucket List (Date Ideas)

6.1 WHEN the user opens the Bucket List tab THEN the system SHALL display uncompleted and completed date ideas, synced in real-time via Supabase realtime

6.2 WHEN the user taps the FAB (+) button THEN the system SHALL open AddToListModal with fields for Title and optional URL

6.3 WHEN a Free user has 10 bucket list items and attempts to add an 11th THEN the system SHALL display the PaywallModal

6.4 WHEN a URL is shared from Instagram/Threads via the OS Share Sheet THEN the system SHALL intercept the URL and pre-populate the AddToListModal (Social Catcher)

6.5 WHEN the user marks a bucket list item as complete via the checkbox THEN the system SHALL open MemoryCreationModal for photo and caption entry

6.6 WHEN the user taps the header wheel button THEN the system SHALL push WheelScreen with Reanimated physics-based spin animation

6.7 WHEN the user taps the "Trash" icon on any BucketListRow THEN the system SHALL delete the item from Supabase

### Tab 4: Connection (Deep Connection Deck)

7.1 WHEN the user opens the Connection tab THEN the system SHALL load 300+ prompts from local `src/assets/deep_questions.json`

7.2 WHEN a Premium user views the Connection deck THEN the system SHALL display Tinder-style swipeable or tap-to-flip cards for all prompts

7.3 WHEN a Free user views the Connection deck THEN the system SHALL only allow viewing/flipping the first card; the second card SHALL show a Lock icon and trigger PaywallModal on tap

7.4 WHEN the user navigates away from and returns to the Connection tab THEN the system SHALL restore the shuffled deck array and current index from AsyncStorage so users do not see repeat questions

### Tab 5: Settings (Profile & Preferences)

8.1 WHEN the user opens the Settings screen THEN the system SHALL display the user's email and partner's name

8.2 WHEN the user views the "Days Together" section THEN the system SHALL calculate and display total days since `relationships.start_date`

8.3 WHEN the user toggles the Privacy Vault switch THEN the system SHALL enable/disable FaceID/TouchID app lock, saving the preference to AsyncStorage

8.4 WHEN the user selects a theme (Charcoal Free, Midnight Premium, Warm Night Premium) THEN the system SHALL change the global Tailwind/NativeWind colors accordingly

8.5 WHEN the user views the Subscription section THEN the system SHALL display plan status and a "Restore Purchases" button via RevenueCat

8.6 WHEN the user views the Widget Instructions section THEN the system SHALL display static text for iOS/Android widget setup

8.7 WHEN the user taps "Sign Out" THEN the system SHALL clear the Zustand store, AsyncStorage, and call `supabase.auth.signOut()`

8.8 WHEN the user is paired and taps "Disconnect Partner" THEN the system SHALL display a strict Alert warning; confirming SHALL set `relationship_id = null` on both users, clear Zustand state, and navigate to PairingGateway

8.9 WHEN the user is unpaired THEN the system SHALL display the active 6-digit pairing code and a "Share Code" button using React Native `Share.share()`

8.10 WHEN the user selects a language from the Language Switcher THEN the system SHALL save the override to AsyncStorage and apply the selected locale via i18next

### Shared Timetable (Calendar Events)

9.1 WHEN the user views the calendar THEN the system SHALL track `selectedDate` (defaulting to today) as shared state

9.2 WHEN the calendar events table receives changes THEN the system SHALL update in real-time via a new subscription in `realtimeManager.ts` for the `calendar_events` table

9.3 WHEN the user selects a date THEN the system SHALL render a FlatList of events for that date below the react-native-calendars component

9.4 WHEN the user taps the "+" button on the events section THEN the system SHALL open an AddEventModal with TextInput fields for Title and Time

9.5 WHEN the user long-presses or swipes-to-delete an event row THEN the system SHALL delete the event from Supabase

9.6 WHEN the database migration runs THEN the system SHALL create a `calendar_events` table with columns: `id` (UUID PK), `relationship_id` (UUID FK), `day` (DATE), `title` (TEXT), `time` (TEXT), `created_by` (UUID FK), `created_at` (TIMESTAMPTZ)

### Multi-Language Support (i18n)

10.1 WHEN the app initializes THEN the system SHALL configure i18n using `expo-localization` + `i18next` + `react-i18next`

10.2 WHEN translation files are loaded THEN the system SHALL support `en.json`, `es.json`, and `zh.json` translation files

10.3 WHEN any text string is rendered in the app THEN the system SHALL wrap it with the `useTranslation` hook for localized output

10.4 WHEN the user selects a language in SettingsScreen THEN the system SHALL save the manual override to AsyncStorage and apply it immediately

### New Database Tables

11.1 WHEN the database migration runs THEN the system SHALL create a `calendar_notes` table with columns: `id` (UUID PK), `relationship_id` (UUID FK to relationships), `day` (DATE), `note_text` (TEXT), `created_by` (UUID FK to users), `created_at` (TIMESTAMPTZ default now()), with RLS enabled and policies scoped to `get_my_relationship_id()`

11.2 WHEN the database migration runs THEN the system SHALL create a `calendar_events` table with columns: `id` (UUID PK), `relationship_id` (UUID FK to relationships), `day` (DATE), `title` (TEXT), `time` (TEXT), `created_by` (UUID FK to users), `created_at` (TIMESTAMPTZ default now()), with RLS enabled and policies scoped to `get_my_relationship_id()`, and added to the realtime publication
