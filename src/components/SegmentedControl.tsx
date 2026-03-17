import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const SEGMENTS = ['List', 'Map'] as const;
const INDICATOR_PADDING = 3;

interface SegmentedControlProps {
  selectedIndex: number;
  onChange: (index: number) => void;
}

export default function SegmentedControl({
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const translateX = useSharedValue(0);

  const segmentWidth = containerWidth > 0
    ? (containerWidth - INDICATOR_PADDING * 2) / SEGMENTS.length
    : 0;

  React.useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withTiming(selectedIndex * segmentWidth, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [selectedIndex, segmentWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth,
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {SEGMENTS.map((label, index) => (
        <Pressable
          key={label}
          style={styles.segment}
          onPress={() => onChange(index)}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedIndex === index }}
          accessibilityLabel={`${label} view`}
        >
          <Text
            style={[
              styles.label,
              selectedIndex === index && styles.labelActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: INDICATOR_PADDING,
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_PADDING,
    left: INDICATOR_PADDING,
    bottom: INDICATOR_PADDING,
    backgroundColor: '#FF7F50',
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  labelActive: {
    color: '#121212',
    fontWeight: '700',
  },
});
