import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { BucketListItem } from '../services/realtimeManager';
import type { RootStackParamList } from '../navigation/RootNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = SCREEN_WIDTH * 0.8;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

const COLORS = [
  '#FF7F50', // Soft Coral
  '#40E0D0', // Teal
  '#9B59B6', // Purple
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#F39C12', // Orange
  '#1ABC9C', // Turquoise
  '#E91E63', // Pink
  '#00BCD4', // Cyan
];

export default function WheelScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const relationshipId = useAppStore((s) => s.relationshipId);

  const [items, setItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BucketListItem | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const rotation = useSharedValue(0);

  // Fetch uncompleted bucket list items
  useEffect(() => {
    if (!relationshipId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('bucket_list_items')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('completed', false)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setItems(data as BucketListItem[]);
      }
      setLoading(false);
    })();
  }, [relationshipId]);

  const segmentAngle = useMemo(
    () => (items.length > 0 ? 360 / items.length : 360),
    [items.length],
  );

  const notifyPartner = useCallback(
    async (itemTitle: string) => {
      const userId = useAppStore.getState().user?.id;
      const partnerIdVal = useAppStore.getState().partnerId;
      const relId = useAppStore.getState().relationshipId;

      if (!userId || !partnerIdVal || !relId) return;

      // Insert a notification record the partner's app can pick up via realtime
      await supabase.from('notifications').insert({
        relationship_id: relId,
        recipient_id: partnerIdVal,
        sender_id: userId,
        type: 'wheel_selection',
        title: 'The wheel has spoken! 🎡',
        body: `Your partner spun the wheel and got: "${itemTitle}"`,
      });
    },
    [],
  );

  const resolveSelection = useCallback(
    (finalAngle: number) => {
      if (items.length === 0) return;

      // Normalize angle to 0-360
      const normalized = ((finalAngle % 360) + 360) % 360;
      const index = Math.floor(normalized / segmentAngle) % items.length;
      const selected = items[index];

      setSelectedItem(selected);
      setIsSpinning(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Notify partner about the wheel selection
      notifyPartner(selected.title);
    },
    [items, segmentAngle, notifyPartner],
  );

  const panGesture = Gesture.Pan()
    .enabled(items.length > 0 && !isSpinning)
    .onEnd((event) => {
      const velocity = -event.velocityY * 0.5;

      if (Math.abs(velocity) < 100) return;

      runOnJS(setIsSpinning)(true);
      runOnJS(setSelectedItem)(null);

      rotation.value = withDecay(
        {
          velocity: velocity,
          deceleration: 0.997,
        },
        (finished) => {
          if (finished) {
            runOnJS(resolveSelection)(rotation.value);
          }
        },
      );
    });

  const animatedWheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleMarkCompleted = useCallback(async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from('bucket_list_items')
      .update({ completed: true })
      .eq('id', selectedItem.id);

    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);
    }
  }, [selectedItem]);

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Indecision Wheel</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎡</Text>
          <Text style={styles.emptyText}>
            Add some ideas to your Bucket List first!
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Indecision Wheel</Text>
        <View style={styles.backButton} />
      </View>

      {/* Pointer */}
      <View style={styles.pointerContainer}>
        <Text style={styles.pointer}>▼</Text>
      </View>

      {/* Wheel */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.wheel, animatedWheelStyle]}>
          {items.map((item, index) => {
            const angle = index * segmentAngle;
            const color = COLORS[index % COLORS.length];

            return (
              <View
                key={item.id}
                style={[
                  styles.segment,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -WHEEL_RADIUS * 0.4 },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.segmentLabel,
                    { backgroundColor: color },
                  ]}
                >
                  <Text style={styles.segmentText} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Segment divider lines */}
          {items.map((item, index) => {
            const angle = index * segmentAngle;
            return (
              <View
                key={`line-${item.id}`}
                style={[
                  styles.dividerLine,
                  {
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>

      {/* Spin hint */}
      {!isSpinning && !selectedItem && (
        <Text style={styles.hintText}>Swipe up or down to spin!</Text>
      )}

      {/* Selected item display */}
      {selectedItem && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>You got:</Text>
          <Text style={styles.resultTitle}>{selectedItem.title}</Text>
          <Pressable style={styles.completeButton} onPress={handleMarkCompleted}>
            <Text style={styles.completeButtonText}>Mark as Completed ✓</Text>
          </Pressable>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pointerContainer: {
    marginTop: 8,
    zIndex: 10,
  },
  pointer: {
    fontSize: 28,
    color: '#FF7F50',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    backgroundColor: '#1E1E1E',
    borderWidth: 3,
    borderColor: '#40E0D0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 4,
  },
  segment: {
    position: 'absolute',
    alignItems: 'center',
    width: WHEEL_SIZE * 0.4,
  },
  segmentLabel: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: WHEEL_SIZE * 0.38,
  },
  segmentText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerLine: {
    position: 'absolute',
    width: 1,
    height: WHEEL_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.15)',
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  hintText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 24,
  },
  resultContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  resultLabel: {
    color: '#40E0D0',
    fontSize: 16,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  completeButton: {
    backgroundColor: '#FF7F50',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 26,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
