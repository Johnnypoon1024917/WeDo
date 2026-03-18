# Implementation Plan: Enterprise UX Upgrade

## Overview

Incremental implementation of eight UX and reliability improvements across MemoryCreationModal, CalendarScreen, BucketListScreen, and BucketListMapView. Tasks are ordered by dependency: dependencies first, then core fixes, then UI enhancements, then wiring and tests.

## Tasks

- [x] 1. Install new dependencies and update types
  - [x] 1.1 Install `expo-crypto` and `@gorhom/bottom-sheet` via `npx expo install`
    - Run `npx expo install expo-crypto @gorhom/bottom-sheet`
    - Verify both packages appear in `package.json` dependencies
    - _Requirements: 1.1, 5.1_

  - [x] 1.2 Add `bucket_list_id` field to `MemoryEntry` interface in `realtimeManager.ts`
    - Add `bucket_list_id: string | null` to the `MemoryEntry` interface
    - _Requirements: 2.2_

- [x] 2. Fix MemoryCreationModal: UUID generation and bucket list linking
  - [x] 2.1 Replace `crypto.randomUUID()` with `expo-crypto` in MemoryCreationModal
    - Add `import * as Crypto from 'expo-crypto'` to `src/components/MemoryCreationModal.tsx`
    - Replace `const entryId = crypto.randomUUID()` with `const entryId = Crypto.randomUUID()`
    - Wrap the `Crypto.randomUUID()` call in a try/catch; on error, set `error` state and return early
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Add `bucketListId` prop and include `bucket_list_id` in insert payload
    - Add optional `bucketListId?: string | null` to `MemoryCreationModalProps`
    - Include `bucket_list_id: bucketListId ?? null` in the Supabase `.insert()` payload
    - _Requirements: 2.2, 2.3_

  - [ ]* 2.3 Write property test for UUID validity (Property 1)
    - **Property 1: UUID validity**
    - Call the UUID generator 100+ times and validate each matches UUID v4 regex `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
    - **Validates: Requirements 1.1**

  - [ ]* 2.4 Write property test for bucket list ID payload mapping (Property 2)
    - **Property 2: Bucket list ID payload mapping**
    - Use `fc.option(fc.uuid())` to generate optional bucketListId values; verify insert payload `bucket_list_id` equals the input when present, or `null` when absent
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Update BucketListScreen to track completing item and pass to modal
  - [x] 3.1 Add `completingItemId` state and thread it through the completion flow
    - Add `const [completingItemId, setCompletingItemId] = useState<string | null>(null)` to BucketListScreen
    - In `handleToggleComplete`, when marking complete, set `completingItemId = item.id` before showing Lottie/modal
    - Pass `bucketListId={completingItemId}` to `MemoryCreationModal`
    - On modal close, reset `completingItemId` to `null`
    - _Requirements: 2.1_

- [ ] 4. Extract pure calendar utility functions
  - [x] 4.1 Create `src/utils/calendarHelpers.ts` with pure utility functions
    - `getMonthRange(year: number, month: number): { firstDay: string; lastDay: string }` — computes YYYY-MM-DD bounds for a month, handling leap years
    - `groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]>` — groups events by `day` field
    - `sortEventsChronologically(events: CalendarEvent[]): CalendarEvent[]` — sorts by `time` field, nulls last
    - `buildMarkedDates(monthEvents: Map<string, CalendarEvent[]>): Record<string, { marked: boolean; dotColor: string }>` — builds markedDates object with `#FF7F50` dots
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.2_

  - [ ]* 4.2 Write property test for month date range bounds (Property 3)
    - **Property 3: Month date range bounds**
    - Use `fc.integer({min:2000,max:2100})` and `fc.integer({min:1,max:12})` to generate year/month pairs; verify first day is `YYYY-MM-01` and last day is the actual last calendar day (leap year aware)
    - **Validates: Requirements 3.1**

  - [ ]* 4.3 Write property test for event grouping (Property 4)
    - **Property 4: Event grouping preserves all events**
    - Use `fc.array(calendarEventArb)` to generate event arrays; verify every event appears in exactly one group, group key matches event's `day`, and total count equals input length
    - **Validates: Requirements 3.2**

  - [ ]* 4.4 Write property test for marked dates (Property 5)
    - **Property 5: Marked dates matches event days**
    - Generate a `MonthEventsMap`, build marked dates, verify keys match exactly the set of date strings with events, and each entry has `dotColor: '#FF7F50'`
    - **Validates: Requirements 4.1, 4.2, 4.4**

  - [ ]* 4.5 Write property test for chronological sort (Property 6)
    - **Property 6: Events chronological sort**
    - Generate arrays of events with random times; verify sorted output has each time ≤ the next, with nulls at the end
    - **Validates: Requirements 5.2**

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update CalendarScreen: month-level fetch, event dots, and bottom-sheet agenda
  - [x] 6.1 Add month-level event fetching using `getMonthRange` and `groupEventsByDay`
    - Add `monthEvents` state (`Map<string, CalendarEvent[]>`)
    - Create `fetchEventsForMonth` function that queries Supabase `calendar_events` using `getMonthRange` bounds
    - Call `fetchEventsForMonth` from `onMonthChange` and `onVisibleMonthsChange`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 6.2 Add Soft Coral event dot indicators in `renderDay`
    - Check `monthEvents.has(date.dateString)` in `renderDay`
    - Render a `#FF7F50` event dot when events exist for that day
    - When both `hasNote` and `hasEvents` are true, render dots side by side in a row
    - Add `eventDot` style: `{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FF7F50', marginTop: 1 }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Replace events section with `@gorhom/bottom-sheet` agenda view
    - Import `BottomSheet` and `BottomSheetFlatList` from `@gorhom/bottom-sheet`
    - Add a `BottomSheet` ref with snap points `['25%', '50%']`, initially closed
    - On day tap, open the bottom sheet with events for the selected day (sorted chronologically)
    - Render events in a vertical timeline layout with title and time in chronological order
    - Show empty-state message when no events for the selected day
    - Style with dark theme: background `#1E1E1E`, white text, Teal Accent `#40E0D0` for time labels
    - Remove the existing inline `eventsSection` View
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Replace static emoji checkbox with Lottie animation in BucketListRow
  - [x] 7.1 Replace emoji checkbox with LottieView using `progress` shared value
    - Import `LottieView` from `lottie-react-native` and `useSharedValue`, `withTiming` from `react-native-reanimated`
    - Replace `<Text>{item.completed ? '✅' : '⬜'}</Text>` with a `LottieView` using `checkmark-confetti.json`
    - Use `progress` shared value: `0` = unchecked, `1` = checked
    - On tap to complete: animate `progress` from 0 → 1 with `withTiming`, then call `onToggleComplete`
    - On tap to uncomplete: instantly set `progress` to 0
    - When `item.completed` is true on mount: set `progress = 1` immediately (static last frame)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test for Lottie progress initial state (Property 7)
    - **Property 7: Lottie progress reflects completion state**
    - Use `fc.record({ completed: fc.boolean(), ... })` to generate items; verify initial progress is `1` when completed, `0` when not
    - **Validates: Requirements 6.4, 6.5**

