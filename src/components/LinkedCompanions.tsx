import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, Alert } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RealtimeChannel } from '@supabase/realtime-js';
import {
  type Pet,
  archetypeToEmoji,
  formatInteractionStatus,
  type InteractionType,
  boostPetHealth,
} from '../services/petService';
import {
  subscribeToPetRoom,
  sendInteraction,
  unsubscribeFromPetRoom,
  type InteractionPayload,
} from '../services/petInteractionService';
import { useAppStore } from '../store/appStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface LinkedCompanionsProps {
  myPet: Pet | null;
  partnerPet: Pet | null;
  relationshipId: string;
}

function PetAvatar({
  pet,
  label,
  reactionY,
}: {
  pet: Pet;
  label: string;
  reactionY?: SharedValue<number>;
}) {
  const breathe1 = useSharedValue(1);
  const breathe2 = useSharedValue(1);
  const healthBarWidth = useSharedValue(pet.health);

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

  useEffect(() => {
    healthBarWidth.value = withSpring(pet.health, { damping: 15 });
  }, [pet.health]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: breathe1.value },
      { scaleY: breathe2.value },
      { translateY: reactionY ? reactionY.value : 0 },
    ],
  }));

  const healthBarStyle = useAnimatedStyle(() => ({
    width: `${healthBarWidth.value}%`,
    backgroundColor: pet.health > 30 ? '#40E0D0' : '#EF4444',
  }));

  const emoji = archetypeToEmoji(pet.archetype);

  return (
    <View style={styles.avatarContainer}>
      <Animated.View
        style={[
          styles.emojiWrapper,
          { backgroundColor: `${pet.color_hex}22` },
          bodyStyle,
        ]}
      >
        <Text style={[styles.emojiText, { textShadowColor: pet.color_hex }]}>
          {emoji}
        </Text>
      </Animated.View>
      <Text style={styles.petNameText} numberOfLines={1}>
        {pet.name}
      </Text>
      <View style={styles.healthBarTrack}>
        <Animated.View style={[styles.healthBarFill, healthBarStyle]} />
      </View>
    </View>
  );
}


export default function LinkedCompanions({
  myPet,
  partnerPet,
  relationshipId,
}: LinkedCompanionsProps) {
  const [lastInteraction, setLastInteraction] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentUserId = useAppStore((s) => s.user?.id) ?? '';

  // Shared value for partner pet reaction animation
  const reactionY = useSharedValue(0);

  // ─── Real-time subscription ───────────────────────────────────────────
  const onInteraction = useCallback(
    (payload: InteractionPayload) => {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Bounce reaction animation on partner's pet avatar
      reactionY.value = withSequence(
        withTiming(-20, { duration: 150 }),
        withSpring(0)
      );

      // Update status text
      if (myPet) {
        setLastInteraction(formatInteractionStatus(payload.type, myPet.name));
      }

      // If feed interaction, boost pet health
      if (payload.type === 'feed') {
        boostPetHealth(payload.targetPetId, 5).catch(() => {
          // Silently handle — health will reconcile on reconnect
        });
      }
    },
    [myPet, reactionY]
  );

  useEffect(() => {
    if (!currentUserId || !relationshipId) return;

    const channel = subscribeToPetRoom(relationshipId, currentUserId, onInteraction);
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        unsubscribeFromPetRoom(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [relationshipId, currentUserId, onInteraction]);

  // ─── Gesture handlers (partner's pet only) ────────────────────────────
  const handlePoke = useCallback(() => {
    if (!partnerPet || !channelRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendInteraction(channelRef.current, {
      type: 'poke',
      fromUserId: currentUserId,
      targetPetId: partnerPet.id,
      timestamp: Date.now(),
    });
  }, [partnerPet, currentUserId]);

  const showContextMenu = useCallback(() => {
    if (!partnerPet || !channelRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const options: { label: string; type: InteractionType }[] = [
      { label: '🤗 Hug', type: 'hug' },
      { label: '🍕 Feed', type: 'feed' },
      { label: '💋 Kiss', type: 'kiss' },
    ];

    Alert.alert(
      `Interact with ${partnerPet.name}`,
      'Choose an interaction:',
      [
        ...options.map((opt) => ({
          text: opt.label,
          onPress: () => {
            if (!channelRef.current) return;
            sendInteraction(channelRef.current, {
              type: opt.type,
              fromUserId: currentUserId,
              targetPetId: partnerPet.id,
              timestamp: Date.now(),
            });
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [partnerPet, currentUserId]);

  // Tap gesture → poke
  const tapGesture = Gesture.Tap().onEnd(() => {
    handlePoke();
  });

  // Long-press gesture → context menu
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd(() => {
      showContextMenu();
    });

  const partnerGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // ─── Null state: myPet missing ────────────────────────────────────────
  if (!myPet) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.card}>
          <View style={styles.centeredContent}>
            <Text style={styles.placeholderEmoji}>🥚</Text>
            <Text style={styles.placeholderText}>Create your companion!</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView>
      <View style={styles.outerContainer}>
        <View style={styles.card}>
          <View style={styles.avatarsRow}>
            {/* Own pet — no gestures */}
            <PetAvatar pet={myPet} label="You" />

            {partnerPet ? (
              <GestureDetector gesture={partnerGesture}>
                <Animated.View style={styles.avatarContainer}>
                  <PetAvatar
                    pet={partnerPet}
                    label="Partner"
                    reactionY={reactionY}
                  />
                </Animated.View>
              </GestureDetector>
            ) : (
              <View style={styles.avatarContainer}>
                <View style={styles.placeholderAvatar}>
                  <Text style={styles.placeholderAvatarEmoji}>❓</Text>
                </View>
                <Text style={styles.petNameText}>Waiting for partner...</Text>
              </View>
            )}
          </View>

          {lastInteraction !== '' && (
            <Text style={styles.statusText}>{lastInteraction}</Text>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(26,26,26,0.85)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  emojiWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 48,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  petNameText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  healthBarTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusText: {
    marginTop: 14,
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  placeholderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderAvatarEmoji: {
    fontSize: 32,
    opacity: 0.5,
  },
});