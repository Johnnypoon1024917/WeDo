# Critical Bug Fixes — Bugfix Design

## Overview

This design addresses four critical bugs in the WeDo app: (1) a monetization loophole where `AddToListModal` opened via deep link skips the free-user item-count gate, (2) missing microphone permission requests before audio recording in `AudioRecorder.tsx`, (3) orphaned `.jpg` and `.m4a` files leaking in Supabase Storage when Timeline memories are deleted, and (4) a realtime WebSocket memory leak on sign-out because `realtimeManager.unsubscribeAll()` is never called. Each fix is minimal and scoped to prevent regressions.

## Glossary

- **Bug_Condition (C)**: The set of conditions that trigger each of the four bugs
- **Property (P)**: The desired correct behavior when the bug condition holds
- **Preservation**: Existing behaviors (FAB gating, premium bypass, normal recording, normal deletion, normal realtime) that must remain unchanged
- **FREE_ITEM_LIMIT**: Constant `10` in `BucketListScreen.tsx` — the maximum bucket list items for free users
- **`extractStoragePath()`**: Helper in `TimelineScreen.tsx` that parses a Supabase public URL to extract the storage object path
- **`realtimeManager`**: Singleton in `src/services/realtimeManager.ts` managing all Supabase Realtime channel subscriptions
- **`clearAuth()`**: Zustand action in `appStore.ts` that resets user/session/relationship state to null

## Bug Details

### Bug Condition

The four bugs manifest under distinct conditions:

**Bug 1 — Monetization Loophole:** When a free user shares a URL from an external app, `App.tsx` calls `navigationRef.navigate('AddToListModal', { url })` directly. `AddToListModal` has no item-count check, so the user bypasses the `FREE_ITEM_LIMIT` gate that exists only in `BucketListScreen.handleAddPress`.

**Bug 2 — Missing Mic Permissions:** When a user taps "Tap to record" in `AudioRecorder.tsx`, `handleStart` calls `startAudioRecording()` immediately. Neither `AudioRecorder` nor `audioRecorderService.ts` calls `Audio.requestPermissionsAsync()` first, causing a crash on devices where permission hasn't been granted.

**Bug 3 — Orphaned File Leak:** When a user deletes a memory in `TimelineScreen.tsx`, the `handleDelete` callback calls `supabase.storage.from('wedo-assets').remove()` for photo and audio paths. However: (a) if `extractStoragePath()` returns `null` for a valid file, the file is silently skipped; (b) storage deletion errors are caught but not surfaced — the DB row is still deleted, orphaning the files.

**Bug 4 — Realtime Memory Leak:** When a user taps "Sign Out" in `SettingsScreen.tsx`, `handleSignOut` calls `supabase.auth.signOut()` then `clearAuth()` but never calls `realtimeManager.unsubscribeAll()`. The active channels in `activeChannels[]` remain open, receiving events and attempting state updates on unmounted components.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AppAction
  OUTPUT: boolean

  // Bug 1: Deep-link add without gate
  IF input.action == 'OPEN_ADD_TO_LIST_MODAL'
     AND input.source == 'deep_link'
     AND input.user.isPremium == false
     AND getBucketListItemCount(input.user.relationshipId) >= FREE_ITEM_LIMIT
  THEN RETURN true

  // Bug 2: Record without permission request
  IF input.action == 'START_AUDIO_RECORDING'
     AND NOT permissionAlreadyGranted('microphone')
  THEN RETURN true

  // Bug 3: Delete memory with storage files
  IF input.action == 'DELETE_MEMORY'
     AND (memoryHasPhoto(input.memoryId) OR memoryHasAudio(input.memoryId))
  THEN RETURN true

  // Bug 4: Sign out with active subscriptions
  IF input.action == 'SIGN_OUT'
     AND activeChannels.length > 0
  THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples

- **Bug 1:** Free user with 12 bucket list items shares a restaurant link from Instagram → `AddToListModal` opens, item is saved as #13 (should redirect to `PaywallModal`)
- **Bug 1:** Free user with 8 items shares a link → `AddToListModal` opens, item saved as #9 (correct, no gate needed)
- **Bug 2:** User taps record on a fresh iOS install where mic permission hasn't been prompted → `Audio.Recording.createAsync` throws, caught as generic error string
- **Bug 2:** User taps record after previously granting mic permission → recording starts fine (no bug)
- **Bug 3:** User deletes a memory with photo at `relationship123/photos/abc.jpg` → DB row deleted, but if `extractStoragePath` returns null or storage `.remove()` fails, the `.jpg` remains in the bucket
- **Bug 3:** User deletes a memory with both photo and audio → audio `.m4a` deletion fails silently, DB row still deleted
- **Bug 4:** User signs out while on Timeline (memories channel active) → channel stays open, receives INSERT events, tries to call `setMemories` on unmounted component

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Premium users opening `AddToListModal` via deep link must continue to add items without any gate
- Free users tapping the "+" FAB on `BucketListScreen` with < 10 items must continue to navigate to `AddToListModal`
- Free users tapping the "+" FAB on `BucketListScreen` with >= 10 items must continue to navigate to `PaywallModal`
- Users with already-granted mic permission must continue to start recording immediately without re-prompting
- Deleting a memory with no audio attachment must continue to work (photo-only deletion)
- Active realtime subscriptions must continue to function normally during regular app usage
- The "Disconnect Partner" flow in Settings must continue to clear auth state as-is (no realtime cleanup needed there)

