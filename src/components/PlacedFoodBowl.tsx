import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

interface PlacedFoodBowlProps {
  x: number;
  y: number;
  visible: boolean;
}

const BOWL_WIDTH = 40;
const BOWL_HEIGHT = 30;

/**
 * Renders an SVG food bowl at the given (x, y) ground coordinates.
 * Returns null when not visible.
 */
export default function PlacedFoodBowl({ x, y, visible }: PlacedFoodBowlProps) {
  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { left: x - BOWL_WIDTH / 2, top: y - BOWL_HEIGHT / 2 },
      ]}
      pointerEvents="none"
    >
      <Svg width={BOWL_WIDTH} height={BOWL_HEIGHT} viewBox="0 0 40 30">
        {/* Food kibbles */}
        <Ellipse cx="14" cy="10" rx="4" ry="3" fill="#FF7043" />
        <Ellipse cx="26" cy="10" rx="4" ry="3" fill="#FFA726" />
        <Ellipse cx="20" cy="8" rx="4" ry="3" fill="#EF5350" />

        {/* Bowl body */}
        <Path
          d="M 4 14 Q 4 28 20 28 Q 36 28 36 14 Z"
          fill="#8D6E63"
        />

        {/* Bowl rim */}
        <Ellipse cx="20" cy="14" rx="18" ry="4" fill="#A1887F" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BOWL_WIDTH,
    height: BOWL_HEIGHT,
  },
});
