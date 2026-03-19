import { useCallback, useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

// --- Interfaces ---

export interface GroundBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// --- Pure functions (exported for testing) ---

/**
 * Generate a random roam destination within bounds.
 * X: 10%-90% of width range, Y: 60%-100% of height range.
 */
export function generateRoamDestination(bounds: GroundBounds): { x: number; y: number } {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const x = bounds.left + width * (0.1 + Math.random() * 0.8);
  const y = bounds.top + height * (0.6 + Math.random() * 0.4);
  return { x, y };
}

/**
 * Clamp arbitrary coordinates to valid ground area.
 */
export function clampToGroundBounds(
  x: number,
  y: number,
  bounds: GroundBounds,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, bounds.left), bounds.right),
    y: Math.min(Math.max(y, bounds.top), bounds.bottom),
  };
}

/**
 * Compute walk duration in [3000, 7000] ms based on distance.
 * Uses linear interpolation: short distance → 3000ms, max distance → 7000ms.
 */
export function computeWalkDuration(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  // Max possible distance is the diagonal of a large screen (~2000px).
  // We use a generous max so short walks are fast and long walks are slow.
  const maxDistance = 1500;
  const t = Math.min(distance / maxDistance, 1);
  return 3000 + t * 4000;
}

/**
 * Generate a random pause duration in [2000, 5000] ms.
 */
export function generatePauseDuration(): number {
  return 2000 + Math.random() * 3000;
}

/**
 * Get facing direction based on travel direction.
 */
export function getFacingDirection(
  currentX: number,
  destX: number,
): 'left' | 'right' {
  return destX > currentX ? 'right' : 'left';
}

// --- Hook ---

export function useRoamingEngine(
  groundBounds: GroundBounds,
  enabled: boolean,
): {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  setAttractTarget: (pos: { x: number; y: number } | null) => void;
  facingDirection: SharedValue<string>;
} {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const facingDirection = useSharedValue<string>('right');

  const attractTargetRef = useRef<{ x: number; y: number } | null>(null);
  const isRoamingRef = useRef(false);
  const cancelledRef = useRef(false);

  const hasValidBounds = useCallback((b: GroundBounds) => {
    return b.right > b.left && b.bottom > b.top;
  }, []);

  const startRoamLoop = useCallback(() => {
    if (!enabled || !hasValidBounds(groundBounds)) {
      isRoamingRef.current = false;
      return;
    }

    isRoamingRef.current = true;
    cancelledRef.current = false;

    const scheduleNext = () => {
      if (cancelledRef.current || !enabled) {
        isRoamingRef.current = false;
        return;
      }

      // If there's an attract target, move to it instead
      if (attractTargetRef.current) {
        const target = attractTargetRef.current;
        const clamped = clampToGroundBounds(target.x, target.y, groundBounds);
        const dir = getFacingDirection(translateX.value, clamped.x);
        facingDirection.value = dir;

        translateX.value = withTiming(clamped.x, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        });
        translateY.value = withTiming(
          clamped.y,
          {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          },
          (finished) => {
            if (finished) {
              // Stay at attract target until cleared
              // Don't schedule next — wait for setAttractTarget(null)
            }
          },
        );
        return;
      }

      // Normal roaming: pick destination → walk → pause → repeat
      const dest = generateRoamDestination(groundBounds);
      const dir = getFacingDirection(translateX.value, dest.x);
      facingDirection.value = dir;

      const duration = computeWalkDuration(
        { x: translateX.value, y: translateY.value },
        dest,
      );

      translateX.value = withTiming(dest.x, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });
      translateY.value = withTiming(
        dest.y,
        {
          duration,
          easing: Easing.inOut(Easing.ease),
        },
        (finished) => {
          if (finished && !cancelledRef.current) {
            const pauseDuration = generatePauseDuration();
            // Use withDelay on a no-op timing to schedule the next step
            translateX.value = withDelay(
              pauseDuration,
              withTiming(translateX.value, { duration: 0 }, (pauseFinished) => {
                if (pauseFinished) {
                  runOnJS(scheduleNext)();
                }
              }),
            );
          }
        },
      );
    };

    scheduleNext();
  }, [enabled, groundBounds, translateX, translateY, facingDirection, hasValidBounds]);

  const setAttractTarget = useCallback(
    (pos: { x: number; y: number } | null) => {
      attractTargetRef.current = pos;

      if (pos) {
        // Interrupt current roaming and move to target
        cancelledRef.current = true;
        const clamped = clampToGroundBounds(pos.x, pos.y, groundBounds);
        const dir = getFacingDirection(translateX.value, clamped.x);
        facingDirection.value = dir;

        translateX.value = withTiming(clamped.x, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        });
        translateY.value = withTiming(clamped.y, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        });
      } else {
        // Resume normal roaming
        cancelledRef.current = false;
        if (!isRoamingRef.current) {
          startRoamLoop();
        } else {
          // Trigger next step in the loop
          cancelledRef.current = false;
          startRoamLoop();
        }
      }
    },
    [groundBounds, translateX, translateY, facingDirection, startRoamLoop],
  );

  // Start roaming when enabled and bounds are valid
  useEffect(() => {
    if (enabled && hasValidBounds(groundBounds) && !isRoamingRef.current) {
      // Set initial position within bounds
      const initial = generateRoamDestination(groundBounds);
      translateX.value = initial.x;
      translateY.value = initial.y;
      startRoamLoop();
    }

    return () => {
      cancelledRef.current = true;
      isRoamingRef.current = false;
    };
  }, [enabled, groundBounds, translateX, translateY, startRoamLoop, hasValidBounds]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return {
    animatedStyle,
    setAttractTarget,
    facingDirection,
  };
}
