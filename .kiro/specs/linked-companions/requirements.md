# Requirements Document

## Introduction

The Linked Companions feature upgrades the existing single shared pet system to a Dual-Avatar Pet System. Each user in a relationship gets their own personalized pet character. Both pets coexist in a shared "digital room" rendered on screen, and users can interact with their partner's pet in real-time over the network using Supabase Realtime Broadcasts. This creates an intimate "telepresence" loop between partners and lays the groundwork for future monetization (accessories, room decor).

## Glossary

- **Pet**: A personalized digital avatar belonging to a single user, stored in the `pets` table with attributes like name, archetype, color, personality, and health.
- **Archetype**: The visual species of a Pet. One of: `cat`, `dog`, `bunny`, `bear`.
- **Personality**: A behavioral trait assigned to a Pet. One of: `energetic`, `grumpy`, `sleepy`, `shy`.
- **Pet_Room**: A shared visual space (UI container) where both partners' Pets are rendered side by side.
- **Interaction**: A real-time action one user sends targeting their partner's Pet. Types: `poke`, `hug`, `feed`, `kiss`.
- **Interaction_Engine**: The service layer (`petInteractionService.ts`) responsible for sending and receiving real-time Interactions via Supabase Broadcast channels.
- **Pet_Room_Channel**: A Supabase Realtime Broadcast channel scoped to a relationship, named `pet-room:{relationshipId}`.
- **RLS_Policy**: A Supabase Row Level Security policy that restricts data access based on the authenticated user's relationship membership.
- **Companion_Card**: The glassmorphism UI component (`LinkedCompanions.tsx`) that renders the Pet_Room with both Pets and interaction controls.
- **Health_Decay**: The existing mechanism that reduces Pet health over time based on inactivity.
- **TimelineScreen**: The main screen component (`src/screens/TimelineScreen.tsx`) that displays the memory feed, anniversary banner, and linked companions.

## Requirements

### Requirement 1: Pets Table Schema

**User Story:** As a developer, I want a dedicated `pets` table decoupled from the `relationships` table, so that each user owns an independent pet record with personalized attributes.

#### Acceptance Criteria

1. THE Pets_Table SHALL store each Pet with the following columns: `id` (UUID primary key), `user_id` (UUID, UNIQUE, foreign key to `auth.users`), `relationship_id` (UUID, foreign key to `relationships`), `name` (text), `archetype` (text, one of `cat`, `dog`, `bunny`, `bear`), `color_hex` (text), `personality` (text, one of `energetic`, `grumpy`, `sleepy`, `shy`), `health` (integer, default 100), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Pets_Table SHALL enforce a UNIQUE constraint on `user_id` so that each user owns exactly one Pet.
3. THE Pets_Table SHALL enforce a CHECK constraint on `archetype` limiting values to `cat`, `dog`, `bunny`, `bear`.
4. THE Pets_Table SHALL enforce a CHECK constraint on `personality` limiting values to `energetic`, `grumpy`, `sleepy`, `shy`.
5. THE Pets_Table SHALL enforce a CHECK constraint on `health` limiting values to the range 0 through 100 inclusive.
6. THE Pets_Table SHALL validate `color_hex` as a 7-character string matching the pattern `#RRGGBB`.

### Requirement 2: Row Level Security for Pets

**User Story:** As a user, I want my pet data to be accessible only to me and my partner, so that our pets remain private to our relationship.

#### Acceptance Criteria

1. THE RLS_Policy SHALL allow SELECT on the `pets` table only for rows where the Pet's `relationship_id` matches the authenticated user's relationship (determined via `get_my_relationship_id()`).
2. THE RLS_Policy SHALL allow INSERT on the `pets` table only when the `user_id` matches the authenticated user's ID and the `relationship_id` matches the authenticated user's relationship.
3. THE RLS_Policy SHALL allow UPDATE on the `pets` table only for rows where the `user_id` matches the authenticated user's ID.
4. THE RLS_Policy SHALL prevent DELETE operations on the `pets` table for all users.

### Requirement 3: Realtime Publication for Pets

**User Story:** As a developer, I want the `pets` table added to the Supabase Realtime publication, so that pet state changes propagate to connected clients instantly.

#### Acceptance Criteria

1. THE Database SHALL include the `pets` table in the `supabase_realtime` publication.
2. WHEN a Pet record is inserted or updated, THE Realtime_System SHALL broadcast the change to all subscribers on the corresponding Pet_Room_Channel.

### Requirement 4: Pet Creation

