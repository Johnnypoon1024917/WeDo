import React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import AudioPlayer from '../components/AudioPlayer';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryDetailScreen'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function MemoryDetailScreen({ navigation, route }: Props) {
  const { memory } = route.params;

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-screen photo with shared transition tag */}
        <View style={styles.photoContainer}>
          <Animated.Image
            source={{ uri: memory.photo_url }}
            style={styles.photo}
            resizeMode="cover"
            {...{ sharedTransitionTag: `memory-photo-${memory.id}` } as any}
          />
        </View>

        {/* Caption and metadata with entering animation */}
        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(15)}
          style={styles.content}
        >
          <Text style={styles.caption}>{memory.caption}</Text>
          <Text style={styles.timestamp}>
            {formatDate(memory.created_at)} · {formatTime(memory.created_at)}
          </Text>

          {/* Audio player if audio exists */}
          {memory.audio_url ? (
            <View style={styles.audioContainer}>
              <AudioPlayer audioUrl={memory.audio_url} />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photo: {
    width: SCREEN_WIDTH,
    aspectRatio: 4 / 3,
  },
  photoContainer: {
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  caption: {
    fontFamily: 'System',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  timestamp: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#40E0D0',
    marginTop: 8,
  },
  audioContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 8,
  },
});
