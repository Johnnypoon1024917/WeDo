# Tasks — WeDo Critical Fixes & Feature Implementation

## Bug 1: Widget Resource Generation in Config Plugin

- [x] 1.1 Add `withDangerousMod` import and Android resource file generation to `plugins/withWidgetBridge.js`
  - [x] 1.1.1 Import `withDangerousMod` from `@expo/config-plugins` and `fs`/`path` from Node.js
  - [x] 1.1.2 Add a `withDangerousMod` call for the `android` platform that creates `res/xml/` directory and writes `wedo_days_widget_info.xml` with appwidget-provider metadata (initialLayout, minWidth, minHeight, updatePeriodMillis, widgetCategory)
  - [x] 1.1.3 In the same dangerous mod, create `res/layout/` directory and write `widget_days_together.xml` with LinearLayout containing TextViews for `widget_heart`, `widget_days_count`, `widget_days_label`, and a `widget_background` root ID
  - [x] 1.1.4 Add a `res/values/strings.xml` entry for `widget_description` if not already present (referenced by `wedo_days_widget_info.xml`)
- [x] 1.2 Add iOS widget extension Xcode project configuration to `plugins/withWidgetBridge.js`
  - [x] 1.2.1 Add a `withXcodeProject` mod that creates the `WeDoDaysWidget` extension target in the Xcode project with bundle identifier `com.anonymous.wedo.WeDoDaysWidget`, deployment target matching the main app, and `SWIFT_VERSION = 5.0`
  - [x] 1.2.2 Add `WeDoDaysWidget.swift`, `WeDoDaysWidgetViews.swift` to the extension target's compile sources build phase
  - [x] 1.2.3 Add `Info.plist` and `WeDoDaysWidget.entitlements` to the extension target's resources
  - [x] 1.2.4 Add the App Group entitlement (`group.com.wedo.app`) to the extension target's entitlements
  - [x] 1.2.5 Add the widget extension to the main app target's "Embed App Extensions" build phase
  - [x] 1.2.6 Add a `withDangerousMod` for `ios` that copies the widget Swift source files, Info.plist, and entitlements from `ios/WeDoDaysWidget/` into the prebuild output directory if they don't already exist

## Bug 2: Missing Notifications Table

- [x] 2.1 Add `notifications` table to `supabase/migrations/20250101000000_initial_schema.sql`
  - [x] 2.1.1 Add CREATE TABLE `notifications` with columns: `id` (UUID PK default gen_random_uuid()), `relationship_id` (UUID NOT NULL FK to relationships), `recipient_id` (UUID NOT NULL FK to users), `sender_id` (UUID NOT NULL FK to users), `type` (TEXT NOT NULL), `title` (TEXT NOT NULL), `body` (TEXT), `read` (BOOLEAN NOT NULL DEFAULT false), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
  - [x] 2.1.2 Enable RLS on the `notifications` table
  - [x] 2.1.3 Add RLS policy: users can read notifications where `relationship_id = get_my_relationship_id()` and `recipient_id = auth.uid()`
  - [x] 2.1.4 Add RLS policy: users can insert notifications where `relationship_id = get_my_relationship_id()` and `sender_id = auth.uid()`
  - [x] 2.1.5 Add `notifications` to the realtime publication (`ALTER PUBLICATION supabase_realtime ADD TABLE notifications`)

## Bug 3: Private Storage Bucket

- [x] 3.1 Change `wedo-assets` bucket from private to public in `supabase/migrations/20250101000000_initial_schema.sql`
  - [x] 3.1.1 Change `VALUES ('wedo-assets', 'wedo-assets', false)` to `VALUES ('wedo-assets', 'wedo-assets', true)` in the storage bucket INSERT statement

## Bug 4: Missing Auth Trigger

- [x] 4.1 Add `handle_new_user()` trigger function and trigger to `supabase/migrations/20250101000000_initial_schema.sql`
  - [x] 4.1.1 Create the `handle_new_user()` function as a `SECURITY DEFINER` plpgsql function that inserts into `public.users` (id, email, created_at) from `NEW.id`, `NEW.email`, `NEW.created_at` with `ON CONFLICT (id) DO NOTHING`
  - [x] 4.1.2 Create the trigger `on_auth_user_created` on `auth.users` AFTER INSERT FOR EACH ROW that executes `handle_new_user()`

## Bug 5: New Database Tables (calendar_notes, calendar_events)

- [x] 5.1 Add `calendar_notes` table to `supabase/migrations/20250101000000_initial_schema.sql`
  - [x] 5.1.1 Add CREATE TABLE `calendar_notes` with columns: `id` (UUID PK default gen_random_uuid()), `relationship_id` (UUID NOT NULL FK to relationships), `day` (DATE NOT NULL), `note_text` (TEXT NOT NULL), `created_by` (UUID NOT NULL FK to users), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
  - [x] 5.1.2 Enable RLS on the `calendar_notes` table
  - [x] 5.1.3 Add RLS policy: users can read/write/delete calendar_notes where `relationship_id = get_my_relationship_id()`
