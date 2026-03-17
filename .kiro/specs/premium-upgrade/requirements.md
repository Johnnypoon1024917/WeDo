# Requirements Document

## Introduction

The Premium Upgrade feature is a major enhancement to the WeDo couples app (React Native / Expo). It spans five areas: a Calendar Screen overhaul with infinite scroll and native device sync, Timeline Screen interactivity with memory detail views and shared element transitions, a Bucket List Map View with location pins, global UI polish with skeleton loaders and Lottie animations, and a Conversation Deck daily streak system. Together these upgrades deliver a richer, more engaging experience and provide clear premium-tier value.

## Glossary

- **App**: The WeDo React Native / Expo mobile application
- **Calendar_Screen**: The second tab screen displaying a monthly calendar with stickers, notes, and events
- **CalendarList_Component**: A horizontally-paginated calendar list from `react-native-calendars` that replaces the single `<Calendar />` component
- **Month_Year_Picker**: A native bottom-sheet modal containing scrollable pickers for selecting a month and year
- **Device_Calendar_Service**: A service using `expo-calendar` to read/write events to the user's native Apple or Google calendar
- **AddEventModal**: The modal component used to create new calendar events
- **Timeline_Screen**: The first tab screen displaying a reverse-chronological feed of memory cards
- **MemoryCard**: A card component displaying a photo, caption, timestamp, and optional audio for a single memory
- **MemoryDetailScreen**: A new stack screen showing a full-screen view of a single memory with shared element transitions
- **Anniversary_Banner**: A glowing UI banner shown on the Timeline when the relationship yearly anniversary is within 7 days
- **Year_In_Review_Modal**: An Instagram-Story-style modal presenting relationship statistics for the past year
- **BucketList_Screen**: The third tab screen displaying a list of bucket list items
- **Map_View**: A map component using `react-native-maps` that plots bucket list items as pins
- **Segmented_Control**: A toggle control at the top of the Bucket List screen switching between List and Map views
- **AddToListModal**: The modal component used to create new bucket list items
- **Location_Search**: A Google Places Autocomplete input for searching and selecting geographic locations
- **Pin_Preview_Modal**: A modal that appears when tapping a map pin, showing the bucket list item details
- **SkeletonCard**: A shimmer loading placeholder component using `expo-linear-gradient` and `react-native-reanimated`
- **Lottie_Animation**: A micro-interaction animation powered by `lottie-react-native`
- **Mesh_Gradient**: A slow-moving animated gradient background replacing solid `#121212` backgrounds
- **Connection_Screen**: The fourth tab screen displaying conversation prompts as swipeable cards
- **Daily_Question**: A single prompt selected deterministically from a JSON file each day at midnight
- **Daily_Streaks_Table**: A Supabase table (`daily_streaks`) tracking streak data per relationship
- **Streak_Counter**: A UI element displaying a flame icon and the current streak count
- **Relationship**: A paired connection between two users in the app, identified by `relationship_id`
- **Partner**: The other user in a Relationship

## Requirements

### Requirement 1: Month/Year Picker

**User Story:** As a user, I want to quickly jump to any month and year on the Calendar screen, so that I can navigate to past or future dates without swiping month by month.

#### Acceptance Criteria

1. WHEN the user taps the month/year header text on the Calendar_Screen, THE App SHALL open the Month_Year_Picker as a native bottom-sheet modal.
2. THE Month_Year_Picker SHALL display scrollable picker wheels for month (January–December) and year.
3. WHEN the user selects a month and year in the Month_Year_Picker and confirms, THE Calendar_Screen SHALL navigate to the selected month and year.
4. WHEN the user dismisses the Month_Year_Picker without confirming, THE Calendar_Screen SHALL remain on the previously displayed month.

### Requirement 2: Infinite Scroll Calendar

**User Story:** As a user, I want to swipe horizontally between months on the Calendar screen, so that I can browse months fluidly without page reloads.

#### Acceptance Criteria

1. THE Calendar_Screen SHALL replace the single `<Calendar />` component with a `<CalendarList />` component configured for horizontal scrolling with paging enabled.
2. WHEN the user swipes left on the CalendarList_Component, THE Calendar_Screen SHALL display the next month.
3. WHEN the user swipes right on the CalendarList_Component, THE Calendar_Screen SHALL display the previous month.
4. THE CalendarList_Component SHALL retain all existing day-cell functionality including sticker rendering, note indicator dots, and day press handling.

### Requirement 3: Native Device Calendar Sync (Premium)

**User Story:** As a premium user, I want to sync calendar events to my device's native calendar, so that I can see WeDo events alongside my other appointments.

