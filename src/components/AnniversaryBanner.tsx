import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../store/appStore';
import { isWithinAnniversaryWindow } from '../utils/anniversaryUtils';

export default function AnniversaryBanner() {
  const relationshipStartDate = useAppStore((s) => s.relationshipStartDate);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!relationshipStartDate) return null;

  const startDate = new Date(relationshipStartDate);
  if (!isWithinAnniversaryWindow(startDate, new Date())) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('WrappedScreen')}
      accessibilityRole="button"
      accessibilityLabel="View year in review"
    >
      <Animated.View style={[styles.banner, pulseStyle]}>
        <View style={styles.glowBorder} />
        <Text style={styles.emoji}>🎉</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Happy Anniversary!</Text>
          <Text style={styles.subtitle}>Tap to see your year in review</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#FF7F50',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  glowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF7F50',
    opacity: 0.3,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7F50',
  },
  subtitle: {
    fontSize: 13,
    color: '#40E0D0',
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: '#FF7F50',
    marginLeft: 8,
  },
});
