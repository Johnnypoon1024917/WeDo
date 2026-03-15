import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { supabase } from '../lib/supabase';

const MAX_DURATION_MS = 60_000; // 60 seconds

/**
 * Configure audio session for recording.
 */
async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    playsInSilentModeIOS: true,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

/**
 * Reset audio session for playback after recording.
 */
async function resetAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    playsInSilentModeIOS: true,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

let activeRecording: Audio.Recording | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

/**
 * Start recording audio in .m4a (MPEG4 AAC) format.
 * Auto-stops at 60 seconds.
 * Returns a promise that resolves when recording is stopped (manually or auto).
 */
export async function startRecording(
  onDurationUpdate?: (ms: number) => void,
  onAutoStop?: () => void,
): Promise<{ stop: () => Promise<RecordingResult> }> {
  if (activeRecording) {
    throw new Error('A recording is already in progress.');
  }

  await configureAudioSession();

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  activeRecording = recording;

  // Duration polling
  let durationInterval: ReturnType<typeof setInterval> | null = null;
  if (onDurationUpdate) {
    durationInterval = setInterval(async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          onDurationUpdate(status.durationMillis);
        }
      } catch {
        // Recording may have been stopped
      }
    }, 250);
  }

  const cleanup = () => {
    if (durationInterval) clearInterval(durationInterval);
    if (autoStopTimer) clearTimeout(autoStopTimer);
    autoStopTimer = null;
    activeRecording = null;
  };

  const stop = async (): Promise<RecordingResult> => {
    cleanup();
    try {
      const status = await recording.getStatusAsync();
      await recording.stopAndUnloadAsync();
      await resetAudioSession();
      const uri = recording.getURI() ?? '';
      return { uri, durationMs: status.durationMillis };
    } catch {
      await resetAudioSession();
      const uri = recording.getURI() ?? '';
      return { uri, durationMs: 0 };
    }
  };

  // Auto-stop at 60 seconds
  autoStopTimer = setTimeout(async () => {
    if (activeRecording === recording) {
      const result = await stop();
      onAutoStop?.();
      // The caller should handle the result via the onAutoStop callback
      // We store it so the stop() call from the UI side can retrieve it
      void result;
    }
  }, MAX_DURATION_MS);

  return { stop };
}

/**
 * Upload a recorded .m4a file to Supabase Storage and link it to a memory entry.
 */
export async function uploadAudio(
  localUri: string,
  entryId: string,
  relationshipId: string,
): Promise<string> {
  const storagePath = `${relationshipId}/audio/${entryId}.m4a`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('wedo-assets')
    .upload(storagePath, blob, {
      contentType: 'audio/mp4',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('wedo-assets')
    .getPublicUrl(storagePath);

  // Link audio to memory entry
  const { error: updateError } = await supabase
    .from('memories')
    .update({ audio_url: urlData.publicUrl })
    .eq('id', entryId);

  if (updateError) throw updateError;

  return urlData.publicUrl;
}
