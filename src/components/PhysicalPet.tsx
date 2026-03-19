import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Pet } from '../services/petService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Physics constants
const SCENE_WIDTH = SCREEN_WIDTH - 32;
const SCENE_HEIGHT = 280;
const FLOOR_HEIGHT = 40;
const PET_SIZE = 80;
const MAX_X = SCENE_WIDTH - PET_SIZE;
const MAX_Y = SCENE_HEIGHT - FLOOR_HEIGHT - PET_SIZE;

interface PhysicalPetProps {
  pet: Pet;
  initialX: number;
}

export default function PhysicalPet({ pet, initialX }: PhysicalPetProps) {
  const x = useSharedValue(initialX);
  const y = useSharedValue(MAX_Y); // Start on the floor

  // Deformation physics (squash & stretch)
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const isGrabbed = useSharedValue(false);

  const pan = Gesture.Pan()
    .onBegin(() => {
      isGrabbed.value = true;
      scaleX.value = withSpring(0.9);
      scaleY.value = withSpring(1.1);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onChange((e) => {
      x.value = Math.max(0, Math.min(e.changeX + x.value, MAX_X));
      y.value = Math.max(0, Math.min(e.changeY + y.value, MAX_Y));
    })
    .onEnd((e) => {
      isGrabbed.value = false;

      // X-axis: throw with momentum, bounce off walls
      x.value = withDecay({
        velocity: e.velocityX,
        clamp: [0, MAX_X],
        rubberBandEffect: true,
      });

      // Y-axis: gravity — fall to floor with realistic bounce
      y.value = withSpring(
        MAX_Y,
        { velocity: e.velocityY, damping: 12, stiffness: 150, mass: 1 },
        (finished) => {
          if (finished) {
            // Squash on floor impact
            scaleX.value = withSequence(
              withTiming(1.2, { duration: 100 }),
              withSpring(1),
            );
            scaleY.value = withSequence(
              withTiming(0.8, { duration: 100 }),
              withSpring(1),
            );
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
          }
        },
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
    shadowOpacity: isGrabbed.value ? 0.4 : 0.2,
    shadowRadius: isGrabbed.value ? 15 : 5,
    shadowOffset: {
      width: 0,
      height: isGrabbed.value ? 15 : 5,
    },
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.petBody,
          { backgroundColor: pet.color_hex },
          animatedStyle,
        ]}
      >
        <Text style={styles.name}>{pet.name}</Text>
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  petBody: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
    borderRadius: PET_SIZE / 2,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
  },
  name: {
    position: 'absolute',
    top: -25,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  eyes: {
    flexDirection: 'row',
    width: 30,
    justifyContent: 'space-between',
    marginTop: -10,
  },
  eye: {
    width: 6,
    height: 12,
    backgroundColor: '#121212',
    borderRadius: 4,
  },
});
