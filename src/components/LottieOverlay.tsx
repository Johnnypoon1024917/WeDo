import React from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieOverlayProps {
  visible: boolean;
  onFinish: () => void;
}

// TODO: Add the actual neon checkmark + confetti animation JSON file at this path
const ANIMATION_SOURCE = require('../../assets/animations/checkmark-confetti.json');

export default function LottieOverlay({ visible, onFinish }: LottieOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <LottieView
        source={ANIMATION_SOURCE}
        autoPlay
        loop={false}
        onAnimationFinish={onFinish}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});