#### Acceptance Criteria

1. THE AddEventModal SHALL display a "Sync to Device Calendar" toggle switch.
2. WHEN the user enables the "Sync to Device Calendar" toggle and the App does not have calendar permissions, THE Device_Calendar_Service SHALL request OS calendar permissions from the user.
3. WHEN the user grants calendar permissions and saves an event with the sync toggle enabled, THE Device_Calendar_Service SHALL create a corresponding event in the user's default native calendar.
4. IF the user denies calendar permissions, THEN THE App SHALL display an informational message explaining that permissions are required and save the event to Supabase only.
5. IF the Device_Calendar_Service fails to write to the native calendar, THEN THE App SHALL save the event to Supabase and display an error message indicating the device sync failed.
6. WHILE the user is not a premium subscriber, THE AddEventModal SHALL hide the "Sync to Device Calendar" toggle.

### Requirement 4: Memory Detail View

**User Story:** As a user, I want to tap on a memory card to see a full-screen detail view, so that I can view photos and captions in a larger, immersive format.

#### Acceptance Criteria

1. THE App SHALL register a MemoryDetailScreen as a stack screen in the RootNavigator.
2. WHEN the user taps a MemoryCard on the Timeline_Screen, THE App SHALL navigate to the MemoryDetailScreen displaying the selected memory's photo, caption, timestamp, and audio player (if audio exists).
3. WHEN the user navigates back from the MemoryDetailScreen, THE App SHALL return to the Timeline_Screen at the same scroll position.

### Requirement 5: Shared Element Transitions

**User Story:** As a user, I want the photo to animate smoothly from the timeline card into the detail view, so that the transition feels polished and contextual.

#### Acceptance Criteria

1. THE MemoryCard photo on the Timeline_Screen SHALL have a `sharedTransitionTag` matching the corresponding photo element on the MemoryDetailScreen.
2. WHEN the user navigates from the Timeline_Screen to the MemoryDetailScreen, THE App SHALL animate the photo from its card position to the full-screen position using a shared element transition powered by `react-native-reanimated`.
3. WHEN the user navigates from the Timeline_Screen to the MemoryDetailScreen, THE App SHALL animate the caption sliding up from below the photo.
4. WHEN the user navigates back from the MemoryDetailScreen, THE App SHALL reverse the shared element transition, animating the photo back to its card position.

### Requirement 6: Relationship Anniversary Banner

**User Story:** As a user, I want to see a special banner near my relationship anniversary, so that I can celebrate the milestone and review our year together.

#### Acceptance Criteria

1. THE App SHALL read the `relationshipStartDate` from the app store on the Timeline_Screen.
2. WHILE the current date is within 7 days (before or after) of the yearly anniversary of the relationship start date, THE Timeline_Screen SHALL display the Anniversary_Banner at the top of the feed with a glowing visual effect.
3. WHEN the user taps the Anniversary_Banner, THE App SHALL open the Year_In_Review_Modal.
4. THE Year_In_Review_Modal SHALL display relationship statistics including total memories created, total bucket list items completed, and total calendar events for the past year in an Instagram-Story-style paginated format.
5. WHILE the current date is not within 7 days of the yearly anniversary, THE Timeline_Screen SHALL hide the Anniversary_Banner.

### Requirement 7: Bucket List Map Toggle

**User Story:** As a user, I want to switch between a list view and a map view of my bucket list, so that I can visualize where our planned adventures are located.

#### Acceptance Criteria

1. THE BucketList_Screen SHALL display a Segmented_Control at the top with two options: "List" and "Map".
2. WHEN the user selects "List" on the Segmented_Control, THE BucketList_Screen SHALL display the existing FlatList of bucket list items.
3. WHEN the user selects "Map" on the Segmented_Control, THE BucketList_Screen SHALL display the Map_View using `react-native-maps`.
4. THE Segmented_Control SHALL default to the "List" option when the BucketList_Screen mounts.

### Requirement 8: Bucket List Location Data

**User Story:** As a user, I want to attach a location to bucket list items, so that they can be plotted on the map view.

#### Acceptance Criteria

1. THE AddToListModal SHALL include a Location_Search input field using Google Places Autocomplete.
2. WHEN the user selects a location from the Location_Search results, THE AddToListModal SHALL store the selected place name, latitude, and longitude.
3. WHEN the user saves a bucket list item with a selected location, THE App SHALL persist the latitude, longitude, and place name to the `bucket_list_items` table in Supabase.
4. THE Location_Search field SHALL be optional; the user SHALL be able to save a bucket list item without a location.

