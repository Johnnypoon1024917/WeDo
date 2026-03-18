import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';

export interface SummaryExportCardProps {
  memoryCount: number;
  adventureCount: number;
  onShare: () => void;
}

const SummaryExportCard = forwardRef<ViewShot, SummaryExportCardProps>(
  ({ memoryCount, adventureCount, onShare }, ref) => {
    return (
      <View style={styles.container}>
        <ViewShot
          ref={ref}
          options={{ format: 'jpg', quality: 0.9 }}
          style={styles.captureArea}
        >
          <LinearGradient
            colors={['#1A0A2E', '#0D2137', '#0D0D1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <Text style={styles.title}>Our Year Together</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{memoryCount}</Text>
              <Text style={styles.statLabel}>Memories</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{adventureCount}</Text>
              <Text style={styles.statLabel}>Adventures</Text>
            </View>
          </View>

          <Text style={styles.watermark}>Made with WeDo</Text>
        </ViewShot>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share summary"
        >
          <Text style={styles.shareButtonText}>Share ✨</Text>
        </TouchableOpacity>
      </View>
    );
  },
);

SummaryExportCard.displayName = 'SummaryExportCard';

export default SummaryExportCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  captureArea: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 40,
  },
  statBlock: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FF7F50',
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginTop: 4,
  },
  watermark: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
  shareButton: {
    marginTop: 24,
    backgroundColor: '#FF7F50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
