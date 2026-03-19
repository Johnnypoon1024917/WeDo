# Requirements Document

## Introduction

The Garden Metaverse & Quest Engine transforms the WeDo Timeline screen from a flat memory feed into an immersive, full-screen interactive garden where the couple's linked companion pets roam freely. The feature introduces three interconnected systems: (1) a time-of-day parallax garden background with gradient sky and SVG grass terrain, (2) an autonomous roaming AI that gives pets free-movement behavior across the garden ground, and (3) a quest-and-feeding gamification loop that rewards users with Food Bowls for completing in-app tasks (answering daily questions, checking off bucket list dates, uploading memories) and lets them drag-drop food into the garden to attract and feed their pets, granting XP toward evolution.

## Glossary

- **Garden**: The full-screen parallax background layer of the TimelineScreen, consisting of a time-based sky gradient and an SVG grass ground area, replacing the previous solid `#121212` background.
- **Sky_Gradient**: A vertical `LinearGradient` that changes color palette based on the user's local time of day (dawn, noon, night).
- **Ground_Area**: The bottom 40% of the Garden screen, rendered as a soft curved SVG path representing grass or terrain where pets roam.
- **Roaming_Engine**: The autonomous movement logic that drives pet avatars to wander randomly across the Ground_Area, pause, and repeat.
- **Food_Bowl**: A draggable UI element representing one unit of pet food. Users earn Food Bowls by completing in-app tasks and spend them by dragging into the Garden.
- **Inventory_Food**: An integer column on the `relationships` table tracking the number of Food Bowls a user's relationship currently holds.
- **Quest_Payout**: The reward of Food Bowls granted when a user completes a qualifying in-app task (daily question, bucket list item, or memory upload).
- **Feeding_Interaction**: The act of dragging a Food Bowl into the Garden, which places an SVG food item on the ground, attracts both pets, and triggers an eating animation with XP gain.
- **Pet_XP**: Experience points granted to pets upon eating food, contributing toward evolution stage progression (egg → baby → teen → adult).
- **TimelineScreen**: The main screen component (`src/screens/TimelineScreen.tsx`) that displays the memory feed and will host the Garden background.
- **LinkedCompanions**: The component (`src/components/LinkedCompanions.tsx`) that renders the dual pet avatars, which will be restructured to support free-roam positioning within the Garden.
- **Roam_Destination**: A random coordinate within the Ground_Area bounds that a pet targets during autonomous movement.
- **Facing_Direction**: A horizontal flip state (`left` or `right`) applied to a pet SVG based on the direction of travel toward a Roam_Destination.

## Requirements

### Requirement 1: Time-of-Day Sky Gradient Background

**User Story:** As a user, I want the Timeline background to display a beautiful sky gradient that changes based on my local time of day, so that the garden feels alive and immersive.

#### Acceptance Criteria

1. THE Garden SHALL render a full-screen vertical `LinearGradient` as the absolute background layer of the TimelineScreen, replacing the previous solid `#FAFAFA` background color.
2. WHEN the user's local hour is between 5:00 and 10:59 (inclusive), THE Sky_Gradient SHALL display a Soft Dawn Peach palette (warm peach-to-light-gold tones).
3. WHEN the user's local hour is between 11:00 and 16:59 (inclusive), THE Sky_Gradient SHALL display a Bright Sky Blue palette (light blue-to-white tones).
4. WHEN the user's local hour is between 17:00 and 20:59 (inclusive), THE Sky_Gradient SHALL display a Sunset Orange palette (orange-to-purple tones).
5. WHEN the user's local hour is between 21:00 and 4:59 (inclusive), THE Sky_Gradient SHALL display a Deep Starry Navy palette (dark navy-to-deep-purple tones).
6. THE Sky_Gradient SHALL recalculate the active palette when the TimelineScreen mounts and when the app returns to the foreground from background state.

### Requirement 2: SVG Ground Terrain