- [x] 8. Update BucketListMapView marker colors to Teal Accent
  - [x] 8.1 Change `markerDot` styles from Soft Coral to Teal Accent
    - Update `backgroundColor` from `#FF7F50` to `#40E0D0`
    - Update `shadowColor` from `#FF7F50` to `#40E0D0`
    - Keep `borderColor: '#FFFFFF'`, `shadowOpacity: 0.6`, `shadowRadius: 4`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 8.2 Write property test for filterMapItems (Property 8)
    - **Property 8: Filter map items correctness**
    - Use `fc.array(bucketListItemArb)` with nullable lat/lng; verify result contains exactly uncompleted items with non-null lat and lng
    - **Validates: Requirements 7.1, 7.4**

- [x] 9. Verify PinPreviewModal (no code changes needed)
  - [x] 9.1 Confirm PinPreviewModal satisfies Requirement 8 without modifications
    - Verify existing `PinPreviewModal` displays `title` and `place_name`, has dismiss, and slides up
    - No code changes — this is a verification-only task
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 9.2 Write property test for preview card content (Property 9)
    - **Property 9: Preview card contains item info**
    - Generate items with `fc.record({ title: fc.string(), place_name: fc.option(fc.string()), ... })`; verify render output contains `title` and `place_name` when non-null
    - **Validates: Requirements 8.3**

- [x] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Pure utility functions are extracted in task 4.1 to enable clean property-based testing
