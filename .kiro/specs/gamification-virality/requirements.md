# Requirements Document

## Introduction

This feature adds two engagement and virality mechanics to the WeDo couples app: a "Relationship Pet" (Tamagotchi-style virtual companion) that couples nurture through in-app actions, and a "Relationship Wrapped" (Instagram-Story-style shareable year-in-review) that drives organic app installs through social sharing. Both features operate within the existing $0 server cost architecture using client-side logic and Supabase.

## Glossary

- **Pet_System**: The Relationship Pet subsystem responsible for managing pet state, health decay, feeding, evolution, and rendering.
- **Pet**: A digital companion (displayed as a Lottie animation) assigned to a couple's relationship, with health and experience attributes.
- **Love_Meter**: A numeric health value (0–100) representing the Pet's current wellbeing, displayed as a progress bar.
- **Pet_XP**: A cumulative experience point total that determines the Pet's evolution stage.
- **Evolution_Stage**: One of four growth phases — Egg, Baby, Teen, Adult — determined by Pet_XP thresholds.
- **Feeding_Action**: An in-app event (memory creation, bucket list completion, daily question answer, or double-tap heart) that increases Pet health and XP.
- **Decay_Logic**: Client-side calculation that reduces Pet health based on elapsed time since the last feeding, computed on app load.
- **Wrapped_System**: The Relationship Wrapped subsystem responsible for generating and exporting the shareable year-in-review experience.
- **Wrapped_Card**: A single full-screen page within the Relationship Wrapped experience, displaying a statistic or summary with animated typography and gradient backgrounds.
- **Summary_Export_Card**: The final Wrapped_Card containing the app watermark, designed for social media sharing.
- **Share_Sheet**: The native OS share dialog opened via expo-sharing to distribute an exported image.
- **RelationshipPet_Component**: The React Native UI component rendering the Pet above the AnniversaryBanner on the TimelineScreen.
- **Relationship**: The paired couple entity in the `relationships` Supabase table, identified by `relationship_id`.

## Requirements

### Requirement 1: Pet Initialization on Pairing

**User Story:** As a coupled user, I want to receive a digital pet when my partner and I pair accounts, so that we have a shared companion to nurture together.

#### Acceptance Criteria

1. WHEN a couple completes account pairing, THE Pet_System SHALL create a Pet record on the Relationship with pet_health set to 100, pet_total_xp set to 0, and pet_last_fed_at set to the current timestamp.
2. WHEN a couple completes account pairing, THE Pet_System SHALL set the Evolution_Stage to Egg.
3. THE Pet_System SHALL store pet_name, pet_health, pet_total_xp, and pet_last_fed_at as columns on the `relationships` table.
4. WHEN a user opens the app and has a paired Relationship, THE RelationshipPet_Component SHALL render above the AnniversaryBanner on the TimelineScreen.

### Requirement 2: Health Decay Calculation

**User Story:** As a coupled user, I want the pet's health to decay over time when we are inactive, so that we are motivated to engage with the app regularly.

#### Acceptance Criteria

1. WHEN the app loads and a Pet exists, THE Decay_Logic SHALL calculate health reduction as: `days_elapsed × 15`, where `days_elapsed` is the number of full days since pet_last_fed_at.
2. THE Decay_Logic SHALL cap the Love_Meter at a minimum of 0 after applying decay.
3. THE Decay_Logic SHALL execute entirely on the client side without requiring backend cron jobs or scheduled functions.
4. WHEN the Decay_Logic computes a new health value, THE Pet_System SHALL persist the updated pet_health to the Relationship record in Supabase.

### Requirement 3: Pet Feeding Mechanics

**User Story:** As a coupled user, I want to increase my pet's health and XP by completing meaningful in-app actions, so that our engagement is rewarded.

#### Acceptance Criteria

1. WHEN a user creates a new memory (memory insert), THE Pet_System SHALL increase pet_health by 20 (capped at 100) and pet_total_xp by 20, and update pet_last_fed_at to the current timestamp.
2. WHEN a user completes a bucket list item, THE Pet_System SHALL increase pet_health by 20 (capped at 100) and pet_total_xp by 20, and update pet_last_fed_at to the current timestamp.
3. WHEN a user answers the daily connection question, THE Pet_System SHALL increase pet_health by 20 (capped at 100) and pet_total_xp by 20, and update pet_last_fed_at to the current timestamp.
4. WHEN a user sends a double-tap heart on a memory, THE Pet_System SHALL increase pet_health by 5 (capped at 100) and pet_total_xp by 5, and update pet_last_fed_at to the current timestamp.
5. THE Pet_System SHALL persist all feeding updates (pet_health, pet_total_xp, pet_last_fed_at) to the Relationship record in Supabase after each Feeding_Action.

### Requirement 4: Pet Evolution

