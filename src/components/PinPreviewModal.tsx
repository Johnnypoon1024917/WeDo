import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BucketListItem } from '../services/realtimeManager';

interface PinPreviewModalProps {
  item: BucketListItem | null;
  onDismiss: () => void;
}

export default function PinPreviewModal({
  item,
  onDismiss,
}: PinPreviewModalProps) {
  if (!item) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss pin preview"
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {item.place_name ? (
            <Text style={styles.placeName} numberOfLines={1}>
              📍 {item.place_name}
            </Text>
          ) : null}

          <Pressable
            style={styles.dismissButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.dismissText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A4A4A',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  placeName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  dismissButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF7F50',
  },
});
