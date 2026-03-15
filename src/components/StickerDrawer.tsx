import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { DEFAULT_STICKERS, StickerDef } from '../assets/stickers/stickerData';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Tab = 'default' | 'custom';

export interface CustomStickerDef {
  id: string;
  image_url: string;
}

interface StickerDrawerProps {
  visible: boolean;
  onToggle: () => void;
  resolveDrop: (
    pageX: number,
    pageY: number,
  ) => { day: string; xInCell: number; yInCell: number } | null;
  onStickerPlaced: () => void;
}

const DRAWER_HEIGHT = 220;
const STICKER_SIZE = 48;

export default function StickerDrawer({
  visible,
  onToggle,
  resolveDrop,
  onStickerPlaced,
}: StickerDrawerProps) {
  const relationshipId = useAppStore((s) => s.relationshipId);
  const userId = useAppStore((s) => s.user?.id);
  const isPremium = useAppStore((s) => s.isPremium);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeTab, setActiveTab] = useState<Tab>('default');
  const [error, setError] = useState<string | null>(null);
  const [customStickers, setCustomStickers] = useState<CustomStickerDef[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch existing custom stickers
  const fetchCustomStickers = useCallback(async () => {
    if (!relationshipId) return;
    const { data } = await supabase
      .from('custom_stickers')
      .select('id, image_url')
      .eq('relationship_id', relationshipId)
      .order('created_at', { ascending: false });
    if (data) setCustomStickers(data);
  }, [relationshipId]);

  useEffect(() => {
    if (isPremium && visible) fetchCustomStickers();
  }, [isPremium, visible, fetchCustomStickers]);

  const handleTabPress = (tab: Tab) => {
    if (tab === 'custom' && !isPremium) {
      navigation.navigate('PaywallModal');
      return;
    }
    setActiveTab(tab);
  };

  const handleAddCustomSticker = async () => {
    if (!relationshipId || !userId) return;
    setError(null);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      // Crop to square and compress
      const size = Math.min(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      context.crop({
        originX: Math.round((asset.width - size) / 2),
        originY: Math.round((asset.height - size) / 2),
        width: size,
        height: size,
      });
      context.resize({ width: 200, height: 200 });
      const imageRef = await context.renderAsync();
      const cropped = await imageRef.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.7,
      });

      // Generate a unique sticker id
      const stickerId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `${relationshipId}/stickers/${stickerId}.jpg`;

      // Read file as blob for upload
      const response = await fetch(cropped.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('wedo-assets')
        .upload(storagePath, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('wedo-assets')
        .getPublicUrl(storagePath);

      // Persist to custom_stickers table
      const { error: insertError } = await supabase
        .from('custom_stickers')
        .insert({
          id: stickerId,
          relationship_id: relationshipId,
          image_url: urlData.publicUrl,
          created_by: userId,
        });

      if (insertError) throw insertError;

      await fetchCustomStickers();
    } catch (e: any) {
      setError('Failed to upload sticker — please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, !visible && styles.collapsed]}>
      {/* Toggle handle */}
      <Pressable
        onPress={onToggle}
        style={styles.handle}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Close sticker drawer' : 'Open sticker drawer'}
      >
        <View style={styles.handleBar} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {visible && (
        <>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => handleTabPress('default')}
              style={[styles.tab, activeTab === 'default' && styles.activeTab]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'default' }}
            >
              <Text style={[styles.tabText, activeTab === 'default' && styles.activeTabText]}>
                Default
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleTabPress('custom')}
              style={[styles.tab, activeTab === 'custom' && isPremium && styles.activeTab]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'custom' }}
            >
              <Text style={[styles.tabText, activeTab === 'custom' && isPremium && styles.activeTabText]}>
                {isPremium ? 'Custom Photo' : '🔒 Custom Photo'}
              </Text>
            </Pressable>
          </View>

          {activeTab === 'default' ? (
            <FlatList
              data={DEFAULT_STICKERS}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <DraggableSticker
                  sticker={item}
                  relationshipId={relationshipId}
                  userId={userId ?? null}
                  resolveDrop={resolveDrop}
                  onStickerPlaced={onStickerPlaced}
                  onError={setError}
                />
              )}
            />
          ) : (
            <FlatList
              data={customStickers}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <Pressable
                  onPress={handleAddCustomSticker}
                  disabled={uploading}
                  style={[styles.stickerItem, styles.addButton]}
                  accessibilityRole="button"
                  accessibilityLabel="Add custom photo sticker"
                >
                  <Text style={styles.addButtonText}>{uploading ? '...' : '+'}</Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <DraggableCustomSticker
                  sticker={item}
                  relationshipId={relationshipId}
                  userId={userId ?? null}
                  resolveDrop={resolveDrop}
                  onStickerPlaced={onStickerPlaced}
                  onError={setError}
                />
              )}
              ListEmptyComponent={
                !uploading ? (
                  <Text style={styles.emptyText}>Tap + to add a photo sticker</Text>
                ) : null
              }
            />
          )}
        </>
      )}
    </View>
  );
}


