# Implementation Plan: Linked Companions

## Overview

Transform the single shared pet system into a dual-avatar system where each user owns an independent pet. Implementation proceeds bottom-up: database migration → service layer (CRUD + real-time) → UI component → screen integration. TypeScript throughout.

## Tasks

- [x] 1. Create `pets` table migration and RLS policies
  - [x] 1.1 Create SQL migration file with `pets` table schema
    - Create `supabase/migrations/<timestamp>_create_pets_table.sql`
    - Define all columns: `id`, `user_id`, `relationship_id`, `name`, `archetype`, `color_hex`, `personality`, `health`, `created_at`, `updated_at`
    - Add UNIQUE constraint on `user_id`
    - Add CHECK constraints on `archetype` (cat, dog, bunny, bear), `personality` (energetic, grumpy, sleepy, shy), `color_hex` (regex `^#[0-9A-Fa-f]{6}$`), `health` (0–100)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.2 Add RLS policies and realtime publication
    - Enable RLS on `pets` table
    - Create `pets_select` policy using `get_my_relationship_id()`
    - Create `pets_insert` policy checking `user_id = auth.uid()` AND `relationship_id = get_my_relationship_id()`
    - Create `pets_update` policy checking `user_id = auth.uid()`
    - No DELETE policy (blocked by default)
    - Add `pets` to `supabase_realtime` publication
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

- [x] 2. Extend `petService.ts` with Pet types, validation, and CRUD
  - [x] 2.1 Add Pet types and validation functions
    - Add `Archetype`, `Personality`, `InteractionType` type aliases
    - Add `Pet` interface with all fields
    - Implement `isValidArchetype`, `isValidPersonality`, `isValidColorHex` validation functions
    - Implement `archetypeToEmoji` mapping function (cat→🐱, dog→🐶, bunny→🐰, bear→🐻)
    - Implement `formatInteractionStatus` function for status text
    - _Requirements: 1.3, 1.4, 1.6, 4.4, 4.5, 4.6, 8.2, 8.5_
  - [ ]* 2.2 Write property tests for validation functions (Properties 1–3, 6, 8–9)
    - **Property 1: Archetype validation accepts only valid values**
    - **Validates: Requirements 1.3, 4.4**
    - **Property 2: Personality validation accepts only valid values**
    - **Validates: Requirements 1.4, 4.5**
    - **Property 3: Color hex validation accepts only valid #RRGGBB strings**
    - **Validates: Requirements 1.6, 4.6**
    - **Property 6: Interaction type validation accepts only valid types**
    - **Validates: Requirements 6.2**
    - **Property 8: Archetype-to-emoji mapping is total and correct**
    - **Validates: Requirements 8.2**
    - **Property 9: Status text formatting includes interaction type and pet name**
    - **Validates: Requirements 8.5**
  - [x] 2.3 Implement `fetchPetsForRelationship` and `createPet`
    - `fetchPetsForRelationship(relationshipId)` queries `pets` table filtered by `relationship_id`
    - `createPet({ name, archetype, color_hex, personality, relationshipId })` validates inputs, inserts row with `user_id` from auth, health=100
    - Handle duplicate `user_id` Postgres error (code 23505) with user-friendly message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.4_
  - [ ]* 2.4 Write property test for pet creation round-trip (Property 4)
    - **Property 4: Pet creation round-trip preserves all fields and sets health to 100**
    - **Validates: Requirements 4.1, 4.3**
  - [x] 2.5 Implement `decayPetHealth` and `boostPetHealth`
    - `decayPetHealth(pet, now)` — pure function: `max(0, health - 15 * floor(daysSinceUpdate))`, 0 decay if `updated_at` is in the future
    - `boostPetHealth(petId, amount)` — persists `min(100, health + amount)` to DB, updates `updated_at`
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ]* 2.6 Write property tests for health logic (Properties 11–12)
    - **Property 11: Health decay calculation**
    - **Validates: Requirements 10.1**
    - **Property 12: Health invariant — always in [0, 100] after any operation**
    - **Validates: Requirements 1.5, 10.2**
  - [x] 2.7 Implement pet assignment helper (`assignPets`)
    - Given a `Pet[]` and `currentUserId`, return `{ myPet, partnerPet }` where each is `Pet | null`
    - _Requirements: 12.4, 12.5_
  - [ ]* 2.8 Write property test for pet assignment (Property 13)
    - **Property 13: Pet assignment from array correctly identifies myPet and partnerPet**
    - **Validates: Requirements 12.4, 12.5**

