import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type PetState,
  getEvolutionStage,
  getPetMood,
} from '../services/petService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = 220;
const CENTER_X = CARD_WIDTH / 2;
const CENTER_Y = CARD_HEIGHT / 2;

const PET_COLORS = {
  egg: ['#FDE68A', '#D97706'] as const,
  baby: ['#FFB6C1', '#DB2777'] as const,
  teen: ['#FF7F50', '#EA580C'] as const,
  adult: ['#40E0D0', '#0369A1'] as const,
  sad: ['#9CA3AF', '#374151'] as const,
};

export default function RelationshipPet({ petState }: { petState: PetState }) {
  const { petName, petHealth, petTotalXp } = petState;
  const stage = getEvolutionStage(petTotalXp);
  const mood = getPetMood(petHealth);
  const [isJumping, setIsJumping] = useState(false);

  // --- Physics & Touch Tracking ---
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const isTouching = useSharedValue(0);

  // --- Breathing Animations ---
  const breathe1 = useSharedValue(1);
  const breathe2 = useSharedValue(1);
  const jumpY = useSharedValue(0);
  const healthBarWidth = useSharedValue(petHealth);

  // 1. Multi-Layer Fluid Breathing
  useEffect(() => {
    breathe1.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    breathe2.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // 2. Health Bar Update
  useEffect(() => {
    healthBarWidth.value = withSpring(petHealth, { damping: 15 });
  }, [petHealth]);

  // 3. Gesture Handling (3D Tilt & Eye Tracking)
  const pan = Gesture.Pan()
    .onBegin((e) => {
      isTouching.value = withTiming(1, { duration: 200 });
      touchX.value = withSpring(e.x - CENTER_X, { damping: 15 });
      touchY.value = withSpring(e.y - CENTER_Y, { damping: 15 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      touchX.value = e.x - CENTER_X;
      touchY.value = e.y - CENTER_Y;
    })
    .onEnd(() => {
      isTouching.value = withTiming(0, { duration: 300 });
      touchX.value = withSpring(0, { damping: 12, stiffness: 100 });
      touchY.value = withSpring(0, { damping: 12, stiffness: 100 });
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (isJumping) return;
    runOnJS(setIsJumping)(true);
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
    jumpY.value = withSequence(
      withTiming(-50, { duration: 250, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 10, stiffness: 200 }, () => {
        runOnJS(setIsJumping)(false);
      })
    );
  });

  const composedGesture = Gesture.Simultaneous(pan, tap);

  // --- Animated Styles ---

  // 3D Card Tilt Effect
  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(
      touchY.value,
      [-CENTER_Y, CENTER_Y],
      [10, -10],
      Extrapolation.CLAMP
    );
    const rotateY = interpolate(
      touchX.value,
      [-CENTER_X, CENTER_X],
      [-10, 10],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX}deg` },
        { rotateY: `${rotateY}deg` },
        { scale: interpolate(isTouching.value, [0, 1], [1, 0.98]) },
      ],
      shadowOpacity: interpolate(isTouching.value, [0, 1], [0.2, 0.4]),
      shadowRadius: interpolate(isTouching.value, [0, 1], [10, 20]),
    };
  });

  // Eye Tracking Effect (Eyes move towards finger)
  const eyeAnimatedStyle = useAnimatedStyle(() => {
    const maxEyeMove = 12;
    const moveX = interpolate(
      touchX.value,
      [-CENTER_X, CENTER_X],
      [-maxEyeMove, maxEyeMove],
      Extrapolation.CLAMP
    );
    const moveY = interpolate(
      touchY.value,
      [-CENTER_Y, CENTER_Y],
      [-maxEyeMove, maxEyeMove],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: moveX }, { translateY: moveY }],
    };
  });

  // Body Breathing & Jumping
  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: jumpY.value },
      { scaleX: breathe1.value },
      { scaleY: breathe2.value },
    ],
  }));

  const healthBarStyle = useAnimatedStyle(() => ({
    width: `${healthBarWidth.value}%`,
    backgroundColor: petHealth > 30 ? '#40E0D0' : '#EF4444',
  }));

  const colors =
    mood === 'sad'
      ? PET_COLORS.sad
      : PET_COLORS[stage as keyof typeof PET_COLORS] || PET_COLORS.egg;
  const size =
    stage === 'egg'
      ? 90
      : stage === 'baby'
        ? 110
        : stage === 'teen'
          ? 130
          : 150;

  return (
    <View style={styles.outerContainer}>
      <GestureHandlerRootView>
        <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          {/* Header Info */}
          <View style={styles.headerRow}>
            <Text style={styles.petName}>{petName}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LVL {stage.toUpperCase()}</Text>
            </View>
          </View>

          {/* The Pet Container */}
          <View style={styles.petStage}>
            {/* Glowing Aura Behind Pet */}
            <Animated.View
              style={[
                styles.glow,
                { backgroundColor: colors[0] },
                bodyAnimatedStyle,
              ]}
            />

            {/* Main Fluid Body */}
            <Animated.View
              style={[
                styles.bodyWrapper,
                bodyAnimatedStyle,
                { width: size, height: size },
              ]}
            >
              <LinearGradient
                colors={[...colors]}
                style={styles.gradientBody}
              />

              {/* The Face & Eye Tracking */}
              {stage !== 'egg' && (
                <Animated.View style={[styles.face, eyeAnimatedStyle]}>
                  <View style={styles.eyesRow}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                  <View
                    style={
                      mood === 'sad' ? styles.mouthSad : styles.mouthHappy
                    }
                  />
                </Animated.View>
              )}

              {/* Egg decoration */}
              {stage === 'egg' && (
                <View style={styles.eggSpots}>
                  <View style={styles.spot1} />
                  <View style={styles.spot2} />
                </View>
              )}
            </Animated.View>

            {/* Floor Shadow */}
            <View style={styles.floorShadow} />
          </View>

          {/* Health Bar Footer */}
          <View style={styles.footer}>
            <View style={styles.healthBarTrack}>
              <Animated.View style={[styles.healthBarFill, healthBarStyle]} />
            </View>
            <Text style={styles.healthText}>
              Love Meter: {Math.round(petHealth)}%
            </Text>
          </View>
        </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 10 },
    padding: 20,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  petName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: 'rgba(64,224,208,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(64,224,208,0.3)',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#40E0D0',
    letterSpacing: 1,
  },
  petStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.15,
    transform: [{ scale: 1.5 }],
  },
  bodyWrapper: {
    borderRadius: 100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  gradientBody: {
    ...StyleSheet.absoluteFillObject,
  },
  face: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  eyesRow: {
    flexDirection: 'row',
    width: 40,
    justifyContent: 'space-between',
  },
  eye: {
    width: 10,
    height: 14,
    backgroundColor: '#121212',
    borderRadius: 5,
  },
  mouthHappy: {
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#121212',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    marginTop: 6,
  },
  mouthSad: {
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#121212',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    marginTop: 8,
  },
  eggSpots: {
    ...StyleSheet.absoluteFillObject,
  },
  spot1: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
  },
  spot2: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 7,
  },
  floorShadow: {
    position: 'absolute',
    bottom: -10,
    width: 80,
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 7,
  },
  footer: {
    marginTop: 10,
  },
  healthBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthText: {
    marginTop: 8,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    textAlign: 'right',
  },
});
