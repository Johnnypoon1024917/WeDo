# WeDo Critical Fixes & Feature Implementation Design

## Overview

The WeDo app has four critical bugs spanning native widget configuration, database schema gaps, storage bucket visibility, and auth-to-public user synchronization. Additionally, the app requires comprehensive feature implementation across all five tabs, a shared timetable, multi-language support, and updated settings logic.

The fix and feature approach is:

1. **Widget Resources**: The `withWidgetBridge.js` Expo config plugin registers the Android widget receiver in the manifest and references `@xml/wedo_days_widget_info`, but does not generate the required XML resource files during prebuild. For iOS, the plugin adds App Group entitlements but does not configure the `WeDoDaysWidget` extension target in the Xcode project.

2. **Missing Notifications Table**: `WheelScreen.tsx` inserts into a `notifications` table that does not exist in the SQL schema migration.

3. **Private Storage Bucket**: The `wedo-assets` bucket is created with `public: false`, but three files call `getPublicUrl()` which only works on public buckets.

4. **Missing Auth Trigger**: No PostgreSQL trigger copies new users from `auth.users` to `public.users` on signup.

5. **Timeline Features**: Delete memory functionality for creators, ensuring existing scroll feed, scratch-off, creator bypass, audio playback, and premium recording work correctly.

6. **Calendar Features**: Delete sticker via long-press, day text notes with new `calendar_notes` table, ensuring existing monthly view, sticker drawer, drag-and-drop, and custom photo stickers work.

7. **Bucket List Features**: Delete item functionality, ensuring existing view/add/limit/social catcher/mark complete/wheel features work.

8. **Connection Features**: Persistent deck state via AsyncStorage, ensuring existing load deck, card UI, and premium gate work.

9. **Settings Features**: Unpair/disconnect partner logic, unpaired invite/share code logic, language switcher, ensuring existing profile/days/vault/theme/subscription/widget/signout work.

10. **Shared Timetable**: New calendar events system with real-time sync, add/delete events, new `calendar_events` DB table.

11. **Multi-Language (i18n)**: expo-localization + i18next + react-i18next setup with en/es/zh translations.

12. **New DB Tables**: `calendar_notes` and `calendar_events` with RLS and realtime.

## Glossary

- **Bug_Condition (C)**: The set of conditions under which each bug manifests
- **Property (P)**: The desired correct behavior
- **Preservation**: Existing behaviors that must remain unchanged
- **withWidgetBridge**: The Expo config plugin in `plugins/withWidgetBridge.js`
- **handle_new_user()**: The PostgreSQL trigger function (to be created)
- **getPublicUrl()**: Supabase Storage client method that constructs a public URL
- **calendar_notes**: New table for day-level text notes on the calendar
- **calendar_events**: New table for shared timetable events
- **i18next**: Internationalization framework for React/React Native
- **AsyncStorage**: React Native persistent key-value storage

## Bug Details

### Bug Condition

The bugs manifest across four independent subsystems. Each has a distinct trigger condition but all result in runtime failures.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AppOperation
  OUTPUT: boolean

  // Bug 1: Widget prebuild
  IF input.operation == "expo_prebuild" THEN
    RETURN (NOT fileExistsAfterPrebuild("res/xml/wedo_days_widget_info.xml")
            OR NOT fileExistsAfterPrebuild("res/layout/widget_days_together.xml"))
           OR (NOT xcodeProjectContainsTarget("WeDoDaysWidget"))

  // Bug 2: Wheel notification
  IF input.operation == "wheel_spin_notify" THEN
    RETURN NOT tableExists("notifications")

  // Bug 3: Storage public URL
  IF input.operation == "get_public_url" AND input.bucket == "wedo-assets" THEN
    RETURN bucketIsPrivate("wedo-assets")

  // Bug 4: Auth user sync
  IF input.operation == "auth_signup" THEN
    RETURN NOT triggerExists("on_auth_user_created")
           AND NOT rowExists("public.users", input.userId)

  RETURN false
