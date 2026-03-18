# Tasks

## Task 1: Install dependencies and load custom fonts in App.tsx

- [x] 1.1 Install `@expo-google-fonts/playfair-display`, `@expo-google-fonts/nunito`, and `lucide-react-native` packages
- [x] 1.2 Add `expo-splash-screen` import and `SplashScreen.preventAutoHideAsync()` call at module scope in `App.tsx`
- [x] 1.3 Add `useFonts` hook to load `PlayfairDisplay_700Bold`, `Nunito_400Regular`, `Nunito_600SemiBold` in `App.tsx`
- [x] 1.4 Add `useEffect` to call `SplashScreen.hideAsync()` when `fontsLoaded || fontError` is true
- [x] 1.5 Return `null` from `App` while fonts are loading and no error has occurred
- [x] 1.6 Write unit tests for font loading coordination (splash screen hidden on load, splash screen hidden on error, null returned while loading)

## Task 2: Restyle MemoryCard as Polaroid card

- [x] 2.1 Change photo `aspectRatio` from `4/3` to `1` (square) in `MemoryCard` styles
- [x] 2.2 Replace `BlurView` card wrapper with a plain `View` using `#FAFAFA` background, Polaroid-style padding (thicker bottom border), and `borderRadius: 4`
- [x] 2.3 Add `useMemo` with `generateTilt()` function returning random value in [-3, 3], apply as `transform: [{ rotate }]` on card wrapper
- [x] 2.4 Add drop shadow styles (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`) to card wrapper
- [x] 2.5 Update caption `fontFamily` to `PlayfairDisplay_700Bold` and timestamp `fontFamily` to `Nunito_400Regular`, adjust text colors for light background
- [x] 2.6 Write property-based test for `generateTilt()` — verify output is always in [-3, 3] over 100+ iterations (Property 1)
- [x] 2.7 Write unit tests for Polaroid card styles (square aspect ratio, background color, shadow presence, font families)

## Task 3: Implement double-tap like with heart animation

- [x] 3.1 Replace `Pressable` photo wrapper with `GestureDetector` using `Gesture.Exclusive(doubleTap, singleTap)` composition
- [x] 3.2 Implement `doubleTap` gesture handler that calls `triggerHeartAnimation()`, triggers `Haptics.impactAsync()`, and upserts like to Supabase
- [x] 3.3 Implement `singleTap` gesture handler that navigates to `MemoryDetailScreen`
- [x] 3.4 Add heart animation overlay using `useSharedValue` for scale (0 → 1.5 spring) and opacity (1 → 0 with delay), rendered as `Animated.View` with Heart icon centered on photo
- [x] 3.5 Write property-based test for `triggerHeartAnimation()` — verify scale targets 1.5 and opacity targets 0 on every invocation (Property 2)
- [x] 3.6 Write unit tests for gesture interactions (double-tap triggers haptic + like upsert, single-tap navigates, exclusive composition used)

## Task 4: Replace emoji icons with lucide-react-native SVGs

- [x] 4.1 Replace delete button emoji `🗑️` with `<Trash2>` icon from `lucide-react-native`
- [x] 4.2 Replace mic button emoji `🎙️` with `<Mic>` icon from `lucide-react-native`
- [x] 4.3 Add `<Heart>` icon for the like indicator on Polaroid cards
- [x] 4.4 Write unit tests verifying Heart, Trash2, and Mic icons render in MemoryCard

## Task 5: Update Timeline background and date headers

- [x] 5.1 Change `TimelineScreen` container `backgroundColor` from `#121212` to `#FAFAFA`
- [x] 5.2 Update `DateHeader` to use `fontFamily: 'PlayfairDisplay_700Bold'` and a dark contrasting color (e.g. `#4A4A4A`)
- [x] 5.3 Update empty state text colors and any other text to contrast with the light background
- [x] 5.4 Write unit tests for timeline background color and date header font/color
