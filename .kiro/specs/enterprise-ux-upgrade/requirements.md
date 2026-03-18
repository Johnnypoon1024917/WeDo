# Requirements Document

## Introduction

The WeDo app requires a set of UX and reliability improvements across four areas: fixing a critical crash in the Timeline memory upload flow, upgrading the Calendar screen with month-level event indicators and a bottom-sheet agenda view, adding Lottie micro-interaction animations to the Bucket List completion flow, and completing the Bucket List Map View with teal-accented markers and a slide-up preview card. These changes target the existing React Native Expo codebase using Supabase, react-native-calendars, lottie-react-native, react-native-maps, and @gorhom/bottom-sheet.

## Glossary

- **MemoryCreationModal**: The modal component (`src/components/MemoryCreationModal.tsx`) that allows users to create a new memory entry with a photo and caption.
- **CalendarScreen**: The screen component (`src/screens/CalendarScreen.tsx`) that renders the monthly calendar grid, stickers, and events.
- **BucketListScreen**: The screen component (`src/screens/BucketListScreen.tsx`) that renders the bucket list in List or Map view with a segmented control.
- **BucketListMapView**: The map component (`src/components/BucketListMapView.tsx`) that renders uncompleted bucket list items as map markers.
- **PinPreviewModal**: The bottom-sheet-style modal (`src/components/PinPreviewModal.tsx`) that shows a preview card when a map pin is tapped.
- **LottieOverlay**: The overlay component (`src/components/LottieOverlay.tsx`) that plays a full-screen Lottie animation.
- **UUID_Generator**: The mechanism used to produce unique identifiers for memory entries. Must use `expo-crypto` Crypto.randomUUID() in React Native.
- **CalendarList**: The `CalendarList` component from `react-native-calendars` used to render the horizontally-paginated month grid.
- **BottomSheet**: The `@gorhom/bottom-sheet` component used to present slide-up panels.
- **MarkedDates**: The `markedDates` prop on `CalendarList` that controls visual indicators (dots, markings) on specific days.
- **Supabase**: The backend-as-a-service used for database operations and file storage.
- **Soft_Coral**: The hex color `#FF7F50` used as the app's primary accent color.
- **Teal_Accent**: The hex color `#40E0D0` used as the app's secondary accent color.

## Requirements

### Requirement 1: Fix UUID Generation for Memory Upload

**User Story:** As a user, I want to upload a memory without the app crashing, so that I can reliably save photos and captions to the timeline.

#### Acceptance Criteria

1. WHEN a user submits a new memory, THE MemoryCreationModal SHALL generate a unique identifier using `expo-crypto` Crypto.randomUUID() instead of the native `crypto.randomUUID()` API.
2. WHEN the `expo-crypto` module is imported, THE MemoryCreationModal SHALL use the named import `import * as Crypto from 'expo-crypto'` and call `Crypto.randomUUID()` to produce the entry identifier.
3. IF `expo-crypto` Crypto.randomUUID() returns an error or is unavailable, THEN THE MemoryCreationModal SHALL display a user-facing error message and prevent the upload from proceeding silently.

### Requirement 2: Pass Bucket List ID to Memory Insert Payload

**User Story:** As a user, I want my completed bucket list item to be linked to the memory I create, so that the timeline shows which date idea the memory belongs to.

#### Acceptance Criteria

1. WHEN the MemoryCreationModal is opened from a bucket list item completion, THE BucketListScreen SHALL pass the completed item's `id` as a `bucketListId` prop to the MemoryCreationModal.
2. WHEN a memory is submitted with a `bucketListId` prop present, THE MemoryCreationModal SHALL include `bucket_list_id` with the value of `bucketListId` in the Supabase `.insert()` payload for the `memories` table.
3. WHEN a memory is submitted without a `bucketListId` prop (standalone memory creation), THE MemoryCreationModal SHALL omit `bucket_list_id` from the insert payload or set it to `null`.

### Requirement 3: Calendar Month-Level Event Fetching

**User Story:** As a user, I want to see which days have events when I look at the calendar month view, so that I can quickly identify busy days without tapping each one.

#### Acceptance Criteria

1. WHEN a month becomes visible in the CalendarList, THE CalendarScreen SHALL fetch all `calendar_events` for the entire visible month from Supabase in a single query using the month's first and last day as range bounds.
2. THE CalendarScreen SHALL group the fetched events by their `day` field into a lookup structure keyed by date string (YYYY-MM-DD).
3. WHEN the user scrolls to a different month, THE CalendarScreen SHALL fetch events for the newly visible month and update the grouped events lookup.