/* ── DraggableSticker (default emoji stickers) ───────────────── */

interface DraggableStickerProps {
  sticker: StickerDef;
  relationshipId: string | null;
  userId: string | null;
  resolveDrop: StickerDrawerProps['resolveDrop'];
  onStickerPlaced: () => void;
  onError: (msg: string | null) => void;
}

function DraggableSticker({
  sticker,
  relationshipId,
  userId,
  resolveDrop,
  onStickerPlaced,
  onError,
}: DraggableStickerProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIdx = useSharedValue(0);

  const persistSticker = useCallback(
    async (day: string, x: number, y: number) => {
      if (!relationshipId || !userId) return;
      onError(null);
      const { error: insertError } = await supabase
        .from('calendar_stickers')
        .insert({
          sticker_id: sticker.id,
          day,
          x_coordinate: x,
          y_coordinate: y,
          relationship_id: relationshipId,
          placed_by: userId,
          is_custom: false,
        });
      if (insertError) {
        onError('Failed to place sticker — check your connection.');
      } else {
        onStickerPlaced();
      }
    },
    [relationshipId, userId, sticker.id, onError, onStickerPlaced],
  );

  const handleDrop = useCallback(
    (absX: number, absY: number) => {
      const result = resolveDrop(absX, absY);
      if (result) persistSticker(result.day, result.xInCell, result.yInCell);
    },
    [resolveDrop, persistSticker],
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      zIdx.value = 100;
      scale.value = withSpring(1.3);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIdx.value = 0;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIdx.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.stickerItem, animStyle]}>
        <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

/* ── DraggableCustomSticker (photo-based stickers) ───────────── */

interface DraggableCustomStickerProps {
  sticker: CustomStickerDef;
  relationshipId: string | null;
  userId: string | null;
  resolveDrop: StickerDrawerProps['resolveDrop'];
  onStickerPlaced: () => void;
  onError: (msg: string | null) => void;
}

function DraggableCustomSticker({
  sticker,
  relationshipId,
  userId,
  resolveDrop,
  onStickerPlaced,
  onError,
}: DraggableCustomStickerProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIdx = useSharedValue(0);

  const persistSticker = useCallback(
    async (day: string, x: number, y: number) => {
      if (!relationshipId || !userId) return;
      onError(null);
      const { error: insertError } = await supabase
        .from('calendar_stickers')
        .insert({
          sticker_id: sticker.id,
          day,
          x_coordinate: x,
          y_coordinate: y,
          relationship_id: relationshipId,
          placed_by: userId,
          is_custom: true,
        });
      if (insertError) {
        onError('Failed to place sticker — check your connection.');
      } else {
        onStickerPlaced();
      }
    },
    [relationshipId, userId, sticker.id, onError, onStickerPlaced],
  );

  const handleDrop = useCallback(
    (absX: number, absY: number) => {
      const result = resolveDrop(absX, absY);
      if (result) persistSticker(result.day, result.xInCell, result.yInCell);
    },
    [resolveDrop, persistSticker],
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      zIdx.value = 100;
      scale.value = withSpring(1.3);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      zIdx.value = 0;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIdx.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.stickerItem, animStyle]}>
        <Image
          source={{ uri: sticker.image_url }}
          style={styles.customStickerImage}
        />
      </Animated.View>
    </GestureDetector>
  );
}

/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  collapsed: {
    height: 36,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  activeTab: {
    backgroundColor: 'rgba(255,127,80,0.2)',
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF7F50',
  },
  list: {
    paddingHorizontal: 12,
    gap: 8,
  },
  stickerItem: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: STICKER_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  stickerEmoji: {
    fontSize: 28,
  },
  customStickerImage: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: STICKER_SIZE / 2,
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#FF7F50',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#FF7F50',
    fontSize: 24,
    fontWeight: '300',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  emptyText: {
    color: '#666',
    fontSize: 13,
    alignSelf: 'center',
    marginLeft: 8,
  },
});
