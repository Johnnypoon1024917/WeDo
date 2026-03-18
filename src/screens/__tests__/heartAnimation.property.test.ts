/**
 * Feature: viral-aesthetic-micro-interactions
 * Property 2: Heart animation targets correct values
 *
 * Validates: Requirements 3.2
 */
import fc from 'fast-check';

// Mock heavy dependencies before importing triggerHeartAnimation (no JSX needed)
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: { from: jest.fn() },
    from: jest.fn(),
    removeChannel: jest.fn(),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() })),
  },
}));

jest.mock('../../store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: any) => any) =>
    selector({ user: { id: 'user-1' }, isPremium: false, relationshipId: 'rel-123', connectionStatus: 'connected', setConnectionStatus: jest.fn() })
  ),
}));

jest.mock('../../services/realtimeManager', () => ({
  realtimeManager: { subscribeToMemories: jest.fn(() => ({ unsubscribe: jest.fn() })) },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('expo-blur', () => ({
  BlurView: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const mockTap = () => {
    const gesture: any = {
      numberOfTaps: () => gesture,
      onEnd: () => gesture,
    };
    return gesture;
  };
  return {
    GestureHandlerRootView: () => null,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Tap: mockTap,
      Exclusive: (..._args: any[]) => ({}),
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: () => null, Image: () => null },
  FadeInDown: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
  LinearTransition: { springify: () => ({}) },
  Layout: { springify: () => ({}) },
  useSharedValue: (val: number) => ({ value: val }),
  useAnimatedStyle: (fn: () => any) => fn(),
  withSpring: (val: number) => val,
  withDelay: (_delay: number, val: number) => val,
  withTiming: (val: number) => val,
  runOnJS: (fn: any) => fn,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('lucide-react-native', () => ({
  Heart: () => null,
}));

jest.mock('../../components/ScratchOffOverlay', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/AudioPlayer', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/AudioRecorder', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/AnniversaryBanner', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/SkeletonCard', () => ({ __esModule: true, default: () => null }));

import { triggerHeartAnimation } from '../TimelineScreen';

describe('Property 2: Heart animation targets correct values', () => {
  it('triggerHeartAnimation() always sets scale to 1.5 and opacity to 0', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const heartScale = { value: 0 };
        const heartOpacity = { value: 0 };

        triggerHeartAnimation(heartScale, heartOpacity);

        expect(heartScale.value).toBe(1.5);
        expect(heartOpacity.value).toBe(0);
      }),
      { numRuns: 200 }
    );
  });
});