**User Story:** As a user, I want to see a soft grassy ground at the bottom of the garden, so that the pets have a visible area to roam on.

#### Acceptance Criteria

1. THE Garden SHALL render an SVG path at the bottom 40% of the screen representing the Ground_Area with a soft curved top edge.
2. THE Ground_Area SHALL use a green-toned fill color that complements the active Sky_Gradient palette.
3. THE Ground_Area SVG SHALL scale proportionally to the device screen width and height using the `Dimensions` API.
4. THE Ground_Area SHALL be positioned behind the Timeline FlatList content and behind the pet avatars using absolute positioning with appropriate `zIndex` layering.

### Requirement 3: Transparent Timeline Feed Overlay

**User Story:** As a user, I want to scroll through my memory polaroid cards while seeing the garden and pets in the background, so that the experience feels layered and immersive.

#### Acceptance Criteria

1. THE TimelineScreen FlatList SHALL have `backgroundColor: 'transparent'` so that the Garden background is visible behind the memory cards.
2. THE memory polaroid cards SHALL retain their existing opaque card styling with the `#FAFAFA` background and shadow effects.
3. THE FlatList content container SHALL maintain existing padding and spacing so that cards remain readable and properly positioned.
4. WHILE the user scrolls the FlatList, THE Garden background and pet avatars SHALL remain stationary (fixed position) behind the scrolling content.

### Requirement 4: Autonomous Pet Roaming Engine

**User Story:** As a user, I want to see both pets wandering around the garden ground on their own, so that the garden feels alive and playful.

#### Acceptance Criteria

1. THE Roaming_Engine SHALL use Reanimated shared values for `translateX`, `translateY`, and `facingDirection` for each pet avatar.
2. THE Roaming_Engine SHALL pick a random Roam_Destination within the Ground_Area bounds for each pet independently.
3. THE Roaming_Engine SHALL calculate the walk duration based on the distance to the Roam_Destination, resulting in a duration between 3 and 7 seconds.
4. THE Roaming_Engine SHALL flip the pet SVG horizontally to face the direction of travel (left or right) before starting the walk animation.
5. THE Roaming_Engine SHALL animate the pet position from the current location to the Roam_Destination using `withTiming` with an ease-in-out easing curve.
6. WHEN a pet arrives at a Roam_Destination, THE Roaming_Engine SHALL pause the pet at that location for a random duration between 2 and 5 seconds before selecting a new destination.
7. THE Roaming_Engine SHALL run continuously in a loop: pick destination, walk, pause, repeat.
8. THE Roaming_Engine SHALL combine roaming translation transforms with the existing breathing animation transforms on each pet avatar.

### Requirement 5: Pet Roaming Boundary Constraints

**User Story:** As a developer, I want pets to stay within the visible ground area, so that they never wander off-screen or into the sky region.

#### Acceptance Criteria

1. THE Roaming_Engine SHALL constrain all Roam_Destinations to X coordinates within 10% to 90% of the screen width.
2. THE Roaming_Engine SHALL constrain all Roam_Destinations to Y coordinates within the top and bottom bounds of the Ground_Area (bottom 40% of screen height).
3. IF a calculated Roam_Destination falls outside the Ground_Area bounds, THEN THE Roaming_Engine SHALL clamp the destination to the nearest valid coordinate within bounds.

### Requirement 6: Inventory Food Database Schema

**User Story:** As a developer, I want a food inventory column on the relationships table, so that the system can track how many Food Bowls a couple has earned and spent.

#### Acceptance Criteria

1. THE Database SHALL add an `inventory_food` integer column to the `relationships` table with a default value of 0.
2. THE Database SHALL enforce a CHECK constraint on `inventory_food` ensuring the value is greater than or equal to 0.
3. THE `inventory_food` column SHALL be readable and writable by both partners in the relationship via existing RLS policies on the `relationships` table.

### Requirement 7: Quest Payout for Daily Question

