# Requirements Document

## Introduction

This feature overhauls the WeDo app's visual identity to a "Digital Scrapbook" aesthetic with Polaroid-style memory cards, curated typography (Playfair Display + Nunito), and Instagram-inspired micro-interactions (double-tap to like with heart animation and haptic feedback). The goal is to create a warm, tactile, viral-worthy UI on the Timeline screen.

## Glossary

- **App**: The WeDo React Native Expo application
- **Font_Loader**: The module in App.tsx responsible for loading custom fonts via expo-font and coordinating with SplashScreen
- **Timeline_Screen**: The screen that displays a reverse-chronological feed of memory entries
- **Polaroid_Card**: A memory card component styled to resemble a physical Polaroid photograph with a white border, slight random tilt, and drop shadow
- **Heart_Animation**: An animated heart overlay that appears on a Polaroid_Card photo when a user double-taps, scaling up with a spring effect then fading out
- **Like_Gesture**: A double-tap gesture on a Polaroid_Card photo that triggers the Heart_Animation and records a like
- **Navigate_Gesture**: A single-tap gesture on a Polaroid_Card that navigates to the memory detail screen
- **Icon_Set**: The lucide-react-native SVG icon library used for Heart, Trash2, and Mic icons

## Requirements

### Requirement 1: Custom Font Loading

**User Story:** As a user, I want the app to display curated typography, so that the interface feels warm and editorial.

#### Acceptance Criteria

1. WHEN the App starts, THE Font_Loader SHALL load PlayfairDisplay_700Bold, Nunito_400Regular, and Nunito_600SemiBold fonts before rendering the application UI
2. WHILE fonts are loading, THE App SHALL keep the splash screen visible
3. WHEN fonts have finished loading, THE App SHALL hide the splash screen and render the application UI
4. IF font loading fails, THEN THE App SHALL hide the splash screen and render the application UI using system fallback fonts

### Requirement 2: Polaroid Card Styling

**User Story:** As a user, I want memory cards to look like Polaroid photos, so that the timeline feels like a digital scrapbook.

#### Acceptance Criteria

1. THE Polaroid_Card SHALL display the memory photo in a square aspect ratio (1:1)
2. THE Polaroid_Card SHALL have a warm cream/white background (#FAFAFA) border resembling a Polaroid frame
3. THE Polaroid_Card SHALL apply a random tilt rotation between -3 and 3 degrees, assigned once per card instance
4. THE Polaroid_Card SHALL render a drop shadow to create a layered depth effect
5. THE Polaroid_Card SHALL display the caption text using the PlayfairDisplay_700Bold font
6. THE Polaroid_Card SHALL display the timestamp text using the Nunito_400Regular font

### Requirement 3: Double-Tap Like Interaction

**User Story:** As a user, I want to double-tap a memory photo to like it, so that I can quickly react to my partner's memories.

#### Acceptance Criteria

1. WHEN the user double-taps on a Polaroid_Card photo, THE Timeline_Screen SHALL trigger the Heart_Animation overlay centered on the photo
2. WHEN the Heart_Animation is triggered, THE Heart_Animation SHALL scale from 0 to 1.5 using a spring animation, then fade out to opacity 0
3. WHEN the user double-taps on a Polaroid_Card photo, THE App SHALL trigger haptic feedback
4. WHEN the user single-taps on a Polaroid_Card, THE Timeline_Screen SHALL navigate to the MemoryDetailScreen for that memory
5. THE Timeline_Screen SHALL use an Exclusive gesture composition so that a double-tap takes priority over a single-tap
6. WHEN the user double-taps on a Polaroid_Card photo, THE Timeline_Screen SHALL record the like action for future partner notification via Supabase

### Requirement 4: SVG Icon Replacement

**User Story:** As a user, I want clean vector icons instead of text emojis, so that the interface looks polished and consistent.

#### Acceptance Criteria

1. THE Polaroid_Card SHALL render a Heart icon from the Icon_Set for the like indicator
2. THE Polaroid_Card SHALL render a Trash2 icon from the Icon_Set for the delete action button
3. THE Polaroid_Card SHALL render a Mic icon from the Icon_Set for the voice note action button

### Requirement 5: Timeline Background Update

**User Story:** As a user, I want the timeline to have a warm scrapbook-like background, so that the overall aesthetic is cohesive.

#### Acceptance Criteria

1. THE Timeline_Screen SHALL use a warm cream/white background color (#FAFAFA) instead of the current dark background (#121212)
2. THE Timeline_Screen SHALL display date header text using the PlayfairDisplay_700Bold font
3. THE Timeline_Screen SHALL display date header text in a color that contrasts with the #FAFAFA background