**Scope:**
All inputs that do NOT match the four bug conditions above should be completely unaffected by these fixes. This includes:
- Normal in-app navigation to `AddToListModal` via the FAB button
- Audio playback (not recording)
- Memory creation (not deletion)
- All other Settings actions (theme, vault, language, restore purchases)

## Hypothesized Root Cause

Based on the bug descriptions and code analysis:

1. **Monetization Loophole — Missing Gate in AddToListModal**: `BucketListScreen.handleAddPress` checks `!isPremium && items.length >= FREE_ITEM_LIMIT` before navigating to `AddToListModal`. But `App.tsx`'s `handleSharedUrl` navigates directly to `AddToListModal` without any such check, and `AddToListModal` itself has no on-mount validation. The gate only exists at the FAB entry point.

2. **Missing Mic Permissions — No `requestPermissionsAsync` Call**: `AudioRecorder.handleStart` calls `startAudioRecording()` which calls `configureAudioSession()` then `Audio.Recording.createAsync()`. Neither function calls `Audio.requestPermissionsAsync()`. On iOS/Android, attempting to record without granted permission throws an error that surfaces as a generic "Could not start recording" message at best, or crashes at worst.

3. **Orphaned File Leak — Fire-and-Forget Storage Deletion**: In `TimelineScreen.tsx`'s `handleDelete`, storage deletion calls are made but: (a) if `extractStoragePath()` returns `null`, the file is silently skipped with no error; (b) the `supabase.storage.remove()` result is not checked for errors — the code proceeds to delete the DB row regardless. The DB row deletion succeeds, making the storage files permanently orphaned.

4. **Realtime Memory Leak — Missing Cleanup on Sign-Out**: `SettingsScreen.handleSignOut` calls `supabase.auth.signOut()` then `clearAuth()`. The `realtimeManager` maintains an `activeChannels` array and exposes `unsubscribeAll()`, but it's never called during sign-out. The channels persist, receiving events and triggering state updates on unmounted components.

## Correctness Properties

Property 1: Bug Condition — Deep-Link Monetization Gate

_For any_ free user who opens `AddToListModal` via a deep link when their bucket list item count is >= `FREE_ITEM_LIMIT`, the fixed `AddToListModal` SHALL redirect to `PaywallModal` on mount instead of displaying the add-item form.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Microphone Permission Request

_For any_ attempt to start audio recording, the fixed `AudioRecorder` SHALL call `Audio.requestPermissionsAsync()` before `startAudioRecording()`, and SHALL only proceed if permission status is `granted`. If denied, it SHALL display an error message without crashing.

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition — Reliable Storage File Deletion

_For any_ memory deletion where associated photo or audio files exist in Supabase Storage, the fixed `handleDelete` SHALL ensure all storage files are deleted (or surface an error to the user) before deleting the database row. If storage deletion fails, the DB row SHALL NOT be deleted.

**Validates: Requirements 2.5, 2.6**

Property 4: Bug Condition — Realtime Cleanup on Sign-Out

_For any_ sign-out action, the fixed `handleSignOut` SHALL call `realtimeManager.unsubscribeAll()` before calling `supabase.auth.signOut()` and `clearAuth()`, ensuring zero active WebSocket channels remain.

**Validates: Requirements 2.7**

Property 5: Preservation — Existing Monetization Gating

_For any_ navigation to `AddToListModal` that does NOT come from a deep link (i.e., via the FAB button), the fixed code SHALL produce the same behavior as the original code, preserving the existing FAB-based gating logic in `BucketListScreen`.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 6: Preservation — Recording With Granted Permission

_For any_ recording attempt where microphone permission is already granted, the fixed code SHALL start recording immediately without re-prompting, preserving the current user experience.

**Validates: Requirements 3.4**

Property 7: Preservation — Normal Realtime Operation

_For any_ app state where the user is signed in and navigating normally, the fixed code SHALL maintain active realtime subscriptions exactly as before, preserving live updates for memories, bucket list, stickers, and calendar events.

