import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

/* ── types ─────────────────────────────────────────────────── */

interface FoodBowlOverlayProps {
  inventoryFood: number;
  groundBounds: { top: number; bottom: number; left: number; right: number };
  onFoodPlaced: (x: number, y: number) => void;
}

/* ── pure helper ───────────────────────────────────────────── */

/**
 * Returns true if the drop coordinate (x, y) is within the given bounds.
 */
export function isDropWithinBounds(
  x: number,
  y: number,
  bounds: { top: number; bottom: number; left: number; right: number },
): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

/* ── constants ─────────────────────────────────────────────── */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = 56;
const ICON_BOTTOM = 100;
const ICON_RIGHT = 20;
// Absolute position of the icon center on screen
const ICON_CENTER_X = SCREEN_WIDTH - ICON_RIGHT - ICON_SIZE / 2;

/* ── component ─────────────────────────────────────────────── */

export default function FoodBowlOverlay({
  inventoryFood,
  groundBounds,
  onFoodPlaced,
}: FoodBowlOverlayProps) {
  const isEmpty = inventoryFood <= 0;

  // Shared values for the draggable sprite position (offset from icon center)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const handleDrop = (absX: number, absY: number) => {
    if (isDropWithinBounds(absX, absY, groundBounds)) {
      onFoodPlaced(absX, absY);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(!isEmpty)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      // Calculate absolute screen position of the drop
      const absX = ICON_CENTER_X + e.translationX;
      const absY = ICON_BOTTOM_Y + e.translationY;

      runOnJS(handleDrop)(absX, absY);

      // Animate back to icon position
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      isDragging.value = false;
    });

  const dragSpriteStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: isDragging.value ? 0.85 : 0,
  }));

  return (
    <GestureHandlerRootView style={styles.container} pointerEvents="box-none">
      {/* Draggable sprite that follows finger */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.iconWrapper}>
          {/* Static icon */}
          <View
            style={[
              styles.iconCircle,
              isEmpty && styles.iconCircleDimmed,
            ]}
          >
            <Text style={[styles.iconEmoji, isEmpty && styles.iconEmojiDimmed]}>
              🍲
            </Text>
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{inventoryFood}</Text>
          </View>

          {/* Draggable ghost sprite */}
          <Animated.View style={[styles.dragSprite, dragSpriteStyle]}>
            <Text style={styles.iconEmoji}>🍲</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

// Absolute Y position of the icon center from the top of the screen
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ICON_BOTTOM_Y = SCREEN_HEIGHT - ICON_BOTTOM - ICON_SIZE / 2;

/* ── styles ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  iconWrapper: {
    position: 'absolute',
    bottom: ICON_BOTTOM,
    right: ICON_RIGHT,
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  iconCircleDimmed: {
    backgroundColor: 'rgba(200,200,200,0.6)',
    opacity: 0.4,
  },
  iconEmoji: {
    fontSize: 28,
  },
  iconEmojiDimmed: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF5252',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dragSprite: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