**User Story:** As a user, I want to earn 1 Food Bowl when I answer the Daily Deep Question, so that engaging with my partner rewards me with pet food.

#### Acceptance Criteria

1. WHEN a user marks the Daily Deep Question as discussed, THE Quest_Payout system SHALL increment the `inventory_food` column on the `relationships` table by 1.
2. THE Quest_Payout SHALL execute the food increment within the same callback that calls `markDiscussed` in the DailyQuestionCard component.
3. IF the database update for `inventory_food` fails, THEN THE Quest_Payout system SHALL silently ignore the error without blocking the question discussion flow.

### Requirement 8: Quest Payout for Bucket List Completion

**User Story:** As a user, I want to earn 3 Food Bowls when I check off a Bucket List date, so that completing adventures together rewards me generously.

#### Acceptance Criteria

1. WHEN a user marks a Bucket List item as completed, THE Quest_Payout system SHALL increment the `inventory_food` column on the `relationships` table by 3.
2. THE Quest_Payout SHALL execute the food increment within the `handleToggleComplete` callback in the BucketListScreen component, only when the item transitions from incomplete to complete.
3. WHEN a user unchecks a previously completed Bucket List item, THE Quest_Payout system SHALL NOT decrement the `inventory_food` value.

### Requirement 9: Quest Payout for Memory Upload

**User Story:** As a user, I want to earn 2 Food Bowls when I upload a new Timeline memory, so that capturing moments together feeds our pets.

#### Acceptance Criteria

1. WHEN a new memory is successfully inserted into the `memories` table, THE Quest_Payout system SHALL increment the `inventory_food` column on the `relationships` table by 2.
2. THE Quest_Payout SHALL execute the food increment after the memory photo upload and database insert succeed in the MemoryCreationModal component.
3. IF the database update for `inventory_food` fails, THEN THE Quest_Payout system SHALL silently ignore the error without blocking the memory creation flow.

### Requirement 10: Food Bowl Inventory Display

**User Story:** As a user, I want to see how many Food Bowls I have available in the garden view, so that I know when I can feed my pets.

#### Acceptance Criteria

1. THE Garden SHALL display a floating Food Bowl icon in the bottom-right corner of the screen, overlaying the garden content.
2. THE Food Bowl icon SHALL display the current `inventory_food` count as a badge number next to the icon.
3. WHEN the `inventory_food` count is 0, THE Food Bowl icon SHALL appear dimmed or grayed out to indicate no food is available.
4. THE Food Bowl icon SHALL fetch the current `inventory_food` value from the `relationships` table when the TimelineScreen mounts.
5. THE Food Bowl icon SHALL update reactively when `inventory_food` changes (via local state update after payouts or feeding).

### Requirement 11: Drag-to-Feed Interaction

**User Story:** As a user, I want to drag a Food Bowl from the floating icon into the garden to place food on the ground, so that I can feed my pets with a fun gesture.

#### Acceptance Criteria

1. WHEN the user initiates a drag gesture on the Food Bowl icon (via PanGestureHandler), THE Garden SHALL render a draggable Food Bowl sprite that follows the user's finger position.
2. WHEN the user releases the drag within the Ground_Area bounds, THE Garden SHALL place an SVG Food Bowl at the drop coordinates on the ground.
3. WHEN a Food Bowl is successfully placed, THE Garden SHALL decrement the `inventory_food` count by 1 in both local state and the `relationships` table.
4. IF the `inventory_food` count is 0, THEN THE Garden SHALL prevent the drag gesture from initiating (no food to place).
5. IF the user releases the drag outside the Ground_Area bounds, THEN THE Garden SHALL cancel the placement and return the Food Bowl sprite to the icon position without decrementing inventory.

### Requirement 12: Pet Attraction to Food

**User Story:** As a user, I want both pets to run toward the food bowl when I place it in the garden, so that the feeding feels interactive and rewarding.

#### Acceptance Criteria