**User Story:** As a user, I want to create my own pet with a chosen name, archetype, color, and personality, so that I have a personalized companion.

#### Acceptance Criteria

1. WHEN a user submits a valid pet creation form with name, archetype, color_hex, and personality, THE Pet_Service SHALL insert a new Pet record into the `pets` table with the authenticated user's `user_id` and `relationship_id`.
2. IF a user already has a Pet record, THEN THE Pet_Service SHALL return an error indicating that the user already owns a Pet.
3. WHEN a Pet is created, THE Pet_Service SHALL set the initial `health` to 100.
4. IF the provided archetype is not one of `cat`, `dog`, `bunny`, `bear`, THEN THE Pet_Service SHALL return a validation error.
5. IF the provided personality is not one of `energetic`, `grumpy`, `sleepy`, `shy`, THEN THE Pet_Service SHALL return a validation error.
6. IF the provided color_hex does not match the `#RRGGBB` pattern, THEN THE Pet_Service SHALL return a validation error.

### Requirement 5: Pet Loading for Dual Display

**User Story:** As a user, I want to see both my pet and my partner's pet in the shared room, so that we have a sense of togetherness.

#### Acceptance Criteria

1. WHEN the Companion_Card mounts, THE Pet_Service SHALL fetch both the authenticated user's Pet and the partner's Pet from the `pets` table filtered by `relationship_id`.
2. IF the authenticated user does not have a Pet, THEN THE Companion_Card SHALL display a pet creation prompt instead of the Pet_Room.
3. IF the partner does not have a Pet, THEN THE Companion_Card SHALL render the user's Pet alone with a placeholder indicating the partner has not created a Pet yet.
4. THE Pet_Service SHALL return each Pet's name, archetype, color_hex, personality, and health to the Companion_Card.

### Requirement 6: Real-Time Interaction Sending

**User Story:** As a user, I want to send interactions (poke, hug, feed, kiss) to my partner's pet, so that I can playfully engage with my partner remotely.

#### Acceptance Criteria

1. WHEN a user taps the partner's Pet in the Companion_Card, THE Interaction_Engine SHALL send a broadcast message on the Pet_Room_Channel with the payload: `{ type: InteractionType, fromUserId: string, targetPetId: string, timestamp: number }`.
2. THE Interaction_Engine SHALL support the following interaction types: `poke`, `hug`, `feed`, `kiss`.
3. IF the Pet_Room_Channel is not connected, THEN THE Interaction_Engine SHALL queue the interaction and retry sending when the channel reconnects.
4. THE Interaction_Engine SHALL include a timestamp in each broadcast payload to enable ordering and deduplication on the receiving end.

### Requirement 7: Real-Time Interaction Receiving

**User Story:** As a user, I want to see and feel when my partner interacts with my pet, so that I experience a real-time connection.

#### Acceptance Criteria

1. WHEN the Companion_Card mounts, THE Interaction_Engine SHALL subscribe to the Pet_Room_Channel scoped to the user's `relationshipId`.
2. WHEN a broadcast message is received on the Pet_Room_Channel, THE Interaction_Engine SHALL invoke the registered callback with the parsed interaction payload.
3. THE Interaction_Engine SHALL ignore broadcast messages where `fromUserId` matches the authenticated user's own ID (to prevent self-echo).
4. WHEN an interaction is received targeting the user's Pet, THE Companion_Card SHALL trigger a haptic feedback response using `expo-haptics`.
5. WHEN an interaction is received targeting the user's Pet, THE Companion_Card SHALL play a corresponding animation on the Pet avatar (e.g., bounce for poke, glow for hug, sparkle for feed, heart pulse for kiss).

### Requirement 8: Dual-Avatar Pet Room UI

**User Story:** As a user, I want a visually appealing shared room where both pets are displayed with their unique appearances, so that the experience feels intimate and personal.

#### Acceptance Criteria

1. THE Companion_Card SHALL render a glassmorphism-styled container with semi-transparent background and blur effect to serve as the Pet_Room.
2. THE Companion_Card SHALL render each Pet as an emoji representation based on the Pet's archetype (cat → 🐱, dog → 🐶, bunny → 🐰, bear → 🐻) tinted with the Pet's `color_hex`.
3. THE Companion_Card SHALL animate each Pet with a continuous idle breathing animation using `react-native-reanimated`.
4. THE Companion_Card SHALL display each Pet's name below the Pet avatar.
5. THE Companion_Card SHALL display a status text area showing the last interaction that occurred (e.g., "Partner poked your cat!").
6. THE Companion_Card SHALL position the user's Pet on the left side and the partner's Pet on the right side of the Pet_Room.

