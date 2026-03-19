# Implementation Plan: Garden Metaverse & Quest Engine

## Overview

Incrementally build the garden background, roaming engine, food inventory service, quest payouts, and drag-to-feed interaction on top of the existing TimelineScreen. Each task builds on the previous, wiring components together progressively. TypeScript throughout, using Reanimated, react-native-svg, expo-linear-gradient, react-native-gesture-handler, Zustand, and fast-check for PBT.

## Tasks

- [x] 1. Database migration and inventory food service
  - [x] 1.1 Add `inventory_food` column to `relationships` table
    - Write a Supabase migration SQL file adding `inventory_food integer NOT NULL DEFAULT 0 CHECK (inventory_food >= 0)` to the `relationships` table
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Create `src/services/inventoryFoodService.ts`
    - Implement `fetchFoodInventory(relationshipId): Promise<number>` — reads `inventory_food` from `relationships` table
    - Implement `incrementFood(relationshipId, amount): Promise<number>` — adds amount to `inventory_food`, updates AppStore, returns new count
    - Implement `decrementFood(relationshipId, amount): Promise<number>` — subtracts amount, throws if would go negative, updates AppStore, returns new count
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ]* 1.3 Write property tests for inventory food service (fast-check)
    - **Property 7: Food inventory increment/decrement round trip**
    - **Validates: Requirements 16.1, 16.2**

  - [ ]* 1.4 Write property test for decrement rejection
    - **Property 8: Decrement rejects negative inventory**
    - **Validates: Requirements 16.3**

  - [ ]* 1.5 Write unit tests for `inventoryFoodService`
    - Test `fetchFoodInventory` returns correct value from mock
    - Test `incrementFood` / `decrementFood` with mocked Supabase calls
    - Test `decrementFood` rejection when amount > current inventory
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 2. AppStore state additions and time-of-day hook
  - [x] 2.1 Add `inventoryFood` and `setInventoryFood` to AppStore
    - Add `inventoryFood: number` (default 0) and `setInventoryFood: (value: number) => void` to the Zustand store in `src/store/appStore.ts`
    - _Requirements: 14.1, 14.2_

  - [x] 2.2 Create `src/hooks/useTimeOfDay.ts`
    - Implement `getTimeOfDay(hour: number): TimeOfDay` pure function mapping hours to `'dawn' | 'day' | 'sunset' | 'night'`
    - Implement `useTimeOfDay()` hook that returns current time period, recalculates on mount and on AppState `active` event
    - Export `getTimeOfDay` for testing
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.3 Write property test for hour-to-palette mapping
    - **Property 1: Hour-to-palette mapping covers all 24 hours correctly**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [ ]* 2.4 Write unit tests for `useTimeOfDay`
    - Test `getTimeOfDay` returns correct period for boundary hours (5, 10, 11, 16, 17, 20, 21, 0, 4)
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Garden background components
  - [x] 4.1 Create `src/components/GardenBackground.tsx`
    - Implement `getGradientColorsForHour(hour: number): string[]` pure function returning sky palette colors based on time of day
    - Render a full-screen `<LinearGradient>` for the sky using `expo-linear-gradient`
    - Render an SVG `<Path>` for the ground area (bottom 40% of screen) with a soft curved top edge using `react-native-svg`
    - Ground fill color should complement the active sky palette
    - Use `Dimensions` API for proportional scaling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 4.2 Write property test for ground SVG scaling
    - **Property 2: Ground SVG scales proportionally to screen dimensions**
    - **Validates: Requirements 2.3**

  - [ ]* 4.3 Write unit tests for `GardenBackground`
    - Test `getGradientColorsForHour` returns the correct color array for each time period
    - Test ground SVG path generation for a known screen size (e.g., 390×844)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.3_