END FUNCTION
```

### Examples

- **Widget (Android)**: After `expo prebuild --clean`, the `android/app/src/main/res/xml/` and `res/layout/` directories are empty. `WeDoDaysWidget.kt` references `R.layout.widget_days_together` → crash.
- **Widget (iOS)**: After `expo prebuild --clean`, the Xcode project has no `WeDoDaysWidget` target. Widget never appears.
- **Notifications**: User spins the wheel → `notifyPartner()` → error: relation "notifications" does not exist.
- **Storage URL**: User creates a memory → `getPublicUrl()` returns inaccessible URL.
- **Auth trigger**: New user signs in → query `public.users` → no row exists.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- iOS widget's `WidgetData.load()` reading from UserDefaults must continue to work
- Android `WidgetBridgeModule` writing to SharedPreferences must continue to work
- The `withWidgetBridge` plugin's existing App Group entitlement and Android manifest receiver must remain
- All existing RLS policies on all tables must remain unchanged
- Existing storage RLS policies must continue to enforce access control
- Existing users must not get duplicate rows from the auth trigger
- Realtime subscriptions on memories, bucket_list_items, and calendar_stickers must continue to function
- All existing Timeline features (scroll feed, scratch-off, creator bypass, audio playback, premium recording) must continue to work
- All existing Calendar features (monthly view, sticker drawer, drag-and-drop, custom photo stickers) must continue to work
- All existing Bucket List features (view, add, free limit, social catcher, mark complete, wheel) must continue to work
- All existing Connection features (load deck, card UI, premium gate) must continue to work
- All existing Settings features (profile, days together, vault, theme, subscription, widget instructions, sign out) must continue to work

## Hypothesized Root Cause

1. **Incomplete Config Plugin**: `withWidgetBridge.js` imports `withXcodeProject` but never uses it. No `withDangerousMod` generates XML resources.
2. **Missing Database Table**: Initial schema migration omits `notifications`.
3. **Bucket Visibility Mismatch**: Bucket created with `public: false` but code calls `getPublicUrl()`.
4. **Missing Auth Trigger**: No trigger copies `auth.users` to `public.users`.

## Correctness Properties

Property 1: Widget Resources Generated at Prebuild
_For any_ Expo prebuild operation, the config plugin SHALL generate Android XML resource files and configure the iOS widget extension target.
**Validates: Requirements 2.1, 2.2**

Property 2: Notifications Table Accepts Inserts
_For any_ wheel spin selection, `notifyPartner()` SHALL successfully insert a notification record.
**Validates: Requirements 2.3**

Property 3: Public URLs Are Accessible
_For any_ file uploaded to `wedo-assets`, `getPublicUrl()` SHALL return an accessible URL.
**Validates: Requirements 2.4, 2.5, 2.6**

Property 4: Auth Trigger Creates Public User
_For any_ new user signup, `handle_new_user()` SHALL automatically insert a row into `public.users`.
**Validates: Requirements 2.7, 2.8**

Property 5: Preservation - Existing Behaviors Unchanged
_For any_ operation not involving the four bug conditions, the fixed code SHALL produce identical behavior.
**Validates: Requirements 3.1–3.8**

Property 6: Memory Deletion
_For any_ memory where `isCreator === true`, the delete action SHALL remove the memory record and associated storage files.
**Validates: Requirement 4.6**

Property 7: Sticker Deletion
_For any_ placed sticker that receives a long-press confirmation, the sticker SHALL be deleted from Supabase.
**Validates: Requirement 5.5**

Property 8: Calendar Day Notes
_For any_ day press on the calendar, the note modal SHALL save/retrieve notes from the `calendar_notes` table.
**Validates: Requirement 5.6**

Property 9: Bucket List Item Deletion
_For any_ bucket list item where the trash icon is pressed, the item SHALL be deleted from Supabase.
**Validates: Requirement 6.7**

Property 10: Connection Persistent State
_For any_ app session, the shuffled deck and current index SHALL be restored from AsyncStorage.
**Validates: Requirement 7.4**

Property 11: Unpair/Disconnect Partner
_For any_ paired user who confirms disconnect, both users' `relationship_id` SHALL be set to null.
**Validates: Requirement 8.8**

Property 12: Calendar Events CRUD
_For any_ calendar event operation, the system SHALL correctly create, read, and delete events in the `calendar_events` table with real-time sync.
**Validates: Requirements 9.1–9.6**

Property 13: i18n Integration
_For any_ rendered text string, the system SHALL use the i18next translation hook with the active locale.
**Validates: Requirements 10.1–10.4**

## Fix Implementation

### Changes Required

---

### Bug Fix Changes

**File**: `plugins/withWidgetBridge.js`

1. **Add Android Resource File Generation**: Use `withDangerousMod` to write `res/xml/wedo_days_widget_info.xml` and `res/layout/widget_days_together.xml` into the Android project directory during prebuild.

2. **Add iOS Widget Extension Target**: Use `withXcodeProject` to add the `WeDoDaysWidget` extension target with correct bundle identifier, Swift sources, Info.plist, entitlements, and embed in app bundle.

3. **Copy iOS Widget Source Files**: Use `withDangerousMod` to copy widget Swift files from `ios/WeDoDaysWidget/` into prebuild output.

---

**File**: `supabase/migrations/20250101000000_initial_schema.sql`

4. **Add Notifications Table**: CREATE TABLE `notifications` with RLS and realtime.

5. **Change Bucket to Public**: Change `VALUES ('wedo-assets', 'wedo-assets', false)` to `true`.

6. **Add Auth Trigger Function**: Create `handle_new_user()` with `ON CONFLICT (id) DO NOTHING` and trigger on `auth.users` AFTER INSERT.

7. **Add `calendar_notes` Table**: CREATE TABLE with `id`, `relationship_id`, `day`, `note_text`, `created_by`, `created_at`. Enable RLS with policy scoped to `get_my_relationship_id()`.

8. **Add `calendar_events` Table**: CREATE TABLE with `id`, `relationship_id`, `day`, `title`, `time`, `created_by`, `created_at`. Enable RLS with policy scoped to `get_my_relationship_id()`. Add to realtime publication.

9. **Add DELETE RLS policy on memories**: Add a policy allowing users to delete memories where `relationship_id = get_my_relationship_id() AND created_by = auth.uid()`.

10. **Add DELETE RLS policy on calendar_stickers**: Add a policy allowing users to delete stickers where `relationship_id = get_my_relationship_id()`.

---

### Feature Implementation Changes

#### Timeline — Delete Memory (Requirement 4.6)

**File**: `src/screens/TimelineScreen.tsx`

- Add a delete button (trash icon or "..." menu) to `MemoryCard`, visible only when `isCreator === true`
- On press, show a confirmation Alert
- On confirm: delete the photo from `supabase.storage.from('wedo-assets')` using the storage path derived from `photo_url`, delete the audio file if `audio_url` exists, then delete the memory record from `supabase.from('memories').delete().eq('id', item.id)`
- Update local state to remove the deleted memory from the list

#### Calendar — Delete Sticker (Requirement 5.5)

**File**: `src/screens/CalendarScreen.tsx`

- Add `onLongPress` handler to placed sticker views in the `renderDay` function
- On long-press, show an Alert with "Remove this sticker?" confirmation
- On confirm: call `supabase.from('calendar_stickers').delete().eq('id', sticker.id)`
- Update local state to remove the sticker

#### Calendar — Day Text Notes (Requirement 5.6)

**Files**: `src/screens/CalendarScreen.tsx`, new `src/components/DayNoteModal.tsx`

- Add `onDayPress` handler to the Calendar component (via `onDayPress` prop or wrapping the day component with a Pressable)
- Create `DayNoteModal` component: a Modal with TextInput for note text, Save and Cancel buttons
- On save: upsert to `calendar_notes` table with `relationship_id`, `day`, `note_text`, `created_by`
- On open: fetch existing note for the selected day from `calendar_notes`
- Display a small indicator dot on days that have notes

#### Calendar — Shared Timetable Events (Requirements 9.1–9.6)

**Files**: `src/screens/CalendarScreen.tsx`, new `src/components/AddEventModal.tsx`

- Add state for `selectedDate` (defaults to today)
- Below the calendar component, render a FlatList of events for `selectedDate` fetched from `calendar_events`
- Add a "+" button that opens `AddEventModal` with TextInput fields for Title and Time
- On save: insert into `calendar_events` with `relationship_id`, `day`, `title`, `time`, `created_by`
- Add `onLongPress` or swipe-to-delete on event rows to delete from `calendar_events`
- Subscribe to real-time changes on `calendar_events` via `realtimeManager.ts`

**File**: `src/services/realtimeManager.ts`

- Add `CalendarEvent` interface matching the `calendar_events` table schema
- Add `subscribeToCalendarEvents()` method following the same pattern as existing subscriptions
- Add reconciliation logic for calendar events

#### Bucket List — Delete Item (Requirement 6.7)

**File**: `src/screens/BucketListScreen.tsx`

- Add a trash icon Pressable to each `BucketListRow`
- On press: call `supabase.from('bucket_list_items').delete().eq('id', item.id)`
- Update local state to remove the deleted item
- Existing RLS policy on `bucket_list_items` already allows ALL operations for relationship members

#### Connection — Persistent State (Requirement 7.4)

**File**: `src/screens/ConnectionScreen.tsx`

- On `useFocusEffect`, check AsyncStorage for saved `shuffledDeck` and `currentIndex`
- If found, restore them instead of re-shuffling
- On every index change or shuffle, persist the current deck order and index to AsyncStorage
- Use keys like `wedo_connection_deck` and `wedo_connection_index`

#### Settings — Disconnect Partner (Requirement 8.8)

**File**: `src/screens/SettingsScreen.tsx`

- Add a "Disconnect Partner" button (red, destructive style) visible when `relationshipId` is not null
- On press: show Alert.alert with strict warning text about permanent disconnection
- On confirm: set `relationship_id = null` on both users via Supabase, clear Zustand store (`clearAuth()`), clear relevant AsyncStorage keys, navigate to PairingGateway

#### Settings — Unpaired Invite Logic (Requirement 8.9)

**File**: `src/screens/SettingsScreen.tsx`

- When `relationshipId` is null, show the active 6-digit pairing code (fetch from `pairing_codes` where `created_by = user.id` and `used = false` and `expires_at > now()`)
- Add a "Share Code" button that calls `Share.share({ message: code })`
- If no active code exists, show a "Generate Code" button that creates one

#### Settings — Language Switcher (Requirement 8.10, 10.1–10.4)

**Files**: `src/screens/SettingsScreen.tsx`, new `src/i18n/index.ts`, new `src/i18n/en.json`, `src/i18n/es.json`, `src/i18n/zh.json`

- Install and configure `expo-localization`, `i18next`, `react-i18next`
- Create `src/i18n/index.ts` that initializes i18next with the three locale files and detects device locale via `expo-localization`
- Create translation JSON files with keys for all user-facing strings
- Add a Language Switcher section in SettingsScreen with options for English, Spanish, Chinese
- On selection: call `i18n.changeLanguage(locale)` and save to AsyncStorage under key `wedo_language`
- On app init: check AsyncStorage for saved language override before falling back to device locale
- Wrap text strings throughout the app with `useTranslation` hook's `t()` function

## Testing Strategy

### Validation Approach

Two-phase approach: surface counterexamples on unfixed code, then verify fixes and new features work correctly while preserving existing behavior.

### Bug Fix Tests

1. Config plugin generates Android XML files with correct content
2. Config plugin adds iOS widget extension target
3. Notifications table schema has correct columns and constraints
4. `handle_new_user()` trigger creates user row on auth signup without duplicates
5. `wedo-assets` bucket is public after migration

### Feature Tests

6. Memory delete removes record and storage files, only visible to creator
7. Sticker delete via long-press removes from DB
8. Day note modal saves/retrieves from `calendar_notes`
9. Bucket list item delete removes from DB
10. Connection deck state persists across sessions via AsyncStorage
11. Disconnect partner sets both users' `relationship_id` to null
12. Calendar events CRUD with real-time sync
13. i18n renders translated strings for all supported locales
14. Language switcher persists selection to AsyncStorage

### Preservation Tests

- All existing CRUD operations on memories, bucket list items, calendar stickers continue to work
- Existing auth flows for returning users are unaffected
- Widget data updates via native bridge modules continue to work
- All navigation and UI rendering is unaffected
- RLS policies continue to enforce correct access control
