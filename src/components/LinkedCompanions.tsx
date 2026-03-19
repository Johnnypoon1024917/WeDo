import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { Pet } from '../services/petService';
import DynamicScene from './DynamicScene';
import PhysicalPet from './PhysicalPet';

interface LinkedCompanionsProps {
  myPet: Pet | null;
  partnerPet: Pet | null;
  relationshipId: string;
}

export default function LinkedCompanions({
  myPet,
  partnerPet,
}: LinkedCompanionsProps) {
  if (!myPet) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🥚</Text>
        <Text style={styles.emptyTitle}>Your Companion Awaits</Text>
        <Text style={styles.emptySubtext}>
          Create your companion to start interacting together
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView>
      <DynamicScene scene="warmHome">
        <PhysicalPet pet={myPet} initialX={20} />
        {partnerPet && (
          <PhysicalPet pet={partnerPet} initialX={160} />
        )}
      </DynamicScene>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
