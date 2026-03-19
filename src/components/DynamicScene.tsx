import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeOfDay = 'day' | 'sunset' | 'night';
type SceneName = 'warmHome' | 'zenGarden';

interface SceneConfig {
  day: readonly [string, string];
  sunset: readonly [string, string];
  night: readonly [string, string];
  floor: string;
}

const SCENES: Record<SceneName, SceneConfig> = {
  warmHome: {
    day: ['#FFEDD5', '#FDBA74'],
    sunset: ['#FDBA74', '#EA580C'],
    night: ['#1E1B4B', '#0F172A'],
    floor: '#8B4513',
  },
  zenGarden: {
    day: ['#D1FAE5', '#34D399'],
    sunset: ['#FDE68A', '#059669'],
    night: ['#064E3B', '#022C22'],
    floor: '#4ADE80',
  },
};

interface DynamicSceneProps {
  scene?: SceneName;
  children: React.ReactNode;
}

export default function DynamicScene({
  scene = 'warmHome',
  children,
}: DynamicSceneProps) {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 17) setTimeOfDay('day');
    else if (hour >= 17 && hour < 20) setTimeOfDay('sunset');
    else setTimeOfDay('night');
  }, []);

  const activeColors = SCENES[scene][timeOfDay];

  return (
    <View style={styles.sceneContainer}>
      <LinearGradient
        colors={activeColors}
        style={StyleSheet.absoluteFillObject}
      />

      <View
        style={[styles.floor, { backgroundColor: SCENES[scene].floor }]}
      />

      {children}

      {timeOfDay === 'night' && <View style={styles.nightOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    width: SCREEN_WIDTH - 32,
    height: 280,
    marginHorizontal: 16,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 40,
    borderTopWidth: 4,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  nightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,10,0.4)',
    pointerEvents: 'none',
  },
});