- [x] 5.2 Add `calendar_events` table to `supabase/migrations/20250101000000_initial_schema.sql`
  - [x] 5.2.1 Add CREATE TABLE `calendar_events` with columns: `id` (UUID PK default gen_random_uuid()), `relationship_id` (UUID NOT NULL FK to relationships), `day` (DATE NOT NULL), `title` (TEXT NOT NULL), `time` (TEXT), `created_by` (UUID NOT NULL FK to users), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT now())
  - [x] 5.2.2 Enable RLS on the `calendar_events` table
  - [x] 5.2.3 Add RLS policy: users can read/write/delete calendar_events where `relationship_id = get_my_relationship_id()`
  - [x] 5.2.4 Add `calendar_events` and `calendar_notes` to the realtime publication
- [x] 5.3 Add DELETE RLS policies for memories and calendar_stickers
  - [x] 5.3.1 Add RLS policy on `memories` for DELETE where `relationship_id = get_my_relationship_id() AND created_by = auth.uid()`
  - [x] 5.3.2 Add RLS policy on `calendar_stickers` for DELETE where `relationship_id = get_my_relationship_id()`

## Feature 6: Timeline — Delete Memory

- [x] 6.1 Add delete functionality to `MemoryCard` in `src/screens/TimelineScreen.tsx`
  - [x] 6.1.1 Add a trash icon or "..." menu button to the MemoryCard component, visible only when `isCreator === true`
  - [x] 6.1.2 On press, show a confirmation Alert ("Delete this memory?")
  - [x] 6.1.3 On confirm, delete the photo from Supabase Storage using the path derived from `photo_url`
  - [x] 6.1.4 If `audio_url` exists, also delete the audio file from Supabase Storage
  - [x] 6.1.5 Delete the memory record from `supabase.from('memories').delete().eq('id', item.id)`
  - [x] 6.1.6 Update local state to remove the deleted memory from the list

## Feature 7: Calendar — Delete Sticker

- [x] 7.1 Add long-press delete to placed stickers in `src/screens/CalendarScreen.tsx`
  - [x] 7.1.1 Wrap placed sticker views in the `renderDay` function with a Pressable that has an `onLongPress` handler
  - [x] 7.1.2 On long-press, show an Alert with "Remove this sticker?" and Cancel/Remove buttons
  - [x] 7.1.3 On confirm, call `supabase.from('calendar_stickers').delete().eq('id', sticker.id)`
  - [x] 7.1.4 Update local stickers state to remove the deleted sticker

## Feature 8: Calendar — Day Text Notes

- [x] 8.1 Create `src/components/DayNoteModal.tsx`
  - [x] 8.1.1 Create a Modal component with TextInput for note text, Save and Cancel buttons
  - [x] 8.1.2 On open, fetch existing note for the selected day from `calendar_notes` table
  - [x] 8.1.3 On save, upsert to `calendar_notes` with `relationship_id`, `day`, `note_text`, `created_by`
  - [x] 8.1.4 Style consistently with existing modals (dark theme, coral accents)
- [x] 8.2 Integrate DayNoteModal into `src/screens/CalendarScreen.tsx`
  - [x] 8.2.1 Add `onDayPress` handler to the Calendar component or wrap day cells with Pressable
  - [x] 8.2.2 Track `selectedDay` and `dayNoteModalVisible` state
  - [x] 8.2.3 Render DayNoteModal with the selected day
  - [x] 8.2.4 Display a small indicator dot on days that have notes (fetch notes for current month)

## Feature 9: Calendar — Shared Timetable Events

- [x] 9.1 Add `CalendarEvent` interface and realtime subscription to `src/services/realtimeManager.ts`
  - [x] 9.1.1 Add `CalendarEvent` interface with fields: `id`, `relationship_id`, `day`, `title`, `time`, `created_by`, `created_at`
  - [x] 9.1.2 Add `subscribeToCalendarEvents()` method following the existing subscription pattern
  - [x] 9.1.3 Add reconciliation logic for calendar events (similar to existing reconcile functions)
- [x] 9.2 Create `src/components/AddEventModal.tsx`
  - [x] 9.2.1 Create a Modal with TextInput fields for Title and Time
  - [x] 9.2.2 On save, insert into `calendar_events` with `relationship_id`, `day`, `title`, `time`, `created_by`
  - [x] 9.2.3 Style consistently with existing modals
