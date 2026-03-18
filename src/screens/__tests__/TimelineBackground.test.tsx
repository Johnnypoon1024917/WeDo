import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ---- Configurable mock state ----
let mockMemories: any[] = [];

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
  useNavigation: () => ({ navigate: jest.fn() }),
}));

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
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props: any) => <RN.View {...props} />,
      Image: (props: any) => <RN.Image {...props} />,
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

const VALID_PHOTO_URL =
  'https://abc.supabase.co/storage/v1/object/public/wedo-assets/rel-123/photos/pic.jpg';

function makeMemory(overrides: Partial<any> = {}) {
  return {
    id: 'mem-1',
    relationship_id: 'rel-123',
    created_by: 'user-1',
    photo_url: VALID_PHOTO_URL,
    caption: 'A lovely day',
    revealed: true,
    audio_url: null as string | null,
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
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
      return {
        upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }
    return {
      select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })),
    };
  });
});

/** Walk the JSON tree to find nodes matching a predicate. */
function findAll(node: any, predicate: (n: any) => boolean): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (predicate(node)) results.push(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        results.push(...findAll(child, predicate));
      }
    }
  }
  return results;
}

/** Flatten a style array/object into a single object. */
function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc: any, s: any) => ({ ...acc, ...flattenStyle(s) }), {});
  }
  return style;
}

describe('Timeline background and date header styles', () => {
  it('TimelineScreen container has backgroundColor #FAFAFA', async () => {
    const { getByText, toJSON } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByText('A lovely day')).toBeTruthy();
    });

    const tree = toJSON();
    // The root container View should have backgroundColor #FAFAFA
    const containers = findAll(tree, (n) => {
      if (n.type !== 'View') return false;
      const style = flattenStyle(n.props?.style);
      return style.backgroundColor === '#FAFAFA' && style.flex === 1;
    });
    expect(containers.length).toBeGreaterThan(0);
    expect(flattenStyle(containers[0].props.style).backgroundColor).toBe('#FAFAFA');
  });

  it('DateHeader text uses fontFamily PlayfairDisplay_700Bold', async () => {
    const { getByText, toJSON } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByText('A lovely day')).toBeTruthy();
    });

    const tree = toJSON();
    // Find Text nodes with fontFamily PlayfairDisplay_700Bold that are date headers
    const dateHeaders = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const style = flattenStyle(n.props?.style);
      return style.fontFamily === 'PlayfairDisplay_700Bold' && style.fontSize === 16;
    });
    expect(dateHeaders.length).toBeGreaterThan(0);
    expect(flattenStyle(dateHeaders[0].props.style).fontFamily).toBe('PlayfairDisplay_700Bold');
  });

  it('DateHeader text uses color #4A4A4A', async () => {
    const { getByText, toJSON } = render(<TimelineScreen />);

    await waitFor(() => {
      expect(getByText('A lovely day')).toBeTruthy();
    });

    const tree = toJSON();
    // Find Text nodes that are date headers (PlayfairDisplay_700Bold, fontSize 16)
    const dateHeaders = findAll(tree, (n) => {
      if (n.type !== 'Text') return false;
      const style = flattenStyle(n.props?.style);
      return style.fontFamily === 'PlayfairDisplay_700Bold' && style.fontSize === 16;
    });
    expect(dateHeaders.length).toBeGreaterThan(0);
    expect(flattenStyle(dateHeaders[0].props.style).color).toBe('#4A4A4A');
  });
});
