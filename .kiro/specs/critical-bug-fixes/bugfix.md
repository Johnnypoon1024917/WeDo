# Bugfix Requirements Document

## Introduction

This document covers four critical bugs in the WeDo React Native Expo app: a monetization loophole allowing free users to bypass the 10-item bucket list limit via social sharing deep links, a crash caused by missing microphone permission requests before audio recording, orphaned storage files leaking when Timeline memories are deleted, and a realtime WebSocket memory leak on sign-out due to subscriptions never being cleaned up.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a free user shares a link from Instagram or another app and the deep link handler in `App.tsx` navigates directly to `AddToListModal`, THEN the system allows the item to be saved without checking the 10-item bucket list limit, bypassing the paywall

1.2 WHEN a free user repeatedly shares links from external apps while already at or above the 10-item limit, THEN the system inserts unlimited bucket list items, completely circumventing the monetization gate

1.3 WHEN a Premium user taps the microphone button to record a voice note in `AudioRecorder.tsx`, THEN the system calls `startAudioRecording()` without first requesting microphone permissions, causing an unhandled error or app crash on iOS and Android

1.4 WHEN a user deletes a Timeline memory that has an associated compressed `.jpg` photo, THEN the system deletes the database row but the `extractStoragePath()` helper may fail to resolve the path for photos uploaded via the image compression pipeline, leaving orphaned `.jpg` files in the `wedo-assets` Supabase Storage bucket

1.5 WHEN a user deletes a Timeline memory that has an associated `.m4a` audio file, THEN the system attempts to delete the audio file but silently ignores storage deletion failures, allowing orphaned `.m4a` files to accumulate

1.6 WHEN a user taps "Sign Out" in `SettingsScreen.tsx`, THEN the system calls `supabase.auth.signOut()` and `clearAuth()` but never calls `realtimeManager.unsubscribeAll()`, leaving active WebSocket subscriptions running in the background

1.7 WHEN the orphaned realtime subscriptions receive database change events after sign-out, THEN the system attempts to update React state on unmounted components, causing memory leaks and "Can't perform a React state update on an unmounted component" warnings

### Expected Behavior (Correct)

2.1 WHEN a free user opens `AddToListModal` via a deep link (social share) and their bucket list item count is >= 10 and they are not Premium, THEN the system SHALL redirect to the `PaywallModal` instead of showing the add-item form

2.2 WHEN a free user opens `AddToListModal` via a deep link and their bucket list item count is < 10, THEN the system SHALL allow the item to be added normally with the pre-filled URL

2.3 WHEN a user taps the microphone button to start recording in `AudioRecorder.tsx`, THEN the system SHALL request microphone permissions via `Audio.requestPermissionsAsync()` before calling `startAudioRecording()`, and only proceed if permission is granted

2.4 WHEN microphone permission is denied by the user, THEN the system SHALL display an informative error message (e.g., "Microphone access is required to record voice notes") without crashing

2.5 WHEN a user deletes a Timeline memory, THEN the system SHALL delete all associated files (photo `.jpg` and audio `.m4a` if present) from the `wedo-assets` Supabase Storage bucket before or alongside deleting the database row

2.6 WHEN storage file deletion fails during memory deletion, THEN the system SHALL surface the error to the user rather than silently ignoring it

2.7 WHEN a user taps "Sign Out", THEN the system SHALL call `realtimeManager.unsubscribeAll()` to close all active WebSocket subscriptions before calling `supabase.auth.signOut()` and `clearAuth()`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Premium user opens `AddToListModal` via a deep link (social share), THEN the system SHALL CONTINUE TO allow the item to be added regardless of item count

3.2 WHEN a free user taps the "+" FAB button on `BucketListScreen` with fewer than 10 items, THEN the system SHALL CONTINUE TO navigate to `AddToListModal` normally

3.3 WHEN a free user taps the "+" FAB button on `BucketListScreen` with 10 or more items, THEN the system SHALL CONTINUE TO navigate to `PaywallModal`

3.4 WHEN a Premium user taps the microphone button and microphone permission is already granted, THEN the system SHALL CONTINUE TO start recording immediately without re-prompting

3.5 WHEN a user deletes a Timeline memory that has no audio attachment, THEN the system SHALL CONTINUE TO delete only the photo file and database row without errors

3.6 WHEN a user is signed in and navigating the app normally, THEN the system SHALL CONTINUE TO maintain active realtime subscriptions for memories, bucket list, stickers, and calendar events

3.7 WHEN a user disconnects from their partner via the "Disconnect" button in Settings, THEN the system SHALL CONTINUE TO clear auth state as it does today (realtime cleanup is only required for sign-out)
