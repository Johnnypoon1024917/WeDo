# Tasks

## Bug 1: Monetization Loophole — Deep-Link Item-Count Gate

- [ ] 1.1 Add on-mount item-count gate to `AddToListModal.tsx`
  - [~] 1.1.1 Define `FREE_ITEM_LIMIT = 10` constant in `AddToListModal.tsx`
  - [~] 1.1.2 Add `useEffect` on mount that queries `supabase.from('bucket_list_items').select('id', { count: 'exact' }).eq('relationship_id', relationshipId)` and calls `navigation.replace('PaywallModal')` if `!isPremium && count >= FREE_ITEM_LIMIT`
  - [~] 1.1.3 Add a loading guard so the form is not rendered until the item-count check completes
- [ ] 1.2 Write unit tests for deep-link gate logic
  - [~] 1.2.1 Test: free user with >= 10 items opening via deep link is redirected to `PaywallModal`
  - [~] 1.2.2 Test: free user with < 10 items opening via deep link sees the add-item form
  - [ ] 1.2.3 Test: premium user opening via deep link sees the add-item form regardless of item count

## Bug 2: Missing Microphone Permissions

- [ ] 2.1 Add microphone permission request to `AudioRecorder.tsx`
  - [ ] 2.1.1 Import `Audio` from `expo-av` in `AudioRecorder.tsx`
  - [ ] 2.1.2 In `handleStart`, call `Audio.requestPermissionsAsync()` before `startAudioRecording()` and return early with a descriptive error if `status !== 'granted'`
- [ ] 2.2 Write unit tests for microphone permission handling
  - [ ] 2.2.1 Test: permission denied shows error message and does not start recording
  - [ ] 2.2.2 Test: permission granted proceeds to start recording normally
  - [ ] 2.2.3 Test: already-granted permission does not re-prompt the user

## Bug 3: Orphaned File Leak on Memory Deletion

- [ ] 3.1 Make storage deletion reliable in `TimelineScreen.tsx`
  - [ ] 3.1.1 Check the `error` result from `supabase.storage.from('wedo-assets').remove()` for both photo and audio paths
  - [ ] 3.1.2 If `extractStoragePath()` returns `null` for a non-null URL, treat as an error and abort deletion with a user-facing alert
  - [ ] 3.1.3 If any storage deletion fails, show an alert and do NOT proceed to delete the database row
- [ ] 3.2 Write unit tests for reliable storage deletion
  - [ ] 3.2.1 Test: successful photo + audio storage deletion proceeds to delete DB row
  - [ ] 3.2.2 Test: failed photo storage deletion aborts DB row deletion and shows error
  - [ ] 3.2.3 Test: `extractStoragePath` returning null for a valid URL aborts deletion
  - [ ] 3.2.4 Test: memory with no audio deletes photo only and succeeds

## Bug 4: Realtime Memory Leak on Sign-Out

- [ ] 4.1 Add realtime cleanup to sign-out flow in `SettingsScreen.tsx`
  - [ ] 4.1.1 Import `realtimeManager` from `../services/realtimeManager` in `SettingsScreen.tsx`
  - [ ] 4.1.2 Call `realtimeManager.unsubscribeAll()` as the first action in `handleSignOut`'s `onPress` callback, before `supabase.auth.signOut()` and `clearAuth()`
- [ ] 4.2 Write unit tests for sign-out realtime cleanup
  - [ ] 4.2.1 Test: `realtimeManager.unsubscribeAll()` is called before `supabase.auth.signOut()`
  - [ ] 4.2.2 Test: sign-out still completes successfully and clears auth state after realtime cleanup
