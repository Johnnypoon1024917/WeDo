import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

// Dark, moody color sets: deep purples, dark teals, midnight blues
const LAYERS: { colors: [string, string, string]; start: { x: number; y: number }; end: { x: number; y: number } }[] = [
  {
    colors: ['#0D0D1A', '#1A0A2E', '#0A1628'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    colors: ['#0A1628', '#0D2137', '#1A0A2E'],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
  },
  {
    colors: ['#1A0A2E', '#0D0D1A', '#0D2137'],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
];

const PHASE_DURATION = 4000; // 4s per fade phase — slow, breathing feel

export default function MeshGradient() {
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);

  React.useEffect(() => {
    // Layer 1 fades in/out offset from layer 2 for continuous color movement
    opacity1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Layer 2 starts offset so the transitions overlap
    opacity2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: PHASE_DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [opacity1, opacity2]);

  const style1 = useAnimatedStyle(() => ({ opacity: opacity1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: opacity2.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base layer — always visible */}
      <LinearGradient
        colors={LAYERS[0].colors}
        start={LAYERS[0].start}
        end={LAYERS[0].end}
        style={StyleSheet.absoluteFill}
      />
      {/* Animated overlay layers */}
      <AnimatedGradient
        colors={LAYERS[1].colors}
        start={LAYERS[1].start}
        end={LAYERS[1].end}
        style={[StyleSheet.absoluteFill, style1]}
      />
      <AnimatedGradient
        colors={LAYERS[2].colors}
        start={LAYERS[2].start}
        end={LAYERS[2].end}
        style={[StyleSheet.absoluteFill, style2]}
      />
    </View>
  );
}
