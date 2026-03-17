import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export type SkeletonShape = 'card' | 'row' | 'circle';

interface SkeletonCardProps {
  shape?: SkeletonShape;
}

const SHIMMER_DURATION = 1200;

const SHAPE_STYLES: Record<SkeletonShape, { width: number | '100%'; height: number; borderRadius: number }> = {
  card: { width: '100%', height: 180, borderRadius: 16 },
  row: { width: '100%', height: 48, borderRadius: 10 },
  circle: { width: 56, height: 56, borderRadius: 28 },
};

export default function SkeletonCard({ shape = 'card' }: SkeletonCardProps) {
  const translateX = useSharedValue(-1);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 200 }],
  }));

  const { width, height, borderRadius } = SHAPE_STYLES[shape];

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius },
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading"
    >
      <Animated.View style={[styles.shimmerWrapper, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
  },
  shimmerWrapper: {
    ...StyleSheet.absoluteFillObject,
    width: '150%',
  },
  gradient: {
    flex: 1,
  },
});
