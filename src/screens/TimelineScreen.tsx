import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Heart, Trash2, Mic } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { realtimeManager, MemoryEntry } from '../services/realtimeManager';
import ScratchOffOverlay from '../components/ScratchOffOverlay';
import AudioPlayer from '../components/AudioPlayer';
import AudioRecorder from '../components/AudioRecorder';
import AnniversaryBanner from '../components/AnniversaryBanner';
import RelationshipPet from '../components/RelationshipPet';
import SkeletonCard from '../components/SkeletonCard';
import { loadAndDecayPet, feedPet } from '../services/petService';
import type { RootStackParamList } from '../navigation/RootNavigator';

/* ── helpers ─────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Group key for date headers (YYYY-MM-DD). */
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Extract the storage path from a Supabase public URL. */
function extractStoragePath(publicUrl: string): string | null {
  const marker = '/object/public/wedo-assets/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/* ── MemoryCard ──────────────────────────────────────────────── */

export function generateTilt(): number {
  return (Math.random() * 6) - 3;
}

export function triggerHeartAnimation(
  heartScale: { value: number },
  heartOpacity: { value: number }
) {
  heartScale.value = 0;
  heartOpacity.value = 1;
  heartScale.value = withSpring(1.5, { damping: 6, stiffness: 120 });
  heartOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
}

function MemoryCard({ item, onDelete }: { item: MemoryEntry; onDelete: (id: string) => void }) {
  const tilt = useMemo(() => generateTilt(), []);
  const { t } = useTranslation();
  const currentUserId = useAppStore((s) => s.user?.id);
  const isPremium = useAppStore((s) => s.isPremium);
  const relationshipId = useAppStore((s) => s.relationshipId);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isCreator = item.created_by === currentUserId;
  const showOverlay = !item.revealed && !isCreator;

  const [photoLayout, setPhotoLayout] = useState({ width: 0, height: 0 });
  const [showRecorder, setShowRecorder] = useState(false);

  const onPhotoLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPhotoLayout({ width, height });
  }, []);

  const hasAudio = !!item.audio_url;
  // Show mic icon on revealed entries that don't already have audio
  const showMicIcon = item.revealed && !hasAudio && !showRecorder;

  const handleMicPress = useCallback(() => {
    if (!isPremium) {
      navigation.navigate('PaywallModal');
      return;
    }
    setShowRecorder(true);
  }, [isPremium, navigation]);

  const handleAudioAttached = useCallback(() => {
    setShowRecorder(false);
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('timeline.deleteMemory'),
      t('timeline.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete photo from storage
              const photoPath = extractStoragePath(item.photo_url);
              if (!photoPath) {
                Alert.alert(t('common.error'), t('timeline.deleteError'));
                return;
              }
              const { error: photoError } = await supabase.storage.from('wedo-assets').remove([photoPath]);
              if (photoError) {
                Alert.alert(t('common.error'), t('timeline.deleteError'));
                return;
              }

              // Delete audio from storage if it exists
              if (item.audio_url) {
                const audioPath = extractStoragePath(item.audio_url);
                if (!audioPath) {
                  Alert.alert(t('common.error'), t('timeline.deleteError'));
                  return;
                }
                const { error: audioError } = await supabase.storage.from('wedo-assets').remove([audioPath]);
                if (audioError) {
                  Alert.alert(t('common.error'), t('timeline.deleteError'));
                  return;
                }
              }

              // Delete the memory record
              await supabase.from('memories').delete().eq('id', item.id);

              // Update local state
              onDelete(item.id);
            } catch {
              Alert.alert(t('common.error'), t('timeline.deleteError'));
            }
          },
        },
      ],
    );
  }, [item, onDelete, t]);

  // Heart animation shared values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const handleDoubleTap = useCallback(() => {
    triggerHeartAnimation(heartScale, heartOpacity);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Upsert like to Supabase
    supabase.from('memory_likes').upsert({
      memory_id: item.id,
      user_id: currentUserId,
    });
    // Feed the pet on double-tap heart
    if (relationshipId) {
      feedPet(relationshipId, 5, 5).catch(() => {});
    }
  }, [item.id, currentUserId, heartScale, heartOpacity, relationshipId]);

  const handleSingleTap = useCallback(() => {
    navigation.navigate('MemoryDetailScreen', { memory: item });
  }, [navigation, item]);

  // Gesture composition
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(handleSingleTap)();
    });

  const composedGesture = Gesture.Exclusive(doubleTap, singleTap);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15).stiffness(120)}
      layout={LinearTransition.springify()}
      style={[styles.cardWrapper, { transform: [{ rotate: `${tilt}deg` }] }]}
    >
      <View style={styles.card}>
        <GestureDetector gesture={composedGesture}>
          <View style={styles.photoContainer}>
            <Animated.Image
              source={{ uri: item.photo_url }}
              style={styles.photo}
              onLayout={onPhotoLayout}
              // @ts-expect-error sharedTransitionTag not in reanimated types yet
              sharedTransitionTag={`memory-photo-${item.id}`}
            />
            <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]} pointerEvents="none">
              <Heart size={80} color="#E74C3C" fill="#E74C3C" />
            </Animated.View>
            {isCreator && (
              <Pressable
                onPress={handleDelete}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={t('timeline.deleteMemory')}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </Pressable>
            )}
            {showOverlay && photoLayout.width > 0 && (
              <GestureHandlerRootView style={StyleSheet.absoluteFill}>
                <ScratchOffOverlay
                  memoryId={item.id}
                  width={photoLayout.width}
                  height={photoLayout.height}
                />
              </GestureHandlerRootView>
            )}
          </View>
        </GestureDetector>
        <View style={styles.cardBody}>
          <Text style={styles.caption}>{item.caption}</Text>
          <View style={styles.cardFooter}>
            <Heart size={14} color="#E74C3C" fill="#E74C3C" />
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            {showMicIcon && (
              <Pressable
                onPress={handleMicPress}
                style={styles.micButton}
                accessibilityRole="button"
                accessibilityLabel={t('timeline.addVoiceNote')}
              >
                <Mic size={16} color="#FF7F50" />
              </Pressable>
            )}
          </View>
          {hasAudio && <AudioPlayer audioUrl={item.audio_url!} />}
          {showRecorder && relationshipId && (
            <AudioRecorder
              memoryId={item.id}
              relationshipId={relationshipId}
              onAudioAttached={handleAudioAttached}
              onCancel={() => setShowRecorder(false)}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/* ── DateHeader ──────────────────────────────────────────────── */

function DateHeader({ date }: { date: string }) {
  return (
    <Text style={styles.dateHeader}>{formatDate(date)}</Text>
  );
}

/* ── EmptyState ──────────────────────────────────────────────── */

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📸</Text>
      <Text style={styles.emptyText}>
        {t('timeline.noAdventures')}
      </Text>
    </View>
  );
}

