import React from 'react';
import { StyleSheet, Dimensions, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTimeOfDay, getTimeOfDay, type TimeOfDay } from '../hooks/useTimeOfDay';

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

const SKY_PALETTES: Record<TimeOfDay, { colors: GradientColors }> = {
  dawn:    { colors: ['#FFDAB9', '#FFE4B5', '#FFF8DC'] },
  day:     { colors: ['#87CEEB', '#B0E0E6', '#F0F8FF'] },
  sunset:  { colors: ['#FF8C00', '#FF6347', '#8B008B'] },
  night:   { colors: ['#0D1B2A', '#1B2838', '#2C1654'] },
};

const GROUND_COLORS: Record<TimeOfDay, string> = {
  dawn:    '#7CB342',
  day:     '#4CAF50',
  sunset:  '#6B8E23',
  night:   '#2E4A2E',
};

/**
 * Returns the sky gradient colors for a given hour (0–23).
 */
export function getGradientColorsForHour(hour: number): string[] {
  const period = getTimeOfDay(hour);
  return [...SKY_PALETTES[period].colors] as string[];
}

/**
 * Generates the SVG path string for the ground area.
 * The ground occupies the bottom 40% of the screen with a soft curved top edge.
 */
export function generateGroundPath(width: number, height: number): string {
  const groundTop = height * 0.6;
  const controlY = groundTop - height * 0.03;

  return [
    `M 0 ${groundTop}`,
    `Q ${width * 0.5} ${controlY} ${width} ${groundTop}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');
}

export default function GardenBackground() {
  const timeOfDay = useTimeOfDay();
  const { width, height } = Dimensions.get('window');

  const skyColors = SKY_PALETTES[timeOfDay].colors;
  const groundColor = GROUND_COLORS[timeOfDay];
  const groundPath = generateGroundPath(width, height);

  return (
    <>
      <LinearGradient
        colors={skyColors}
        style={StyleSheet.absoluteFillObject}
      />
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFillObject}
      >
        <Path d={groundPath} fill={groundColor} />
      </Svg>
    </>
  );
}
