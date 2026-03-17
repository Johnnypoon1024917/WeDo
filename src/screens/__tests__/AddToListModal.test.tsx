import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ---- Mocks ----

const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  goBack: mockGoBack,
  navigate: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
};

const mockRoute = {
  key: 'AddToListModal',
  name: 'AddToListModal' as const,
  params: { url: 'https://example.com' },
};

// Supabase mock — configurable per test
let mockSupabaseCount: number | null = 0;
let mockSupabaseError: object | null = null;

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() =>
          Promise.resolve({
            count: mockSupabaseCount,
            error: mockSupabaseError,
          })
        ),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// AppStore mock — configurable per test
let mockIsPremium = false;
let mockRelationshipId: string | null = 'rel-123';
const mockUser = { id: 'user-1' };

jest.mock('../../store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: any) => any) =>
    selector({
      user: mockUser,
      relationshipId: mockRelationshipId,
      isPremium: mockIsPremium,
    })
  ),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../components/LocationSearch', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="location-search" />,
  };
});

import AddToListModal from '../AddToListModal';

// ---- Tests ----

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPremium = false;
  mockRelationshipId = 'rel-123';
  mockSupabaseCount = 0;
  mockSupabaseError = null;
});

describe('AddToListModal deep-link gate', () => {
  it('1.2.1 — free user with >= 10 items is redirected to PaywallModal', async () => {
    mockIsPremium = false;
    mockSupabaseCount = 10;

    render(
      <AddToListModal navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('PaywallModal');
    });
  });

  it('1.2.2 — free user with < 10 items sees the add-item form', async () => {
    mockIsPremium = false;
    mockSupabaseCount = 5;

    const { getByText } = render(
      <AddToListModal navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
      expect(getByText('addToList.newBucketListItem')).toBeTruthy();
    });
  });

  it('1.2.3 — premium user sees the add-item form regardless of item count', async () => {
    mockIsPremium = true;
    mockSupabaseCount = 50;

    const { getByText } = render(
      <AddToListModal navigation={mockNavigation as any} route={mockRoute as any} />
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
      expect(getByText('addToList.newBucketListItem')).toBeTruthy();
    });
  });
});
