import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { calculateProgress } from '../utils/wrappedUtils';
import MeshGradient from '../components/MeshGradient';
import SummaryExportCard from '../components/SummaryExportCard';

type Props = NativeStackScreenProps<RootStackParamList, 'WrappedScreen'>;

const TOTAL_CARDS = 4;

/* ── Inline card components ─────────────────────────────────── */

function IntroCard() {
  return (
    <View style={styles.page}>
      <MeshGradient />
      <Animated.Text entering={FadeIn.duration(800)} style={styles.introEmoji}>
        💕
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(300).duration(600)} style={styles.introTitle}>
        Your Year Together
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(600).duration(600)} style={styles.introSubtitle}>
        Swipe to relive your highlights
      </Animated.Text>
    </View>
  );
}

function MemoryCountCard({ count }: { count: number }) {
  return (
    <View style={styles.page}>
      <MeshGradient />
      <Animated.Text entering={FadeIn.duration(600)} style={styles.cardEmoji}>
        📸
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(200).duration(500)} style={styles.cardCount}>
        {count}
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(400).duration(500)} style={styles.cardLabel}>
        Memories Created
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(600).duration(500)} style={styles.cardSublabel}>
        moments captured together
      </Animated.Text>
    </View>
  );
}

function AdventureCountCard({ count }: { count: number }) {
  return (
    <View style={styles.page}>
      <MeshGradient />
      <Animated.Text entering={FadeIn.duration(600)} style={styles.cardEmoji}>
        ✅
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(200).duration(500)} style={styles.cardCount}>
        {count}
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(400).duration(500)} style={styles.cardLabel}>
        Adventures Completed
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(600).duration(500)} style={styles.cardSublabel}>
        bucket list items checked off
      </Animated.Text>
    </View>
  );
}

/* ── Main screen ────────────────────────────────────────────── */

export default function WrappedScreen({ navigation }: Props) {
  const relationshipId = useAppStore((s) => s.relationshipId);
  const [loading, setLoading] = useState(true);
  const [memoryCount, setMemoryCount] = useState(0);
  const [adventureCount, setAdventureCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const viewShotRef = useRef<ViewShot>(null);

  const progress = calculateProgress(activeIndex, TOTAL_CARDS);

  /* ── Fetch stats ──────────────────────────────────────────── */

  useEffect(() => {
    if (!relationshipId) return;

    const fetchStats = async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const sinceDate = oneYearAgo.toISOString();

      const [memoriesRes, bucketRes] = await Promise.all([
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
      ]);

      setMemoryCount(memoriesRes.count ?? 0);
      setAdventureCount(bucketRes.count ?? 0);
      setLoading(false);
    };

    fetchStats();
  }, [relationshipId]);

  /* ── Share flow ────────────────────────────────────────────── */

  const handleShare = async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert('Error', "Couldn't capture image. Please try again.");
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Unavailable', 'Sharing is not supported on this device.');
        return;
      }

      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
    } catch {
      Alert.alert('Error', "Couldn't capture image. Please try again.");
    }
  };

  /* ── Progress segments ────────────────────────────────────── */

  const renderProgressBar = () => (
    <View
      style={styles.progressContainer}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 1, now: progress }}
    >
      {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
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
  );

  /* ── Render ───────────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF7F50" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderProgressBar()}

      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close wrapped"
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <PagerView
        style={styles.pager}
        initialPage={0}
        scrollEnabled
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
      >
        <View key="intro" style={styles.pageWrapper}>
          <IntroCard />
        </View>
        <View key="memories" style={styles.pageWrapper}>
          <MemoryCountCard count={memoryCount} />
        </View>
        <View key="adventures" style={styles.pageWrapper}>
          <AdventureCountCard count={adventureCount} />
        </View>
        <View key="summary" style={styles.pageWrapper}>
          <SummaryExportCard
            ref={viewShotRef}
            memoryCount={memoryCount}
            adventureCount={adventureCount}
            onShare={handleShare}
          />
        </View>
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 60,
    gap: 4,
    zIndex: 10,
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
  pager: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  introEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  introSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#40E0D0',
    textAlign: 'center',
  },
  cardEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  cardCount: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FF7F50',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSublabel: {
    fontSize: 16,
    color: '#40E0D0',
    textAlign: 'center',
  },
});