/* ── Row type for FlatList (header or memory) ────────────────── */

type Row =
  | { type: 'header'; date: string; key: string }
  | { type: 'memory'; data: MemoryEntry; key: string };

function buildRows(memories: MemoryEntry[]): Row[] {
  const rows: Row[] = [];
  let lastDate = '';
  for (const m of memories) {
    const dk = dateKey(m.created_at);
    if (dk !== lastDate) {
      rows.push({ type: 'header', date: m.created_at, key: `h-${dk}` });
      lastDate = dk;
    }
    rows.push({ type: 'memory', data: m, key: m.id });
  }
  return rows;
}

/* ── TimelineScreen ──────────────────────────────────────────── */

export default function TimelineScreen() {
  const { t } = useTranslation();
  const relationshipId = useAppStore((s) => s.relationshipId);
  const petName = useAppStore((s) => s.petName);
  const petHealth = useAppStore((s) => s.petHealth);
  const petTotalXp = useAppStore((s) => s.petTotalXp);
  const petLastFedAt = useAppStore((s) => s.petLastFedAt);
  const setPetState = useAppStore((s) => s.setPetState);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const memoriesRef = useRef<MemoryEntry[]>([]);

  // Keep ref in sync for realtime callbacks
  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);

  /* ── load & decay pet ── */
  useEffect(() => {
    if (!relationshipId) return;
    loadAndDecayPet(relationshipId)
      .then((petState) => setPetState(petState))
      .catch(() => {
        // Silently ignore — pet UI simply won't render
      });
  }, [relationshipId, setPetState]);

  /* ── initial fetch ── */
  useEffect(() => {
    if (!relationshipId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMemories(data as MemoryEntry[]);
      }
      setLoading(false);
    })();
  }, [relationshipId]);

  /* ── realtime subscription ── */
  useEffect(() => {
    if (!relationshipId) return;

    const channel = realtimeManager.subscribeToMemories(
      relationshipId,
      // onInsert
      (entry) => {
        setMemories((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === entry.id)) return prev;
          // Insert in reverse-chronological order (newest first)
          const next = [entry, ...prev];
          next.sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          return next;
        });
      },
      // onUpdate
      (entry) => {
        setMemories((prev) =>
          prev.map((m) => (m.id === entry.id ? entry : m)),
        );
      },
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  /* ── render ── */
  const rows = buildRows(memories);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const renderItem = useCallback(({ item }: { item: Row }) => {
    if (item.type === 'header') {
      return <DateHeader date={item.date} />;
    }
    return <MemoryCard item={item.data} onDelete={handleDeleteMemory} />;
  }, [handleDeleteMemory]);

  const keyExtractor = useCallback((item: Row) => item.key, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContent}>
          <SkeletonCard shape="card" />
          <View style={{ height: 16 }} />
          <SkeletonCard shape="card" />
          <View style={{ height: 16 }} />
          <SkeletonCard shape="card" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          rows.length === 0 ? styles.emptyList : styles.listContent
        }
        ListHeaderComponent={
          <>
            {petName != null && petLastFedAt != null && (
              <RelationshipPet
                petState={{
                  petName,
                  petHealth,
                  petTotalXp,
                  petLastFedAt,
                }}
              />
            )}
            <AnniversaryBanner />
          </>
        }
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  /* date header */
  dateHeader: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    color: '#4A4A4A',
    marginTop: 20,
    marginBottom: 8,
  },

  /* card */
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    padding: 12,
    paddingBottom: 24,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 2,
  },
  photoContainer: {
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  cardBody: {
    padding: 14,
  },
  caption: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#2C2C2C',
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timestamp: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#8B8B8B',
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,127,80,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* empty state */
  emptyContainer: {
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
  },

});
