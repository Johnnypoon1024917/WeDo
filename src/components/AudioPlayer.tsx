import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

interface AudioPlayerProps {
  audioUrl: string;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadSound = useCallback(async () => {
    if (soundRef.current) return soundRef.current;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      playsInSilentModeIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false },
      (status) => {
        if (!status.isLoaded) return;
        setPositionMs(status.positionMillis);
        setDurationMs(status.durationMillis ?? 0);
        if (status.didJustFinish) {
          setIsPlaying(false);
          sound.setPositionAsync(0);
        }
      },
    );
    soundRef.current = sound;
    return sound;
  }, [audioUrl]);

  const togglePlayback = useCallback(async () => {
    const sound = await loadSound();
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  }, [isPlaying, loadSound]);

  // Simple waveform bars (visual representation)
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const BAR_COUNT = 20;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={togglePlayback}
        style={styles.playButton}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
      </Pressable>

      <View style={styles.waveformContainer}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          // Pseudo-random bar heights for visual effect
          const seed = ((i * 7 + 3) % 11) / 11;
          const barHeight = 8 + seed * 16;
          const isFilled = i / BAR_COUNT <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: isFilled ? '#FF7F50' : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.duration}>
        {formatDuration(positionMs)}/{formatDuration(durationMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,127,80,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 14,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  bar: {
    flex: 1,
    borderRadius: 1.5,
    minWidth: 3,
  },
  duration: {
    color: '#9CA3AF',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
  },
});