### Requirement 9: Bucket List Map Pins

**User Story:** As a user, I want to see uncompleted bucket list items as pins on the map, so that I can discover nearby adventures.

#### Acceptance Criteria

1. THE Map_View SHALL plot a custom pin marker for each uncompleted bucket list item that has latitude and longitude data.
2. THE Map_View SHALL not display pins for completed bucket list items.
3. WHEN the user taps a pin on the Map_View, THE App SHALL display the Pin_Preview_Modal showing the bucket list item's title and place name.
4. WHEN the user dismisses the Pin_Preview_Modal, THE Map_View SHALL remain at the same zoom level and position.

### Requirement 10: Skeleton Shimmer Loaders

**User Story:** As a user, I want to see animated skeleton placeholders while content loads, so that the app feels responsive and polished during data fetching.

#### Acceptance Criteria

1. THE App SHALL replace text-based loading indicators on the Timeline_Screen, Calendar_Screen, BucketList_Screen, and Connection_Screen with SkeletonCard components.
2. THE SkeletonCard SHALL display a shimmer animation using `expo-linear-gradient` and `react-native-reanimated`.
3. WHEN data finishes loading on a screen, THE App SHALL replace the SkeletonCard components with the actual content.

### Requirement 11: Lottie Micro-Interactions

**User Story:** As a user, I want to see a celebratory animation when I complete a bucket list item, so that the experience feels rewarding.

#### Acceptance Criteria

1. WHEN the user marks a bucket list item as completed, THE BucketList_Screen SHALL play a Lottie_Animation (neon checkmark with confetti) over the completed item.
2. THE Lottie_Animation SHALL play once to completion and then remove itself from the view hierarchy.
3. THE Lottie_Animation SHALL not block user interaction with other items on the screen while playing.

### Requirement 12: Ambient Mesh Gradients

**User Story:** As a user, I want to see animated gradient backgrounds on key screens, so that the app feels visually premium and immersive.

#### Acceptance Criteria

1. THE App SHALL replace the solid `#121212` background on the SplashScreen with a Mesh_Gradient featuring slow-moving, breathing color transitions.
2. THE App SHALL replace the solid `#121212` background on the PaywallModal with a Mesh_Gradient featuring slow-moving, breathing color transitions.
3. THE Mesh_Gradient animation SHALL loop continuously without visible stuttering or frame drops.

### Requirement 13: Daily Question Selection

**User Story:** As a user, I want to see a unique "Question of the Day" on the Connection screen, so that my partner and I have a fresh conversation starter each day.

#### Acceptance Criteria

1. THE App SHALL deterministically select one prompt from the existing `deep_questions.json` file as the Daily_Question based on the current date at midnight UTC.
2. THE Connection_Screen SHALL display the Daily_Question in a visually distinct card at the top of the screen, separate from the swipeable deck.
3. WHEN the date changes (crosses midnight UTC), THE Connection_Screen SHALL update to display the new Daily_Question.
4. THE Daily_Question selection SHALL cycle through all prompts before repeating, using a deterministic algorithm seeded by the date.

### Requirement 14: Streak Counter (Supabase)

**User Story:** As a user, I want to track how many consecutive days my partner and I discuss the Daily Question, so that we stay motivated to connect every day.

#### Acceptance Criteria

1. THE App SHALL create and use a `daily_streaks` table in Supabase with columns for `relationship_id`, `current_streak` (integer), `last_completed_date` (date), and `updated_at` (timestamp).
2. WHEN both partners in a Relationship have discussed the Daily_Question on the same calendar day, THE App SHALL increment the `current_streak` value by 1 and update `last_completed_date` to the current date.
3. IF a calendar day passes without both partners discussing the Daily_Question, THEN THE App SHALL reset `current_streak` to 0.
4. THE App SHALL not increment the streak more than once per calendar day per Relationship.

### Requirement 15: Streak Counter UI

**User Story:** As a user, I want to see my current streak displayed prominently on the Connection screen, so that I can track our progress at a glance.

#### Acceptance Criteria

1. THE Connection_Screen SHALL display the Streak_Counter at the top of the screen showing a 🔥 flame icon followed by the current streak count.
2. WHEN the current streak is 0, THE Streak_Counter SHALL display "🔥 0" with a dimmed visual style.
3. WHEN the current streak is greater than 0, THE Streak_Counter SHALL display the flame icon and count with a bright, active visual style.
4. WHEN the streak value changes in the Daily_Streaks_Table, THE Streak_Counter SHALL update in real time via Supabase realtime subscription.