### Requirement 9: Interaction Gesture Handling

**User Story:** As a user, I want to tap on my partner's pet to trigger an interaction, so that the interaction feels natural and intuitive.

#### Acceptance Criteria

1. WHEN a user taps the partner's Pet avatar, THE Companion_Card SHALL send a `poke` interaction via the Interaction_Engine.
2. WHEN a user long-presses the partner's Pet avatar, THE Companion_Card SHALL display a context menu with interaction options: `hug`, `feed`, `kiss`.
3. WHEN a user selects an interaction from the context menu, THE Companion_Card SHALL send the selected interaction via the Interaction_Engine and dismiss the menu.
4. THE Companion_Card SHALL prevent interaction gestures on the user's own Pet avatar (interactions target only the partner's Pet).

### Requirement 10: Pet Health Integration

**User Story:** As a developer, I want the new per-user pet health system to integrate with the existing health decay and feeding mechanics, so that the transition from the old single-pet model is seamless.

#### Acceptance Criteria

1. THE Pet_Service SHALL apply the existing Health_Decay logic (15 health per day of inactivity) to each Pet individually based on the Pet's own `updated_at` timestamp.
2. WHEN a `feed` interaction is received, THE Pet_Service SHALL increase the target Pet's health by 5, capped at 100.
3. WHEN a Pet's health changes, THE Pet_Service SHALL update the Pet's `updated_at` timestamp and persist the change to the `pets` table.
4. THE Companion_Card SHALL display each Pet's current health as a visual health bar beneath the Pet avatar.

### Requirement 11: Channel Lifecycle Management

**User Story:** As a developer, I want proper lifecycle management for the Pet_Room_Channel, so that resources are cleaned up and reconnections are handled gracefully.

#### Acceptance Criteria

1. WHEN the Companion_Card unmounts, THE Interaction_Engine SHALL unsubscribe from the Pet_Room_Channel and remove the channel from the Supabase client.
2. WHEN the Pet_Room_Channel connection status changes, THE Interaction_Engine SHALL update the connection status in the app store.
3. WHEN the Pet_Room_Channel reconnects after a disconnection, THE Interaction_Engine SHALL re-fetch both Pets' current state from the `pets` table to reconcile any missed updates.
4. THE Interaction_Engine SHALL integrate with the existing `realtimeManager` unsubscribe-all flow so that logging out cleans up the Pet_Room_Channel.

### Requirement 12: TimelineScreen Integration

**User Story:** As a user, I want to see my linked companion pets on the timeline screen, so that the pet room is visible as part of my daily experience alongside memories.

#### Acceptance Criteria

1. THE TimelineScreen SHALL import the LinkedCompanions component from `../components/LinkedCompanions`.
2. THE TimelineScreen SHALL maintain a `pets` state array (initialized as empty) to hold Pet records fetched from the `pets` table.
3. WHEN the TimelineScreen mounts and a `relationshipId` is available, THE TimelineScreen SHALL fetch all Pet records from the `pets` table filtered by `relationship_id` matching the current `relationshipId`, within the existing `useEffect` that fetches memories.
4. THE TimelineScreen SHALL determine the `myPet` prop by selecting the Pet record where `user_id` matches the authenticated user's `currentUserId`.
5. THE TimelineScreen SHALL determine the `partnerPet` prop by selecting the Pet record where `user_id` does not match the authenticated user's `currentUserId`.
6. WHEN `pets.length` is greater than 0, THE TimelineScreen SHALL render the LinkedCompanions component inside the FlatList's `ListHeaderComponent`, positioned after the AnniversaryBanner component.
7. WHEN `pets.length` is 0, THE TimelineScreen SHALL omit the LinkedCompanions component from the `ListHeaderComponent`.

### Requirement 13: Manual Testing Setup for Pets

**User Story:** As a developer, I want to manually seed pet data for testing, so that I can verify the linked companions feature end-to-end without building a pet creation UI first.

#### Acceptance Criteria

1. THE Developer SHALL insert two rows into the `pets` table using the Supabase Dashboard, one row with `user_id` set to the test user's ID and one row with `user_id` set to the test partner's ID, both sharing the same `relationship_id`.
2. WHEN the two test Pet rows are inserted, THE TimelineScreen SHALL display the LinkedCompanions component with the correct `myPet` and `partnerPet` assignments based on the authenticated user's ID.
