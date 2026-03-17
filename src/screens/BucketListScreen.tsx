import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import {
  realtimeManager,
  BucketListItem,
} from '../services/realtimeManager';
import MemoryCreationModal from '../components/MemoryCreationModal';
import SegmentedControl from '../components/SegmentedControl';
import BucketListMapView from '../components/BucketListMapView';
import PinPreviewModal from '../components/PinPreviewModal';
import SkeletonCard from '../components/SkeletonCard';
import LottieOverlay from '../components/LottieOverlay';
import type { RootStackParamList } from '../navigation/RootNavigator';

const FREE_ITEM_LIMIT = 10;

/* ── BucketListRow ───────────────────────────────────────────── */

function BucketListRow({
  item,
  onToggleComplete,
  onDelete,
}: {
  item: BucketListItem;
  onToggleComplete: (item: BucketListItem) => void;
  onDelete: (item: BucketListItem) => void;
}) {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15).stiffness(120)}
      style={styles.cardWrapper}
    >
      <BlurView intensity={40} tint="dark" style={styles.card}>
        <Pressable
          style={styles.checkbox}
          onPress={() => onToggleComplete(item)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={t('bucketList.markItem', { title: item.title, state: item.completed ? t('bucketList.incomplete') : t('bucketList.complete') })}
        >
          <Text style={styles.checkboxIcon}>
            {item.completed ? '✅' : '⬜'}
          </Text>
        </Pressable>

        <View style={styles.rowContent}>
          <Text
            style={[
              styles.itemTitle,
              item.completed && styles.itemTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.url ? (
            <Text style={styles.itemUrl} numberOfLines={1}>
              🔗 {item.url}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={t('bucketList.deleteItem', { title: item.title })}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

/* ── EmptyState ──────────────────────────────────────────────── */

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📝</Text>
      <Text style={styles.emptyText}>
        {t('bucketList.noBucketItems')}
      </Text>
    </View>
  );
}

/* ── BucketListScreen ────────────────────────────────────────── */

export default function BucketListScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const relationshipId = useAppStore((s) => s.relationshipId);
  const isPremium = useAppStore((s) => s.isPremium);

  const [items, setItems] = useState<BucketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoryModalVisible, setMemoryModalVisible] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [previewItem, setPreviewItem] = useState<BucketListItem | null>(null);
  const [showLottie, setShowLottie] = useState(false);

  /* ── initial fetch ── */
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
        .order('created_at', { ascending: true });

      if (!error && data) {
        setItems(data as BucketListItem[]);
      }
      setLoading(false);
    })();
  }, [relationshipId]);

  /* ── realtime subscription ── */
  useEffect(() => {
    if (!relationshipId) return;

    const channel = realtimeManager.subscribeToBucketList(
      relationshipId,
      // onInsert
      (item) => {
        setItems((prev) => {
          if (prev.some((i) => i.id === item.id)) return prev;
          const next = [...prev, item];
          next.sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
          return next;
        });
      },
      // onUpdate
      (item) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? item : i)),
        );
      },
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  /* ── add item handler ── */
  const handleAddPress = useCallback(() => {
    if (!isPremium && items.length >= FREE_ITEM_LIMIT) {
      navigation.navigate('PaywallModal');
      return;
    }
    navigation.navigate('AddToListModal');
  }, [isPremium, items.length, navigation]);

  /* ── toggle completion ── */
  const handleToggleComplete = useCallback(
    async (item: BucketListItem) => {
      const newCompleted = !item.completed;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, completed: newCompleted } : i,
        ),
      );

      const { error } = await supabase
        .from('bucket_list_items')
        .update({ completed: newCompleted })
        .eq('id', item.id);

      if (error) {
        // Revert on failure
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, completed: !newCompleted } : i,
          ),
        );
        return;
      }

      // On marking complete, trigger memory creation modal
      if (newCompleted) {
        setShowLottie(true);
        setMemoryModalVisible(true);
      }
    },
    [],
  );

  /* ── delete item ── */
  const handleDeleteItem = useCallback(
    async (item: BucketListItem) => {
      const { error } = await supabase
        .from('bucket_list_items')
        .delete()
        .eq('id', item.id);

      if (!error) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    },
    [],
  );

  /* ── render ── */
  const renderItem = useCallback(
    ({ item }: { item: BucketListItem }) => (
      <BucketListRow
        item={item}
        onToggleComplete={handleToggleComplete}
        onDelete={handleDeleteItem}
      />
    ),
    [handleToggleComplete, handleDeleteItem],
  );

  const keyExtractor = useCallback((item: BucketListItem) => item.id, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingHorizontal: 16, paddingTop: 56 }}>
          <SkeletonCard shape="row" />
          <View style={{ height: 12 }} />
          <SkeletonCard shape="row" />
          <View style={{ height: 12 }} />
          <SkeletonCard shape="row" />
          <View style={{ height: 12 }} />
          <SkeletonCard shape="row" />
          <View style={{ height: 12 }} />
          <SkeletonCard shape="row" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bucketList.bucketList')}</Text>
        <Pressable
          onPress={() => {
            navigation.navigate('WheelScreen');
          }}
          style={styles.wheelButton}
          accessibilityRole="button"
          accessibilityLabel={t('bucketList.openWheel')}
        >
          <Text style={styles.wheelIcon}>🎡</Text>
        </Pressable>
      </View>

      {/* Segmented Control */}
      <SegmentedControl
        selectedIndex={selectedSegment}
        onChange={setSelectedSegment}
      />

      {/* Item count for free users */}
      {!isPremium && (
        <Text style={styles.itemCount}>
          {t('bucketList.itemCount', { count: items.length, limit: FREE_ITEM_LIMIT })}
        </Text>
      )}

      {selectedSegment === 0 ? (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <BucketListMapView
          items={items}
          onPinPress={setPreviewItem}
        />
      )}

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={handleAddPress}
        accessibilityRole="button"
        accessibilityLabel={t('bucketList.addItem')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      {/* Memory Creation Modal */}
      <MemoryCreationModal
        visible={memoryModalVisible}
        onClose={() => setMemoryModalVisible(false)}
      />

      {/* Pin Preview Modal */}
      <PinPreviewModal
        item={previewItem}
        onDismiss={() => setPreviewItem(null)}
      />

      {/* Lottie celebration overlay */}
      <LottieOverlay
        visible={showLottie}
        onFinish={() => setShowLottie(false)}
      />
    </View>
  );
}

/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  wheelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(64, 224, 208, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelIcon: {
    fontSize: 22,
  },
  itemCount: {
    color: '#9CA3AF',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  /* card */
  cardWrapper: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxIcon: {
    fontSize: 22,
  },
  rowContent: {
    flex: 1,
  },
  deleteButton: {
    marginLeft: 12,
    padding: 6,
  },
  deleteIcon: {
    fontSize: 18,
  },
  itemTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemUrl: {
    fontSize: 13,
    color: '#40E0D0',
    marginTop: 4,
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
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7F50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 30,
  },

});