- [x] 5. Roaming engine hook
  - [x] 5.1 Create `src/hooks/useRoamingEngine.ts`
    - Define `GroundBounds` interface: `{ top, bottom, left, right }`
    - Implement `generateRoamDestination(bounds: GroundBounds): { x: number, y: number }` — random point within bounds (X: 10%-90% width, Y: 60%-100% height)
    - Implement `clampToGroundBounds(x, y, bounds): { x: number, y: number }` — clamps arbitrary coordinates to valid ground area
    - Implement `computeWalkDuration(from, to): number` — returns duration in [3000, 7000] ms based on distance
    - Implement `generatePauseDuration(): number` — returns random duration in [2000, 5000] ms
    - Implement `getFacingDirection(currentX, destX): 'left' | 'right'` — returns direction based on travel
    - Implement `useRoamingEngine(groundBounds, enabled)` hook returning `{ animatedStyle, setAttractTarget, facingDirection }`
    - Use Reanimated shared values for `translateX`, `translateY`, `facingDirection`
    - Run pick → walk (withTiming, ease-in-out) → pause → repeat loop
    - Support `setAttractTarget(pos)` to interrupt roaming and move to food at faster speed (1-2s)
    - Support `setAttractTarget(null)` to resume normal roaming
    - Skip roaming if ground bounds have zero dimensions
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 12.1, 12.2, 12.3, 12.6_

  - [ ]* 5.2 Write property test for roam destination bounds
    - **Property 3: Generated roam destinations are within ground bounds**
    - **Validates: Requirements 4.2, 5.1, 5.2**

  - [ ]* 5.3 Write property test for clamping idempotence
    - **Property 4: Clamping produces valid coordinates and is idempotent**
    - **Validates: Requirements 5.3**

  - [ ]* 5.4 Write property test for walk and pause durations
    - **Property 5: Walk and pause durations are within configured ranges**
    - **Validates: Requirements 4.3, 4.6**

  - [ ]* 5.5 Write property test for facing direction
    - **Property 6: Facing direction matches travel direction**
    - **Validates: Requirements 4.4, 12.2**

  - [ ]* 5.6 Write unit tests for roaming engine pure functions
    - Test `clampToGroundBounds` with coordinates already inside bounds (no-op)
    - Test `clampToGroundBounds` with coordinates outside each edge
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Garden pet layer and food bowl components
  - [x] 7.1 Create `src/components/GardenPetLayer.tsx`
    - Render both pet avatars (myPet, partnerPet) with absolute positioning within the ground area
    - Use `useRoamingEngine` hook for each pet to drive autonomous movement
    - Apply roaming animated styles combined with existing breathing animation transforms
    - Flip pet SVG horizontally based on `facingDirection` shared value
    - Accept `foodPosition` prop; when set, call `setAttractTarget` on both pets
    - Fire `onEatingComplete` callback when both pets arrive at food position
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.7, 4.8, 12.1, 12.2, 12.3, 12.4, 12.6, 15.2_

  - [x] 7.2 Create `src/components/PlacedFoodBowl.tsx`
    - Render an SVG food bowl at given (x, y) coordinates on the ground
    - Accept `visible` prop to show/hide
    - _Requirements: 11.2, 12.4_

  - [x] 7.3 Create `src/components/FoodBowlOverlay.tsx`
    - Render a floating Food Bowl icon in the bottom-right corner with absolute positioning and high zIndex
    - Display `inventoryFood` count as a badge number
    - Dim/gray out icon when inventory is 0
    - Implement `PanGestureHandler` for drag-to-feed gesture
    - Draggable food bowl sprite follows finger position during drag
    - On release within ground bounds: call `onFoodPlaced(x, y)` callback
    - On release outside ground bounds: animate sprite back to icon position, no placement
    - Prevent drag initiation when inventory is 0
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.4, 11.5, 15.3_

  - [ ]* 7.4 Write property test for drop validation
    - **Property 9: Drop validation matches ground bounds**
    - **Validates: Requirements 11.2, 11.5**

  - [ ]* 7.5 Write unit tests for FoodBowlOverlay
    - Test Food Bowl icon renders dimmed when inventory is 0
    - _Requirements: 10.3_

- [x] 8. Wire garden into TimelineScreen
  - [x] 8.1 Integrate garden layers into `src/screens/TimelineScreen.tsx`
    - Replace solid `#FAFAFA` background with `<GardenBackground />` as absolute-positioned bottom layer
    - Add `<GardenPetLayer />` as absolute-positioned layer above ground, below FlatList
    - Add `<PlacedFoodBowl />` layer between pet layer and FlatList
    - Add `<FoodBowlOverlay />` as topmost fixed overlay
    - Set FlatList `backgroundColor: 'transparent'` so garden is visible behind cards
    - Memory polaroid cards retain their existing opaque `#FAFAFA` card styling
    - Maintain existing FlatList padding and spacing
    - Garden background and pet avatars remain stationary while FlatList scrolls
    - Remove `LinkedCompanions` from FlatList `ListHeaderComponent` (pets now in garden layer)
    - Enforce z-index layering: Sky → Ground → Pets → Food → FlatList → Food Bowl Icon
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 15.1, 15.2, 15.3_

  - [x] 8.2 Add food inventory hydration and feeding orchestration to TimelineScreen
    - Fetch `inventoryFood` on mount via `fetchFoodInventory`, hydrate AppStore
    - Manage food placement state (`foodPosition`)
    - On food placed: decrement inventory via `decrementFood`, set `foodPosition` for pet attraction
    - On eating complete: grant 10 XP via `feedPet`, play Lottie `petHappy.json` burst animation, clear `foodPosition` to resume roaming
    - Handle evolution stage crossing detection and visual celebration
    - Update AppStore reactively on all inventory and XP changes
    - _Requirements: 10.4, 10.5, 11.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 14.3, 14.4_

  - [ ]* 8.3 Write property test for evolution stage detection
    - **Property 11: Evolution stage threshold crossing detection**
    - **Validates: Requirements 13.3**

- [x] 9. Quest payout integration
  - [x] 9.1 Add quest payout to `src/components/DailyQuestionCard.tsx`
    - After `markDiscussed` succeeds, call `incrementFood(relationshipId, 1)` from `inventoryFoodService`
    - Silently ignore errors from the food increment without blocking the discussion flow
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.2 Add quest payout to `src/screens/BucketListScreen.tsx`
    - In `handleToggleComplete`, when item transitions from incomplete to complete, call `incrementFood(relationshipId, 3)`
    - Do NOT decrement when unchecking a completed item
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 9.3 Add quest payout to `src/components/MemoryCreationModal.tsx`
    - After successful memory insert (photo upload + DB insert), call `incrementFood(relationshipId, 2)`
    - Silently ignore errors from the food increment without blocking memory creation
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 9.4 Write property test for bucket list payout transitions
    - **Property 10: Bucket list payout only on incomplete-to-complete transition**
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 9.5 Write unit tests for quest payout amounts
    - Test daily question payout = 1, bucket list payout = 3, memory upload payout = 2
    - _Requirements: 7.1, 8.1, 9.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using `fast-check`
- Unit tests validate specific examples and edge cases
- All pure functions (`getTimeOfDay`, `getGradientColorsForHour`, `generateRoamDestination`, `clampToGroundBounds`, `computeWalkDuration`, `getFacingDirection`) are exported for direct testing
