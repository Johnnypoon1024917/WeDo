import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ---- Gesture handler capture state ----

let capturedDoubleTapHandler: (() => void) | null = null;
let capturedSingleTapHandler: (() => void) | null = null;
let exclusiveCalled = false;

// ---- Configurable mock state ----

let mockMemories: any[] = [];
const mockUpsertFn = jest.fn(() => Promise.resolve({ data: null, error: null }));
const mockNavigateFn = jest.fn();
const mockSupabaseFromFn = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({ remove: jest.fn(() => Promise.resolve({ error: null })) })),
    },
    from: (...args: any[]) => mockSupabaseFromFn(...args),
    removeChannel: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('../../store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: any) => any) =>
    selector({
      user: { id: 'user-1' },
      isPremium: false,
      relationshipId: 'rel-123',
      connectionStatus: 'connected',
      setConnectionStatus: jest.fn(),
    })
  ),
}));

jest.mock('../../services/realtimeManager', () => ({
  realtimeManager: {
    subscribeToMemories: jest.fn(() => ({ unsubscribe: jest.fn() })),
  },
  MemoryEntry: {},
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigateFn }),
}));

// Stub heavy child components
jest.mock('../../components/ScratchOffOverlay', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="scratch-off" /> };
});
jest.mock('../../components/AudioPlayer', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="audio-player" /> };
});
jest.mock('../../components/AudioRecorder', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="audio-recorder" /> };
});
jest.mock('../../components/AnniversaryBanner', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="anniversary-banner" /> };
});
jest.mock('../../components/SkeletonCard', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="skeleton-card" /> };
});
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: (props: any) => <View {...props} /> };
});

// Gesture handler mock that captures onEnd callbacks
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const mockTap = () => {
    let taps = 1;
    const gesture: any = {
      numberOfTaps: (n: number) => {
        taps = n;
        return gesture;
      },
      onEnd: (handler: () => void) => {
        if (taps === 2) capturedDoubleTapHandler = handler;
        else capturedSingleTapHandler = handler;
        return gesture;
      },
    };
    return gesture;
  };
  return {
    GestureHandlerRootView: (props: any) => <View {...props} />,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Tap: mockTap,
      Exclusive: (..._args: any[]) => {
        exclusiveCalled = true;
        return {};
      },
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const { View, Image } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props: any) => <View {...props} />,
      Image: (props: any) => <Image {...props} />,
    },
    FadeInDown: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
    LinearTransition: { springify: () => ({}) },
    Layout: { springify: () => ({}) },
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (val: number) => val,
    withDelay: (_delay: number, val: number) => val,
    withTiming: (val: number) => val,
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Heart: (props: any) => <View testID="heart-icon" {...props} />,
  };
});

import TimelineScreen from '../TimelineScreen';
import * as Haptics from 'expo-haptics';

// ---- Helpers ----

const VALID_PHOTO_URL =
  'https://abc.supabase.co/storage/v1/object/public/wedo-assets/rel-123/photos/pic.jpg';

function makeMemory(overrides: Partial<any> = {}) {
  return {
    id: 'mem-1',
    relationship_id: 'rel-123',
    created_by: 'user-1',
    photo_url: VALID_PHOTO_URL,
    caption: 'Test memory',
    revealed: true,
    audio_url: null as string | null,
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks();
  capturedDoubleTapHandler = null;
  capturedSingleTapHandler = null;
  exclusiveCalled = false;
  mockMemories = [makeMemory()];

  mockSupabaseFromFn.mockImplementation((table: string) => {
    if (table === 'memories') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockMemories, error: null })),
          })),
        })),
        delete: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
      };
    }
    if (table === 'memory_likes') {
      return { upsert: mockUpsertFn };
    }
    return {
      select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    };
  });
});

// ---- Tests ----

describe('Gesture interactions on MemoryCard', () => {
  it('double-tap triggers haptic feedback', async () => {
    render(<TimelineScreen />);

    await waitFor(() => {
      expect(capturedDoubleTapHandler).not.toBeNull();
    });

    capturedDoubleTapHandler!();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('double-tap upserts a like to Supabase memory_likes table', async () => {
    render(<TimelineScreen />);

    await waitFor(() => {
      expect(capturedDoubleTapHandler).not.toBeNull();
    });

    capturedDoubleTapHandler!();

    expect(mockSupabaseFromFn).toHaveBeenCalledWith('memory_likes');
    expect(mockUpsertFn).toHaveBeenCalledWith({
      memory_id: 'mem-1',
      user_id: 'user-1',
    });
  });

  it('single-tap navigates to MemoryDetailScreen', async () => {
    render(<TimelineScreen />);

    await waitFor(() => {
      expect(capturedSingleTapHandler).not.toBeNull();
    });

    capturedSingleTapHandler!();

    expect(mockNavigateFn).toHaveBeenCalledWith('MemoryDetailScreen', {
      memory: expect.objectContaining({ id: 'mem-1' }),
    });
  });

  it('Gesture.Exclusive is used for gesture composition', async () => {
    render(<TimelineScreen />);

    await waitFor(() => {
      expect(exclusiveCalled).toBe(true);
    });
  });
});