**Validates: Requirements 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/screens/AddToListModal.tsx`

**Specific Changes**:
1. **Add on-mount item-count gate**: Import `useAppStore` fields `isPremium` and `relationshipId` (already imported). Add a `useEffect` that runs on mount: query `supabase.from('bucket_list_items').select('id', { count: 'exact' }).eq('relationship_id', relationshipId)`. If the user is not premium and count >= `FREE_ITEM_LIMIT` (10), call `navigation.replace('PaywallModal')`.
2. **Import FREE_ITEM_LIMIT**: Either import from `BucketListScreen` or define locally as `const FREE_ITEM_LIMIT = 10`.

**File**: `src/components/AudioRecorder.tsx`

**Specific Changes**:
3. **Request mic permission before recording**: In `handleStart`, before calling `startAudioRecording()`, call `const { status } = await Audio.requestPermissionsAsync()`. If `status !== 'granted'`, set error to a descriptive message and return early without starting the recording.
4. **Import Audio**: Add `import { Audio } from 'expo-av'` at the top.

**File**: `src/screens/TimelineScreen.tsx`

**Specific Changes**:
5. **Check storage deletion results**: In `handleDelete`'s `onPress` callback, check the `error` result from each `supabase.storage.from('wedo-assets').remove()` call. If any storage deletion fails, show an alert and do NOT proceed to delete the DB row.
6. **Guard against null paths**: If `extractStoragePath()` returns `null` for a file that should exist (photo_url is always present), treat it as an error and abort the deletion with a user-facing message.

**File**: `src/screens/SettingsScreen.tsx`

**Specific Changes**:
7. **Call `realtimeManager.unsubscribeAll()` on sign-out**: In `handleSignOut`'s `onPress` callback, add `realtimeManager.unsubscribeAll()` as the first call, before `supabase.auth.signOut()` and `clearAuth()`.
8. **Import realtimeManager**: Add `import { realtimeManager } from '../services/realtimeManager'`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that simulate each bug condition and assert the expected (currently broken) behavior. Run on UNFIXED code to observe failures.

**Test Cases**:
1. **Deep-Link Gate Test**: Mock a free user with 10+ items, render `AddToListModal` with a deep-link URL param → assert `PaywallModal` navigation occurs (will fail on unfixed code — no gate exists)
2. **Mic Permission Test**: Mock `Audio.requestPermissionsAsync` as not-yet-called, invoke `handleStart` → assert permission is requested before recording starts (will fail on unfixed code — no permission call)
3. **Storage Deletion Test**: Mock `supabase.storage.remove` to return an error, invoke `handleDelete` → assert DB row is NOT deleted (will fail on unfixed code — DB row deleted regardless)
4. **Sign-Out Cleanup Test**: Mock `realtimeManager.unsubscribeAll`, invoke `handleSignOut` → assert `unsubscribeAll` is called (will fail on unfixed code — never called)

**Expected Counterexamples**:
- Bug 1: Item saved despite count >= 10 on deep-link path
- Bug 2: `startAudioRecording` called without prior `requestPermissionsAsync`
- Bug 3: DB row deleted even when storage removal fails
- Bug 4: `unsubscribeAll` never invoked during sign-out flow

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs (FAB navigation, granted-permission recording, photo-only deletion, normal app usage), then write property-based tests capturing that behavior.

**Test Cases**:
1. **FAB Gating Preservation**: Verify that free users with < 10 items can still add via FAB, and >= 10 items still redirects to paywall via FAB
2. **Premium Deep-Link Preservation**: Verify premium users can add items via deep link regardless of count
3. **Granted Permission Preservation**: Verify recording starts immediately when mic permission is already granted
4. **Photo-Only Deletion Preservation**: Verify deleting a memory with no audio still works correctly
5. **Normal Realtime Preservation**: Verify realtime subscriptions remain active during normal signed-in usage

### Unit Tests

- Test `AddToListModal` mount behavior with various user/item-count combinations
- Test `AudioRecorder.handleStart` with granted vs denied permission states
- Test `handleDelete` in `TimelineScreen` with successful vs failed storage deletion
- Test `handleSignOut` in `SettingsScreen` calls `unsubscribeAll` before `signOut`

### Property-Based Tests

- Generate random (isPremium, itemCount, source) tuples and verify `AddToListModal` gate logic is correct for all combinations
- Generate random permission states and verify `AudioRecorder` always requests permission before recording
- Generate random storage deletion outcomes and verify DB row is only deleted when all storage files are successfully removed
- Generate random app states and verify `unsubscribeAll` is always called before `signOut` during sign-out

### Integration Tests

- Test full deep-link flow: share URL from external app → `AddToListModal` opens → gate check → correct destination
- Test full recording flow: tap mic → permission prompt → grant → recording starts → stop → upload
- Test full memory deletion flow: tap delete → confirm → storage files removed → DB row removed → UI updates
- Test full sign-out flow: tap sign out → confirm → realtime cleanup → auth sign out → navigate to onboarding
