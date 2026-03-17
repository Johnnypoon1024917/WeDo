import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'YearInReviewModal'>;

interface PageData {
  key: string;
  emoji: string;
  count: number;
  label: string;
  sublabel: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function YearInReviewModal({ navigation }: Props) {
  const relationshipId = useAppStore((s) => s.relationshipId);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<PageData>>(null);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming((activeIndex + 1) / Math.max(pages.length, 1), {
      duration: 300,
    });
  }, [activeIndex, pages.length, progress]);

  useEffect(() => {
    if (!relationshipId) return;

    const fetchStats = async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const sinceDate = oneYearAgo.toISOString();

      const [memoriesRes, bucketRes, eventsRes] = await Promise.all([
        supabase
          .from('memories')
          .select('id', { count: 'exact', head: true })
          .eq('relationship_id', relationshipId)
          .gte('created_at', sinceDate),
        supabase
          .from('bucket_list_items')
          .select('id', { count: 'exact', head: true })
          .eq('relationship_id', relationshipId)
          .eq('completed', true),
        supabase
          .from('calendar_events')
          .select('id', { count: 'exact', head: true })
          .eq('relationship_id', relationshipId)
          .gte('day', sinceDate.split('T')[0]),
      ]);

      setPages([
        {
          key: 'memories',
          emoji: '📸',
          count: memoriesRes.count ?? 0,
          label: 'Memories Created',
          sublabel: 'moments captured together',
        },
        {
          key: 'bucket',
          emoji: '✅',
          count: bucketRes.count ?? 0,
          label: 'Bucket List Completed',
          sublabel: 'adventures checked off',
        },
        {
          key: 'events',
          emoji: '📅',
          count: eventsRes.count ?? 0,
          label: 'Calendar Events',
          sublabel: 'dates planned this year',
        },
      ]);
      setLoading(false);
    };

    fetchStats();
  }, [relationshipId]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderPage = ({ item }: { item: PageData }) => (
    <View style={styles.page}>
      <Animated.Text
        entering={FadeIn.duration(600)}
        style={styles.emoji}
      >
        {item.emoji}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(200).duration(500)}
        style={styles.count}
      >
        {item.count}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(400).duration(500)}
        style={styles.label}
      >
        {item.label}
      </Animated.Text>
      <Animated.Text
        entering={FadeInUp.delay(600).duration(500)}
        style={styles.sublabel}
      >
        {item.sublabel}
      </Animated.Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {pages.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                i < activeIndex && styles.progressComplete,
                i === activeIndex && styles.progressActive,
              ]}
            />
          </View>
        ))}
      </View>

      {/* Close button */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close year in review"
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF7F50" size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={pages}
          renderItem={renderPage}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 60,
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressComplete: {
    width: '100%',
    backgroundColor: '#FF7F50',
  },
  progressActive: {
    width: '100%',
    backgroundColor: '#FF7F50',
    opacity: 0.7,
  },
  closeButton: {
    position: 'absolute',
    top: 58,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  count: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FF7F50',
    marginBottom: 8,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 16,
    color: '#40E0D0',
    textAlign: 'center',
  },
});
