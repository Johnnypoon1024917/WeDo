import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { type Pet, archetypeToEmoji } from '../services/petService';
import { useRoamingEngine, type GroundBounds } from '../hooks/useRoamingEngine';

interface GardenPetLayerProps {
  myPet: Pet | null;
  partnerPet: Pet | null;
  groundBounds: GroundBounds;
  foodPosition: { x: number; y: number } | null;
  onEatingComplete: () => void;
}

const PET_SIZE = 64;

function RoamingPetAvatar({
  pet,
  groundBounds,
  foodPosition,
  onArrived,
}: {
  pet: Pet;
  groundBounds: GroundBounds;
  foodPosition: { x: number; y: number } | null;
  onArrived: () => void;
}) {
  const hasValidBounds =
    groundBounds.right > groundBounds.left && groundBounds.bottom > groundBounds.top;

  const { animatedStyle: roamStyle, setAttractTarget, facingDirection } =
    useRoamingEngine(groundBounds, hasValidBounds);

  const arrivedRef = useRef(false);

  // Breathing animation shared values
  const breatheX = useSharedValue(1);
  const breatheY = useSharedValue(1);

  useEffect(() => {
    breatheX.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    breatheY.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.05, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [breatheX, breatheY]);

  // React to foodPosition changes
  useEffect(() => {
    if (foodPosition) {
      arrivedRef.current = false;
      setAttractTarget(foodPosition);
    } else {
      setAttractTarget(null);
      arrivedRef.current = false;
    }
  }, [foodPosition, setAttractTarget]);

  // Track arrival at food position
  useEffect(() => {
    if (!foodPosition) return;

    const checkInterval = setInterval(() => {
      if (arrivedRef.current) return;
      // The roaming engine moves to the target in ~1500ms.
      // We mark arrived after a generous timeout to account for animation.
      arrivedRef.current = true;
      onArrived();
      clearInterval(checkInterval);
    }, 1800);

    return () => clearInterval(checkInterval);
  }, [foodPosition, onArrived]);

  // Flip based on facing direction + breathing transforms
  const combinedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: facingDirection.value === 'left' ? -breatheX.value : breatheX.value },
      { scaleY: breatheY.value },
    ],
  }));

  const emoji = archetypeToEmoji(pet.archetype);

  return (
    <Animated.View style={[styles.petContainer, roamStyle]}>
      <Animated.View
        style={[
          styles.emojiWrapper,
          { backgroundColor: `${pet.color_hex}33` },
          combinedStyle,
        ]}
      >
        <Text style={styles.emojiText}>{emoji}</Text>
      </Animated.View>
      <Text style={styles.petName} numberOfLines={1}>
        {pet.name}
      </Text>
    </Animated.View>
  );
}

export default function GardenPetLayer({
  myPet,
  partnerPet,
  groundBounds,
  foodPosition,
  onEatingComplete,
}: GardenPetLayerProps) {
  const myPetArrivedRef = useRef(false);
  const partnerPetArrivedRef = useRef(false);
  const eatingFiredRef = useRef(false);

  // Reset arrival tracking when foodPosition changes
  useEffect(() => {
    myPetArrivedRef.current = false;
    partnerPetArrivedRef.current = false;
    eatingFiredRef.current = false;
  }, [foodPosition]);

  const checkBothArrived = () => {
    if (eatingFiredRef.current) return;
    // If one pet is null, only need the other to arrive
    const myDone = !myPet || myPetArrivedRef.current;
    const partnerDone = !partnerPet || partnerPetArrivedRef.current;
    if (myDone && partnerDone && foodPosition) {
      eatingFiredRef.current = true;
      onEatingComplete();
    }
  };

  const handleMyPetArrived = () => {
    myPetArrivedRef.current = true;
    checkBothArrived();
  };

  const handlePartnerPetArrived = () => {
    partnerPetArrivedRef.current = true;
    checkBothArrived();
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {myPet && (
        <RoamingPetAvatar
          pet={myPet}
          groundBounds={groundBounds}
          foodPosition={foodPosition}
          onArrived={handleMyPetArrived}
        />
      )}
      {partnerPet && (
        <RoamingPetAvatar
          pet={partnerPet}
          groundBounds={groundBounds}
          foodPosition={foodPosition}
          onArrived={handlePartnerPetArrived}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  petContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: PET_SIZE + 16,
  },
  emojiWrapper: {
    width: PET_SIZE,
    height: PET_SIZE,
    borderRadius: PET_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 36,
  },
  petName: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
