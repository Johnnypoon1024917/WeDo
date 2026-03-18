import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---- Configurable mock state ----

let mockStorageRemoveResults: Array<{ error: object | null }> = [];
let mockStorageRemoveCallIndex = 0;
let mockDbDeleteResult: { error: object | null } = { error: null };

const mockStorageRemoveFn = jest.fn();
const mockDbDeleteEqFn = jest.fn();
const mockDbDeleteFn = jest.fn();
const mockStorageFromFn = jest.fn();
const mockSupabaseFromFn = jest.fn();
const mockRemoveChannelFn = jest.fn();

// Memories returned by initial fetch
let mockMemories: any[] = [];

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: (...args: any[]) => mockStorageFromFn(...args),
    },
    from: (...args: any[]) => mockSupabaseFromFn(...args),
    removeChannel: (...args: any[]) => mockRemoveChannelFn(...args),
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
      petName: null,
      petHealth: 0,
      petTotalXp: 0,
      petLastFedAt: null,
      setPetState: jest.fn(),
    })
  ),
}));

jest.mock('../../services/realtimeManager', () => ({
  realtimeManager: {
    subscribeToMemories: jest.fn(() => ({ unsubscribe: jest.fn() })),
  },
  MemoryEntry: {},
}));

jest.mock('../../services/petService', () => ({
  loadAndDecayPet: jest.fn(() => Promise.resolve({
    petName: 'Buddy',
    petHealth: 80,
    petTotalXp: 50,
    petLastFedAt: new Date().toISOString(),
  })),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
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
jest.mock('../../components/RelationshipPet', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="relationship-pet" /> };
});
jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: (props: any) => <View {...props} /> };
});
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const mockTap = () => {
    const gesture: any = {
      numberOfTaps: () => gesture,
      onEnd: () => gesture,
    };
    return gesture;
  };
  return {
    GestureHandlerRootView: (props: any) => <View {...props} />,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Tap: mockTap,
      Exclusive: (..._args: any[]) => ({}),
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
    Trash2: (props: any) => <View testID="trash2-icon" {...props} />,
    Mic: (props: any) => <View testID="mic-icon" {...props} />,
  };
});

import TimelineScreen from '../TimelineScreen';

// ---- Helpers ----

const VALID_PHOTO_URL =
  'https://abc.supabase.co/storage/v1/object/public/wedo-assets/rel-123/photos/pic.jpg';
const VALID_AUDIO_URL =
  'https://abc.supabase.co/storage/v1/object/public/wedo-assets/rel-123/audio/note.m4a';
const INVALID_URL = 'https://example.com/no-marker/pic.jpg';

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

function getDestructiveAlertCallback(): (() => Promise<void>) | undefined {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  for (const call of calls) {
    const buttons = call[2];
    if (Array.isArray(buttons)) {
      const destructive = buttons.find((b: any) => b.style === 'destructive');
      if (destructive?.onPress) return destructive.onPress;
    }
  }
  return undefined;
}

// ---- Setup ----

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');

  mockStorageRemoveResults = [{ error: null }];
  mockStorageRemoveCallIndex = 0;
  mockDbDeleteResult = { error: null };
  mockMemories = [];

  // Re-wire mock implementations each test
  mockStorageRemoveFn.mockImplementation(() => {
    const result = mockStorageRemoveResults[mockStorageRemoveCallIndex] ?? { error: null };
    mockStorageRemoveCallIndex++;
    return Promise.resolve(result);
  });
  mockStorageFromFn.mockImplementation(() => ({ remove: mockStorageRemoveFn }));
  mockDbDeleteEqFn.mockImplementation(() => Promise.resolve(mockDbDeleteResult));
  mockDbDeleteFn.mockImplementation(() => ({ eq: mockDbDeleteEqFn }));
  mockSupabaseFromFn.mockImplementation((table: string) => {
    if (table === 'memories') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockMemories, error: null })),
          })),
        })),
        delete: mockDbDeleteFn,
      };
    }
    if (table === 'memory_likes') {
      return {
        upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }
    return {
      select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    };
  });
});

// ---- Tests ----

describe('TimelineScreen handleDelete — reliable storage deletion', () => {
  it('3.2.1 — successful photo + audio storage deletion proceeds to delete DB row', async () => {
    const memory = makeMemory({ audio_url: VALID_AUDIO_URL });
    mockMemories = [memory];
    mockStorageRemoveResults = [{ error: null }, { error: null }];

    const { getByLabelText } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByLabelText('timeline.deleteMemory')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('timeline.deleteMemory'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'timeline.deleteMemory',
      'timeline.deleteConfirm',
      expect.any(Array),
    );

    const onPress = getDestructiveAlertCallback();
    expect(onPress).toBeDefined();
    await act(async () => {
      await onPress!();
    });

    // Both storage files should have been removed
    expect(mockStorageRemoveFn).toHaveBeenCalledTimes(2);
    expect(mockStorageFromFn).toHaveBeenCalledWith('wedo-assets');

    // DB row should have been deleted
    expect(mockDbDeleteFn).toHaveBeenCalled();
    expect(mockDbDeleteEqFn).toHaveBeenCalledWith('id', 'mem-1');
  });

  it('3.2.2 — failed photo storage deletion aborts DB row deletion and shows error', async () => {
    const memory = makeMemory({ audio_url: VALID_AUDIO_URL });
    mockMemories = [memory];
    mockStorageRemoveResults = [{ error: { message: 'Storage error' } }];

    const { getByLabelText } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByLabelText('timeline.deleteMemory')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('timeline.deleteMemory'));

    const onPress = getDestructiveAlertCallback();
    expect(onPress).toBeDefined();
    await act(async () => {
      await onPress!();
    });

    expect(mockStorageRemoveFn).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteFn).not.toHaveBeenCalled();

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const errorAlert = alertCalls.find(
      (call: any[]) => call[0] === 'common.error' && call[1] === 'timeline.deleteError',
    );
    expect(errorAlert).toBeTruthy();
  });

  it('3.2.3 — extractStoragePath returning null for a valid URL aborts deletion', async () => {
    const memory = makeMemory({ photo_url: INVALID_URL });
    mockMemories = [memory];

    const { getByLabelText } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByLabelText('timeline.deleteMemory')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('timeline.deleteMemory'));

    const onPress = getDestructiveAlertCallback();
    expect(onPress).toBeDefined();
    await act(async () => {
      await onPress!();
    });

    expect(mockStorageRemoveFn).not.toHaveBeenCalled();
    expect(mockDbDeleteFn).not.toHaveBeenCalled();

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const errorAlert = alertCalls.find(
      (call: any[]) => call[0] === 'common.error' && call[1] === 'timeline.deleteError',
    );
    expect(errorAlert).toBeTruthy();
  });

  it('3.2.4 — memory with no audio deletes photo only and succeeds', async () => {
    const memory = makeMemory({ audio_url: null });
    mockMemories = [memory];
    mockStorageRemoveResults = [{ error: null }];

    const { getByLabelText } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByLabelText('timeline.deleteMemory')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('timeline.deleteMemory'));

    const onPress = getDestructiveAlertCallback();
    expect(onPress).toBeDefined();
    await act(async () => {
      await onPress!();
    });

    expect(mockStorageRemoveFn).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteFn).toHaveBeenCalled();
    expect(mockDbDeleteEqFn).toHaveBeenCalledWith('id', 'mem-1');
  });
});
