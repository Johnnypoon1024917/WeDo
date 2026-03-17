# Tasks

## Bug 1: Monetization Loophole — Deep-Link Item-Count Gate

- [x] 1.1 Add on-mount item-count gate to `AddToListModal.tsx`
  - [x] 1.1.1 Define `FREE_ITEM_LIMIT = 10` constant in `AddToListModal.tsx`
  - [x] 1.1.2 Add `useEffect` on mount that queries `supabase.from('bucket_list_items').select('id', { count: 'exact' }).eq('relationship_id', relationshipId)` and calls `navigation.replace('PaywallModal')` if `!isPremium && count >= FREE_ITEM_LIMIT`
  - [x] 1.1.3 Add a loading guard so the form is not rendered until the item-count check completes
- [x] 1.2 Write unit tests for deep-link gate logic
  - [x] 1.2.1 Test: free user with >= 10 items opening via deep link is redirected to `PaywallModal`
  - [x] 1.2.2 Test: free user with < 10 items opening via deep link sees the add-item form
  - [x] 1.2.3 Test: premium user opening via deep link sees the add-item form regardless of item count

## Bug 2: Missing Microphone Permissions

- [x] 2.1 Add microphone permission request to `AudioRecorder.tsx`
  - [x] 2.1.1 Import `Audio` from `expo-av` in `AudioRecorder.tsx`
  - [x] 2.1.2 In `handleStart`, call `Audio.requestPermissionsAsync()` before `startAudioRecording()` and return early with a descriptive error if `status !== 'granted'`
- [x] 2.2 Write unit tests for microphone permission handling
  - [x] 2.2.1 Test: permission denied shows error message and does not start recording
  - [x] 2.2.2 Test: permission granted proceeds to start recording normally
  - [x] 2.2.3 Test: already-granted permission does not re-prompt the user

## Bug 3: Orphaned File Leak on Memory Deletion

- [x] 3.1 Make storage deletion reliable in `TimelineScreen.tsx`
  - [x] 3.1.1 Check the `error` result from `supabase.storage.from('wedo-assets').remove()` for both photo and audio paths
  - [x] 3.1.2 If `extractStoragePath()` returns `null` for a non-null URL, treat as an error and abort deletion with a user-facing alert
  - [x] 3.1.3 If any storage deletion fails, show an alert and do NOT proceed to delete the database row
- [x] 3.2 Write unit tests for reliable storage deletion
  - [x] 3.2.1 Test: successful photo + audio storage deletion proceeds to delete DB row
  - [x] 3.2.2 Test: failed photo storage deletion aborts DB row deletion and shows error
  - [x] 3.2.3 Test: `extractStoragePath` returning null for a valid URL aborts deletion
  - [x] 3.2.4 Test: memory with no audio deletes photo only and succeeds

## Bug 4: Realtime Memory Leak on Sign-Out

- [x] 4.1 Add realtime cleanup to sign-out flow in `SettingsScreen.tsx`
  - [x] 4.1.1 Import `realtimeManager` from `../services/realtimeManager` in `SettingsScreen.tsx`
  - [x] 4.1.2 Call `realtimeManager.unsubscribeAll()` as the first action in `handleSignOut`'s `onPress` callback, before `supabase.auth.signOut()` and `clearAuth()`
- [x] 4.2 Write unit tests for sign-out realtime cleanup
  - [x] 4.2.1 Test: `realtimeManager.unsubscribeAll()` is called before `supabase.auth.signOut()`
  - [x] 4.2.2 Test: sign-out still completes successfully and clears auth state after realtime cleanup
