import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import {
  type PetState,
  getEvolutionStage,
  getPetMood,
  type EvolutionStage,
} from '../services/petService';

interface RelationshipPetProps {
  petState: PetState;
}

const STAGE_EMOJI: Record<EvolutionStage, string> = {
  egg: '🥚',
  baby: '🐣',
  teen: '🐥',
  adult: '🐔',
};

/**
 * Static mapping of animation sources since React Native
 * does not support dynamic require() calls.
 */
const ANIMATIONS: Record<string, ReturnType<typeof require>> = {
  'egg-happy': require('../../assets/animations/pet-egg-happy.json'),
  'egg-sad': require('../../assets/animations/pet-egg-sad.json'),
  'baby-happy': require('../../assets/animations/pet-baby-happy.json'),
  'baby-sad': require('../../assets/animations/pet-baby-sad.json'),
  'teen-happy': require('../../assets/animations/pet-teen-happy.json'),
  'teen-sad': require('../../assets/animations/pet-teen-sad.json'),
  'adult-happy': require('../../assets/animations/pet-adult-happy.json'),
  'adult-sad': require('../../assets/animations/pet-adult-sad.json'),
};

export default function RelationshipPet({ petState }: RelationshipPetProps) {
  const { petName, petHealth, petTotalXp } = petState;
  const stage = getEvolutionStage(petTotalXp);
  const mood = getPetMood(petHealth);
  const animationKey = `${stage}-${mood}`;
  const [lottieError, setLottieError] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.petName}>{petName}</Text>

      <View style={styles.animationContainer}>
        {lottieError || !ANIMATIONS[animationKey] ? (
          <Text style={styles.fallbackEmoji}>{STAGE_EMOJI[stage]}</Text>
        ) : (
          <LottieView
            source={ANIMATIONS[animationKey]}
            autoPlay
            loop
            style={styles.lottie}
            onAnimationFailure={() => setLottieError(true)}
          />
        )}
      </View>

      <View style={styles.healthBarTrack}>
        <View
          style={[styles.healthBarFill, { width: `${petHealth}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#121212',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF7F50',
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7F50',
    marginBottom: 8,
  },
  animationContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: 120,
    height: 120,
  },
  fallbackEmoji: {
    fontSize: 64,
  },
  healthBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#FF7F50',
    borderRadius: 4,
  },
});