- [x] 3. Checkpoint — Validate service layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create `petInteractionService.ts` for real-time broadcast interactions
  - [x] 4.1 Implement `subscribeToPetRoom` and `sendInteraction`
    - Define `InteractionPayload` interface (`type`, `fromUserId`, `targetPetId`, `timestamp`)
    - `subscribeToPetRoom(relationshipId, currentUserId, onInteraction)` — creates channel `pet-room:{relationshipId}`, filters self-echo (`fromUserId === currentUserId`), returns `RealtimeChannel`
    - `sendInteraction(channel, payload)` — broadcasts payload, queues if channel disconnected, flushes on reconnect
    - Push channel to `realtimeManager` active channels for cleanup on logout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 11.1, 11.2, 11.4_
  - [ ]* 4.2 Write property tests for interaction service (Properties 5, 7, 10)
    - **Property 5: Interaction payload contains all required fields**
    - **Validates: Requirements 6.1, 6.4**
    - **Property 7: Self-echo filtering ignores own messages**
    - **Validates: Requirements 7.3**
    - **Property 10: Own-pet interaction prevention**
    - **Validates: Requirements 9.4**

- [x] 5. Create `LinkedCompanions.tsx` component
  - [x] 5.1 Build dual-avatar Pet Room UI
    - Create `src/components/LinkedCompanions.tsx` accepting `{ myPet, partnerPet, relationshipId }` props
    - Render glassmorphism container (semi-transparent bg + blur + borderRadius)
    - Render two pet avatars side-by-side: user's pet left, partner's pet right, using archetype→emoji mapping tinted with `color_hex`
    - Add idle breathing animation via `react-native-reanimated` (`withRepeat` + `withSequence` + `withTiming`)
    - Display pet names below each avatar
    - Display health bar for each pet
    - Display status text showing last interaction
    - Handle null states: creation prompt if `myPet` is null, "Waiting for partner" placeholder if `partnerPet` is null
    - _Requirements: 5.2, 5.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.4_
  - [x] 5.2 Add interaction gestures and real-time wiring
    - Tap partner's pet → send `poke` interaction
    - Long-press partner's pet → show context menu with `hug`, `feed`, `kiss`
    - Disable gestures on own pet avatar
    - Subscribe to `pet-room` channel on mount via `petInteractionService`
    - On receiving interaction: trigger haptic feedback (`expo-haptics`), play reaction animation (bounce/glow/sparkle/heart-pulse)
    - On `feed` interaction received: call `boostPetHealth(targetPetId, 5)`
    - Unsubscribe and remove channel on unmount
    - Handle reconnection: re-fetch pets on channel reconnect
    - _Requirements: 6.1, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 10.2, 11.1, 11.2, 11.3_

- [x] 6. Integrate `LinkedCompanions` into `TimelineScreen.tsx`
  - [x] 6.1 Add pets state and fetch logic
    - Import `LinkedCompanions` from `../components/LinkedCompanions`
    - Add `useState<Pet[]>([])` for pets
    - Fetch pets via `fetchPetsForRelationship(relationshipId)` in the existing `useEffect` that runs on `relationshipId`
    - Derive `myPet` and `partnerPet` using `assignPets` helper with `currentUserId`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 6.2 Render `LinkedCompanions` in `ListHeaderComponent`
    - When `pets.length > 0`, render `LinkedCompanions` after `AnniversaryBanner` in `ListHeaderComponent`
    - When `pets.length === 0`, omit `LinkedCompanions`
    - Pass `myPet`, `partnerPet`, and `relationshipId` as props
    - _Requirements: 12.6, 12.7_

- [x] 7. Final checkpoint — Full integration validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` minimum
- Checkpoints ensure incremental validation between layers
