import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  startRecording as startAudioRecording,
  uploadAudio,
  type RecordingResult,
} from '../services/audioRecorderService';

interface AudioRecorderProps {
  memoryId: string;
  relationshipId: string;
  onAudioAttached: (audioUrl: string) => void;
  onCancel: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioRecorder({
  memoryId,
  relationshipId,
  onAudioAttached,
  onCancel,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);

  const stopFnRef = useRef<(() => Promise<RecordingResult>) | null>(null);

  const handleStart = useCallback(async () => {
    try {
      setError(null);

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone access is required to record voice notes');
        return;
      }

      setIsRecording(true);
      setDurationMs(0);

      const { stop } = await startAudioRecording(
        (ms) => setDurationMs(ms),
        () => {
          // Auto-stop callback — finalize recording
          setIsRecording(false);
        },
      );
      stopFnRef.current = stop;
    } catch (err: any) {
      setIsRecording(false);
      setError('Could not start recording. Check microphone permissions.');
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!stopFnRef.current) return;
    setIsRecording(false);
    try {
      const result = await stopFnRef.current();
      stopFnRef.current = null;
      if (result.uri) {
        setLocalUri(result.uri);
        await doUpload(result.uri);
      }
    } catch {
      setError('Recording failed. Please try again.');
    }
  }, [memoryId, relationshipId]);

  const doUpload = useCallback(
    async (uri: string) => {
      setUploading(true);
      setError(null);
      try {
        const audioUrl = await uploadAudio(uri, memoryId, relationshipId);
        onAudioAttached(audioUrl);
      } catch {
        setLocalUri(uri);
        setError('Upload failed — tap to retry.');
      } finally {
        setUploading(false);
      }
    },
    [memoryId, relationshipId, onAudioAttached],
  );

  const handleRetry = useCallback(() => {
    if (localUri) {
      doUpload(localUri);
    }
  }, [localUri, doUpload]);

  // Recording in progress
  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.durationText}>{formatDuration(durationMs)}</Text>
          <Text style={styles.maxLabel}> / 1:00</Text>
        </View>
        <Pressable
          onPress={handleStop}
          style={styles.stopButton}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
        >
          <View style={styles.stopSquare} />
        </Pressable>
      </View>
    );
  }

  // Uploading
  if (uploading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FF7F50" size="small" />
        <Text style={styles.uploadingText}>Uploading…</Text>
      </View>
    );
  }

  // Error with retry
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        {localUri && (
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Ready to record
  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleStart}
        style={styles.recordButton}
        accessibilityRole="button"
        accessibilityLabel="Start recording voice note"
      >
        <Text style={styles.micIcon}>🎙️</Text>
        <Text style={styles.recordLabel}>Tap to record</Text>
      </Pressable>
      <Pressable onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginTop: 6,
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  maxLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  uploadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,127,80,0.15)',
    borderRadius: 8,
  },
  retryText: {
    color: '#FF7F50',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 13,
  },
  recordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  micIcon: {
    fontSize: 18,
  },
  recordLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