1. WHEN a Food Bowl is placed on the ground, THE Roaming_Engine SHALL interrupt the current random roaming behavior for both pets.
2. WHEN a Food Bowl is placed on the ground, THE Roaming_Engine SHALL set both pets' Facing_Direction toward the Food Bowl coordinates.
3. THE Roaming_Engine SHALL animate both pets to move directly to the Food Bowl coordinates using `withTiming` at a faster speed than normal roaming (1-2 seconds regardless of distance).
4. WHEN both pets arrive at the Food Bowl coordinates, THE Garden SHALL remove the Food Bowl SVG from the ground.
5. WHEN both pets arrive at the Food Bowl coordinates, THE Garden SHALL play the `petHappy.json` Lottie burst animation centered on the food location.
6. WHEN both pets finish eating, THE Roaming_Engine SHALL resume normal random roaming behavior.

### Requirement 13: XP Gain from Feeding

**User Story:** As a user, I want my pets to gain XP when they eat food, so that feeding them contributes to their evolution progress.

#### Acceptance Criteria

1. WHEN both pets finish eating a Food Bowl, THE Pet_Service SHALL grant each pet XP by incrementing `pet_total_xp` on the `relationships` table.
2. THE Pet_Service SHALL grant 10 XP per Food Bowl consumed.
3. WHEN the XP gain causes a pet to cross an evolution stage threshold (egg: 0-99, baby: 100-499, teen: 500-999, adult: 1000+), THE Garden SHALL trigger a visual evolution celebration effect.
4. THE XP update SHALL persist to the database and update the local app store state.

### Requirement 14: Food Inventory State Management

**User Story:** As a developer, I want the food inventory to be tracked in the app store, so that all components can reactively access the current food count.

#### Acceptance Criteria

1. THE AppStore SHALL include an `inventoryFood` state field (integer, default 0) to track the current Food Bowl count.
2. THE AppStore SHALL include a `setInventoryFood` action to update the `inventoryFood` value.
3. WHEN the TimelineScreen mounts, THE AppStore SHALL be hydrated with the `inventory_food` value fetched from the `relationships` table.
4. WHEN a Quest_Payout or Feeding_Interaction modifies `inventory_food`, THE AppStore SHALL be updated synchronously to reflect the new value.

### Requirement 15: Garden Z-Index Layering

**User Story:** As a developer, I want correct z-index layering so that the sky, ground, pets, food, and timeline cards render in the proper visual order.

#### Acceptance Criteria

1. THE Garden SHALL render layers in the following z-order from back to front: Sky_Gradient (lowest), Ground_Area SVG, pet avatars, placed Food Bowl SVGs, Timeline FlatList content (highest scrollable layer), floating Food Bowl icon (topmost fixed overlay).
2. THE pet avatars SHALL be rendered using absolute positioning within the Garden container so they appear behind the scrolling FlatList content.
3. THE floating Food Bowl icon SHALL use absolute positioning with a high `zIndex` to remain above all other content including the FlatList.

### Requirement 16: Inventory Food Service

**User Story:** As a developer, I want a dedicated service function to increment and decrement food inventory, so that payout and feeding logic is centralized and reusable.

#### Acceptance Criteria

1. THE Inventory_Food_Service SHALL expose an `incrementFood(relationshipId: string, amount: number)` function that adds the specified amount to `inventory_food` in the `relationships` table and updates the AppStore.
2. THE Inventory_Food_Service SHALL expose a `decrementFood(relationshipId: string, amount: number)` function that subtracts the specified amount from `inventory_food` in the `relationships` table and updates the AppStore.
3. IF a `decrementFood` call would result in a negative `inventory_food` value, THEN THE Inventory_Food_Service SHALL reject the operation and return an error without modifying the database.
4. THE Inventory_Food_Service SHALL expose a `fetchFoodInventory(relationshipId: string)` function that reads the current `inventory_food` value from the `relationships` table.
