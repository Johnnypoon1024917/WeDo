import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

/* ── constants ─────────────────────────────────────────────── */

const CELL_SIZE = 20; // ~20px radius equivalent
const REVEAL_THRESHOLD = 0.6; // 60%
const FADE_DURATION = 400; // ms

/* ── types ─────────────────────────────────────────────────── */

type ScratchState = 'SEALED' | 'SCRATCHING' | 'REVEALING' | 'REVEALED';

interface ScratchOffOverlayProps {
  memoryId: string;
  width: number;
  height: number;
}

/* ── component ─────────────────────────────────────────────── */

export default function ScratchOffOverlay({
  memoryId,
  width,
  height,
}: ScratchOffOverlayProps) {
  const cols = Math.ceil(width / CELL_SIZE);
  const rows = Math.ceil(height / CELL_SIZE);
  const totalCells = cols * rows;

  const [erasedCells, setErasedCells] = useState<Set<number>>(new Set());
  const erasedRef = useRef<Set<number>>(new Set());
  const stateRef = useRef<ScratchState>('SEALED');

  const overlayOpacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  /* ── helpers ── */

  const cellIndex = useCallback(
    (x: number, y: number): number => {
      const col = Math.floor(Math.max(0, Math.min(x, width - 1)) / CELL_SIZE);
      const row = Math.floor(Math.max(0, Math.min(y, height - 1)) / CELL_SIZE);
      return row * cols + col;
    },
    [width, height, cols],
  );

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const revealMemory = useCallback(async () => {
    if (stateRef.current === 'REVEALING' || stateRef.current === 'REVEALED') return;
    stateRef.current = 'REVEALING';

    // Fade out overlay
    overlayOpacity.value = withTiming(0, { duration: FADE_DURATION });

    // Persist revealed state to Supabase
    await supabase
      .from('memories')
      .update({ revealed: true })
      .eq('id', memoryId);

    stateRef.current = 'REVEALED';
  }, [memoryId, overlayOpacity]);

  const handleScratch = useCallback(
    (x: number, y: number) => {
      if (stateRef.current === 'REVEALING' || stateRef.current === 'REVEALED') return;

      if (stateRef.current === 'SEALED') {
        stateRef.current = 'SCRATCHING';
      }

      const idx = cellIndex(x, y);
      if (erasedRef.current.has(idx)) return;

      // Also erase neighboring cells for a more natural circular feel
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const newCells: number[] = [];

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const ni = nr * cols + nc;
            if (!erasedRef.current.has(ni)) {
              newCells.push(ni);
            }
          }
        }
      }

      if (newCells.length === 0) return;

      for (const c of newCells) {
        erasedRef.current.add(c);
      }

      // Trigger haptic
      triggerHaptic();

      // Check threshold
      const percentage = erasedRef.current.size / totalCells;
      if (percentage >= REVEAL_THRESHOLD) {
        revealMemory();
      }

      // Batch state update
      setErasedCells(new Set(erasedRef.current));
    },
    [cellIndex, cols, rows, totalCells, triggerHaptic, revealMemory],
  );

  /* ── gesture ── */

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      runOnJS(handleScratch)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(handleScratch)(e.x, e.y);
    })
    .minDistance(0);

  /* ── grid cells ── */

  const gridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < totalCells; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isErased = erasedCells.has(i);

      if (isErased) continue; // Don't render erased cells

      cells.push(
        <View
          key={i}
          style={[
            styles.cell,
            {
              left: col * CELL_SIZE,
              top: row * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
            },
          ]}
        />,
      );
    }
    return cells;
  }, [erasedCells, totalCells, cols]);

  /* ── render ── */

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.overlay, { width, height }, animatedStyle]}>
        {/* Silver metallic gradient base */}
        <View style={[styles.gradientBase, { width, height }]}>
          <View style={styles.gradientTop} />
          <View style={styles.gradientMiddle} />
          <View style={styles.gradientBottom} />
        </View>
        {/* Grid cells that get erased */}
        {gridCells}
      </Animated.View>
    </GestureDetector>
  );
}

/* ── styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  gradientBase: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradientTop: {
    flex: 1,
    backgroundColor: '#C0C0C0',
  },
  gradientMiddle: {
    flex: 1,
    backgroundColor: '#D8D8D8',
  },
  gradientBottom: {
    flex: 1,
    backgroundColor: '#A8A8A8',
  },
  cell: {
    position: 'absolute',
    backgroundColor: '#C8C8C8',
  },
});