**User Story:** As a coupled user, I want to see our pet grow and evolve as we accumulate XP, so that we feel a sense of long-term progression.

#### Acceptance Criteria

1. THE Pet_System SHALL determine Evolution_Stage based on pet_total_xp using the following thresholds: Egg (0–99 XP), Baby (100–499 XP), Teen (500–999 XP), Adult (1000+ XP).
2. WHEN pet_total_xp crosses an Evolution_Stage threshold, THE RelationshipPet_Component SHALL display the corresponding Lottie animation for the new stage.
3. THE Pet_System SHALL derive Evolution_Stage from pet_total_xp on every render without storing it as a separate database column.

### Requirement 5: Pet UI and Animations

**User Story:** As a coupled user, I want to see my pet with expressive animations and a visible health bar, so that I can quickly understand its state.

#### Acceptance Criteria

1. THE RelationshipPet_Component SHALL render a Lottie animation using lottie-react-native corresponding to the current Pet mood.
2. WHILE pet_health is below 30, THE RelationshipPet_Component SHALL display the Sad animation.
3. WHILE pet_health is 30 or above, THE RelationshipPet_Component SHALL display the Happy animation.
4. THE RelationshipPet_Component SHALL display a health bar with width proportional to pet_health percentage and a Soft Coral (#FF7F50) background color.
5. THE RelationshipPet_Component SHALL display the pet_name above the Lottie animation.
6. THE RelationshipPet_Component SHALL render above the AnniversaryBanner in the TimelineScreen FlatList header.

### Requirement 6: Pet Inactivity Notification

**User Story:** As a coupled user, I want to receive a push notification when our pet has been neglected, so that I am reminded to engage with the app.

#### Acceptance Criteria

1. WHEN pet_health reaches 0 due to 7 or more days of inactivity, THE Pet_System SHALL schedule a local push notification with the message "Your pet misses you both! 🥺".
2. THE Pet_System SHALL schedule the notification using client-side local notification APIs without requiring a backend push service.
3. IF the user has disabled push notifications at the OS level, THEN THE Pet_System SHALL skip notification scheduling without error.

### Requirement 7: Relationship Wrapped Experience

**User Story:** As a coupled user, I want to view an auto-playing Instagram-Story-style year-in-review, so that I can celebrate our relationship milestones.

#### Acceptance Criteria

1. WHEN the user opens the Relationship Wrapped screen, THE Wrapped_System SHALL display a sequence of full-screen Wrapped_Cards using react-native-pager-view with horizontal snapping navigation.
2. THE Wrapped_System SHALL display the following pages in order: intro card, memory count card, adventure count (completed bucket list items) card, and Summary_Export_Card.
3. THE Wrapped_System SHALL render each Wrapped_Card with a mesh gradient background and large animated typography.
4. THE Wrapped_System SHALL fetch memory count and completed bucket list item count from Supabase for the current Relationship within the past year.
5. THE Wrapped_System SHALL replace the existing FlatList-based YearInReviewModal with the new pager-view-based implementation.

### Requirement 8: Wrapped Social Sharing

**User Story:** As a coupled user, I want to export and share my Relationship Wrapped summary card to social media, so that I can celebrate our relationship publicly and introduce friends to WeDo.

#### Acceptance Criteria

1. THE Summary_Export_Card SHALL include a visible app watermark reading "Made with WeDo".
2. WHEN the user taps the share button on the Summary_Export_Card, THE Wrapped_System SHALL capture the card as a JPG image using react-native-view-shot.
3. WHEN the card image is captured, THE Wrapped_System SHALL open the native Share_Sheet using expo-sharing to allow the user to share the image.
4. IF the image capture fails, THEN THE Wrapped_System SHALL display an error message to the user.
5. IF the Share_Sheet is unavailable on the device, THEN THE Wrapped_System SHALL display a message indicating sharing is not supported.

### Requirement 9: Wrapped Progress Indicator

**User Story:** As a coupled user, I want to see my progress through the Wrapped experience, so that I know how many cards remain.

#### Acceptance Criteria

1. THE Wrapped_System SHALL display a progress bar at the top of the screen showing the current card position relative to the total number of cards.
2. WHEN the user navigates between Wrapped_Cards, THE Wrapped_System SHALL update the progress bar to reflect the active card index.

### Requirement 10: New Dependency Integration

**User Story:** As a developer, I want the required third-party packages installed, so that the Relationship Pet and Wrapped features can function.

#### Acceptance Criteria

1. THE WeDo app SHALL include react-native-view-shot as a project dependency.
2. THE WeDo app SHALL include expo-sharing as a project dependency.
3. THE WeDo app SHALL include react-native-pager-view as a project dependency.
4. THE WeDo app SHALL continue to use the existing lottie-react-native dependency for Pet animations.
