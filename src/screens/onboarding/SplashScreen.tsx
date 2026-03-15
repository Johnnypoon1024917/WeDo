import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type SplashNav = NativeStackNavigationProp<OnboardingStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashNav>();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const subtitleOpacity = useSharedValue(0);

  const navigateToAuth = () => {
    navigation.replace('Auth');
  };

  useEffect(() => {
    // Fade in + scale up the logo
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) });

    // Fade in subtitle after logo
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // After animation completes, navigate to Auth
    opacity.value = withSequence(
      withTiming(1, { duration: 600 }),
      withDelay(1200, withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(navigateToAuth)();
        }
      })),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center bg-charcoal">
      <Animated.View style={logoStyle} className="items-center">
        <Text className="text-soft-coral text-5xl font-bold" style={{ fontFamily: 'serif' }}>
          WeDo
        </Text>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text className="text-teal mt-3 text-lg tracking-widest">
          The Adventure Log
        </Text>
      </Animated.View>
    </View>
  );
}
