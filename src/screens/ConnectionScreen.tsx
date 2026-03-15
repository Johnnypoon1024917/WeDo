import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useAppStore } from '../store/appStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

import prompts from '../assets/deep_questions.json';

interface Prompt {
  id: number;
  category: string;
  prompt: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 340;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function ConversationCard({
  prompt,
  isFlipped,
  onFlip,
}: {
  prompt: Prompt;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  const flipProgress = useSharedValue(0);

  React.useEffect(() => {
    flipProgress.value = withTiming(isFlipped ? 1 : 0, {
      duration: 400,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isFlipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  return (
    <Pressable
      onPress={onFlip}
      accessibilityRole="button"
      accessibilityLabel={isFlipped ? prompt.prompt : `${prompt.category} card. Tap to reveal`}
    >
      <View style={styles.cardContainer}>
        {/* Front face */}
        <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
          <Text style={styles.categoryEmoji}>💬</Text>
          <Text style={styles.categoryText}>{prompt.category}</Text>
          <Text style={styles.tapHint}>Tap to reveal</Text>
        </Animated.View>

        {/* Back face */}
        <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
          <Text style={styles.categoryLabel}>{prompt.category}</Text>
          <Text style={styles.promptText}>{prompt.prompt}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function LockedCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Locked card. Tap to unlock with premium"
    >
      <View style={[styles.card, styles.lockedCard]}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Premium Only</Text>
        <Text style={styles.lockedSubtitle}>
          Unlock 300+ conversation starters
        </Text>
        <View style={styles.unlockButton}>
          <Text style={styles.unlockButtonText}>Unlock Now</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SwipeableCard({
  prompt,
  onSwipeLeft,
  onSwipeRight,
}: {
  prompt: Prompt;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const translateX = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    setIsFlipped(false);
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    setIsFlipped(false);
    onSwipeRight();
  }, [onSwipeRight]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(handleSwipeLeft)();
          translateX.value = 0;
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(handleSwipeRight)();
          translateX.value = 0;
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(setIsFlipped)(!isFlipped);
  });

  const composed = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])}deg` },
    ],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [1, 0.5]
    ),
  }));

  const flipProgress = useSharedValue(0);

  React.useEffect(() => {
    flipProgress.value = withTiming(isFlipped ? 1 : 0, {
      duration: 400,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isFlipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        {/* Front face */}
        <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
          <Text style={styles.categoryEmoji}>💬</Text>
          <Text style={styles.categoryText}>{prompt.category}</Text>
          <Text style={styles.tapHint}>Tap to reveal</Text>
        </Animated.View>

        {/* Back face */}
        <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
          <Text style={styles.categoryLabel}>{prompt.category}</Text>
          <Text style={styles.promptText}>{prompt.prompt}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ConnectionScreen() {
  const isPremium = useAppStore((s) => s.isPremium);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [deck, setDeck] = useState<Prompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const shuffled = shuffleDeck(prompts as Prompt[]);
      setDeck(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
    }, [])
  );

  const handlePaywall = useCallback(() => {
    navigation.getParent()?.navigate('PaywallModal');
  }, [navigation]);

  const handleSwipeLeft = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, deck.length - 1));
  }, [deck.length]);

  const handleSwipeRight = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (deck.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-charcoal">
        <Text className="text-gray-400 text-base">Loading...</Text>
      </View>
    );
  }

  const currentPrompt = deck[currentIndex];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-charcoal" style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text className="text-white text-2xl font-bold">Connection</Text>
          <Text className="text-gray-400 text-sm mt-1">
            Deepen your bond, one question at a time
          </Text>
        </View>

        {/* Card area */}
        <View style={styles.cardArea}>
          {isPremium ? (
            <>
              <SwipeableCard
                key={`${currentPrompt.id}-${currentIndex}`}
                prompt={currentPrompt}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
              {/* Card counter */}
              <Text style={styles.counter}>
                {currentIndex + 1} / {deck.length}
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                Swipe left/right to navigate · Tap to flip
              </Text>
            </>
          ) : (
            <>
              {/* Free user: single preview card + locked card */}
              <ConversationCard
                prompt={deck[0]}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
              />
              <View style={styles.lockedCardWrapper}>
                <LockedCard onPress={handlePaywall} />
              </View>
            </>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    // Glassmorphism styling
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFront: {
    backgroundColor: 'rgba(255, 127, 80, 0.1)',
    borderColor: 'rgba(255, 127, 80, 0.2)',
  },
  cardBack: {
    backgroundColor: 'rgba(64, 224, 208, 0.08)',
    borderColor: 'rgba(64, 224, 208, 0.15)',
  },
  categoryEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  categoryText: {
    color: '#FF7F50',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  tapHint: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  categoryLabel: {
    color: '#40E0D0',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  promptText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 30,
  },
  lockedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedTitle: {
    color: '#FF7F50',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockedSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  unlockButton: {
    backgroundColor: '#FF7F50',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lockedCardWrapper: {
    marginTop: 20,
    opacity: 0.7,
  },
  counter: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
});