### Requirement 4: Calendar Event Day Indicators

**User Story:** As a user, I want to see a visual dot on calendar days that have events, so that I can spot scheduled dates at a glance.

#### Acceptance Criteria

1. THE CalendarScreen SHALL inject the grouped events data into the `markedDates` prop of the CalendarList component, marking each day that has one or more events.
2. WHEN a day has one or more events, THE CalendarScreen SHALL render a Soft_Coral (#FF7F50) dot indicator beneath the day number on that day cell.
3. WHEN a day has both events and stickers, THE CalendarScreen SHALL display both the Soft_Coral dot and the sticker without overlap, with the sticker rendered at a slight offset from the day number.
4. WHEN a day has no events, THE CalendarScreen SHALL render no event dot indicator for that day.

### Requirement 5: Calendar Bottom-Sheet Agenda View

**User Story:** As a user, I want to tap a day and see a beautiful slide-up agenda of that day's events, so that I can review my schedule without leaving the calendar.

#### Acceptance Criteria

1. WHEN a user taps a day cell on the CalendarScreen, THE CalendarScreen SHALL open a `@gorhom/bottom-sheet` BottomSheet panel sliding up from the bottom of the screen.
2. THE BottomSheet SHALL display the selected day's events in a vertical timeline layout, showing each event's title and time in chronological order.
3. WHEN the selected day has no events, THE BottomSheet SHALL display an empty-state message indicating no events are scheduled for that day.
4. WHEN the user swipes down or taps outside the BottomSheet, THE CalendarScreen SHALL dismiss the BottomSheet panel.
5. THE BottomSheet SHALL use the app's dark theme (background color #1E1E1E, white text, Teal_Accent for time labels).

### Requirement 6: Lottie Checkbox Animation on Bucket List Completion

**User Story:** As a user, I want to see a satisfying animation when I complete a bucket list item, so that the experience feels rewarding and polished.

#### Acceptance Criteria

1. THE BucketListScreen SHALL replace the static emoji checkbox (`✅` / `⬜`) in each BucketListRow with a LottieView component that renders the `checkmark-confetti.json` animation.
2. WHEN a user taps an uncompleted bucket list row to mark it complete, THE BucketListScreen SHALL play the Lottie checkmark-confetti animation at the native frame rate (targeting 60fps) before opening the MemoryCreationModal.
3. WHEN the Lottie animation finishes playing, THE BucketListScreen SHALL open the MemoryCreationModal for the completed item.
4. WHEN a bucket list item is already completed, THE LottieView SHALL display the final frame of the animation as a static completed state.
5. WHEN a user taps a completed bucket list row to mark it incomplete, THE BucketListScreen SHALL reset the LottieView to its initial uncompleted frame without playing the animation.

### Requirement 7: Bucket List Map View Teal Markers

**User Story:** As a user, I want to see my uncompleted bucket list items as visually distinct pins on the map, so that I can explore date ideas geographically.

#### Acceptance Criteria

1. WHEN the Map segment is selected, THE BucketListMapView SHALL render uncompleted bucket list items that have non-null `latitude` and `longitude` values as custom map markers.
2. THE BucketListMapView SHALL style each marker dot with the Teal_Accent color (#40E0D0) instead of the current Soft_Coral color, with a white border and a teal glow shadow.
3. THE BucketListMapView SHALL display a truncated title label beneath each marker dot using white text with a dark text shadow for readability.
4. WHEN a bucket list item has no `latitude` or `longitude`, THE BucketListMapView SHALL exclude that item from the map.

### Requirement 8: Bucket List Map Pin Preview Card

**User Story:** As a user, I want to tap a map pin and see a preview card slide up with the date idea details, so that I can learn more about a location without leaving the map.

#### Acceptance Criteria

1. WHEN a user taps a map marker pin, THE BucketListMapView SHALL invoke the `onPinPress` callback with the corresponding BucketListItem.
2. WHEN `onPinPress` is invoked, THE BucketListScreen SHALL display the PinPreviewModal as a slide-up card at the bottom of the screen.
3. THE PinPreviewModal SHALL display the bucket list item's title and place_name (if available) in the preview card.
4. WHEN the user taps the dismiss button or taps outside the preview card, THE PinPreviewModal SHALL close and return focus to the map.