- [x] 9.3 Integrate events UI into `src/screens/CalendarScreen.tsx`
  - [x] 9.3.1 Add `selectedDate` state (defaults to today) and `events` state array
  - [x] 9.3.2 Fetch events for `selectedDate` from `calendar_events` on date selection
  - [x] 9.3.3 Below the calendar, render a FlatList of events for the selected date
  - [x] 9.3.4 Add a "+" button that opens AddEventModal for the selected date
  - [x] 9.3.5 Add onLongPress or swipe-to-delete on event rows to delete from `calendar_events`
  - [x] 9.3.6 Subscribe to real-time changes on `calendar_events` via realtimeManager

## Feature 10: Bucket List — Delete Item

- [x] 10.1 Add delete functionality to `BucketListRow` in `src/screens/BucketListScreen.tsx`
  - [x] 10.1.1 Add a trash icon Pressable to each BucketListRow
  - [x] 10.1.2 On press, call `supabase.from('bucket_list_items').delete().eq('id', item.id)`
  - [x] 10.1.3 Update local state to remove the deleted item from the list

## Feature 11: Connection — Persistent Deck State

- [x] 11.1 Add AsyncStorage persistence to `src/screens/ConnectionScreen.tsx`
  - [x] 11.1.1 On `useFocusEffect`, check AsyncStorage for saved `wedo_connection_deck` and `wedo_connection_index`
  - [x] 11.1.2 If found, restore the saved deck array and current index instead of re-shuffling
  - [x] 11.1.3 On every index change, persist the current index to AsyncStorage
  - [x] 11.1.4 On initial shuffle (when no saved state exists), persist the shuffled deck to AsyncStorage

## Feature 12: Settings — Disconnect Partner (Unpair Logic)

- [x] 12.1 Add disconnect partner functionality to `src/screens/SettingsScreen.tsx`
  - [x] 12.1.1 Add a red "Disconnect Partner" button visible when `relationshipId` is not null
  - [x] 12.1.2 On press, show Alert.alert with strict warning text about permanent disconnection
  - [x] 12.1.3 On confirm, set `relationship_id = null` on both the current user and partner via Supabase
  - [x] 12.1.4 Clear Zustand store via `clearAuth()` and clear relevant AsyncStorage keys
  - [x] 12.1.5 Navigate to PairingGateway (reset navigation stack)

## Feature 13: Settings — Unpaired Invite Logic

- [x] 13.1 Add invite/share code UI to `src/screens/SettingsScreen.tsx`
  - [x] 13.1.1 When `relationshipId` is null, fetch active pairing code from `pairing_codes` where `created_by = user.id`, `used = false`, `expires_at > now()`
  - [x] 13.1.2 Display the active 6-digit code if one exists
  - [x] 13.1.3 Add a "Share Code" button that calls `Share.share({ message: code })`
  - [x] 13.1.4 If no active code exists, show a "Generate Code" button that creates one via `supabase.from('pairing_codes').insert()`

## Feature 14: Multi-Language Support (i18n)

- [x] 14.1 Set up i18n infrastructure
  - [x] 14.1.1 Create `src/i18n/index.ts` that initializes i18next with `expo-localization` for device locale detection and `react-i18next` for React integration
  - [x] 14.1.2 Create `src/i18n/en.json` with English translations for all user-facing strings
  - [x] 14.1.3 Create `src/i18n/es.json` with Spanish translations
  - [x] 14.1.4 Create `src/i18n/zh.json` with Chinese translations
  - [x] 14.1.5 On app init, check AsyncStorage for saved language override (`wedo_language`) before falling back to device locale
- [x] 14.2 Add Language Switcher to `src/screens/SettingsScreen.tsx`
  - [x] 14.2.1 Add a "Language" section with options for English, Spanish, Chinese
  - [x] 14.2.2 On selection, call `i18n.changeLanguage(locale)` and save to AsyncStorage under `wedo_language`
- [x] 14.3 Integrate translations across the app
  - [x] 14.3.1 Wrap text strings in `src/screens/TimelineScreen.tsx` with `useTranslation` hook
  - [x] 14.3.2 Wrap text strings in `src/screens/CalendarScreen.tsx` with `useTranslation` hook
  - [x] 14.3.3 Wrap text strings in `src/screens/BucketListScreen.tsx` with `useTranslation` hook
  - [x] 14.3.4 Wrap text strings in `src/screens/ConnectionScreen.tsx` with `useTranslation` hook
  - [x] 14.3.5 Wrap text strings in `src/screens/SettingsScreen.tsx` with `useTranslation` hook
  - [x] 14.3.6 Wrap text strings in modal components (`MemoryCreationModal`, `AddToListModal`, `PaywallModal`, `DayNoteModal`, `AddEventModal`) with `useTranslation` hook
  - [x] 14.3.7 Wrap text strings in onboarding screens (`AuthScreen`, `PairingGateway`) with `useTranslation` hook
