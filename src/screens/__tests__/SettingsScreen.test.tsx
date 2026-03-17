import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---- Call order tracking ----
const callOrder: string[] = [];

// ---- Mock: realtimeManager ----
const mockUnsubscribeAll = jest.fn(() => {
  callOrder.push('unsubscribeAll');
});

jest.mock('../../services/realtimeManager', () => ({
  realtimeManager: {
    unsubscribeAll: (...args: any[]) => mockUnsubscribeAll(...args),
  },
}));

// ---- Mock: supabase ----
const mockSignOut = jest.fn(() => {
  callOrder.push('signOut');
  return Promise.resolve({ error: null });
});

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: (...args: any[]) => mockSignOut(...args),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [] })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// ---- Mock: appStore ----
const mockClearAuth = jest.fn(() => {
  callOrder.push('clearAuth');
});
const mockSetVaultEnabled = jest.fn();

jest.mock('../../store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: any) => any) =>
    selector({
      user: { id: 'user-1', email: 'test@example.com' },
      partnerId: 'partner-1',
      relationshipId: 'rel-123',
      relationshipStartDate: '2024-01-01',
      isVaultEnabled: false,
      setVaultEnabled: mockSetVaultEnabled,
      isPremium: false,
      clearAuth: mockClearAuth,
    })
  ),
}));

// ---- Mock: other dependencies ----
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../services/purchaseService', () => ({
  restorePurchases: jest.fn(() =>
    Promise.resolve({ restored: false, message: 'No purchase found.' })
  ),
}));

jest.mock('../../services/widgetBridge', () => ({
  calculateDaysTogether: jest.fn(() => 42),
}));

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: { language: 'en', changeLanguage: jest.fn() },
  LANGUAGE_KEY: 'wedo_language',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

import SettingsScreen from '../SettingsScreen';

// ---- Helpers ----

/**
 * Find the destructive button callback from Alert.alert calls.
 * Searches for the "Sign Out" alert specifically.
 */
function getSignOutAlertCallback(): (() => Promise<void>) | undefined {
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
  callOrder.length = 0;
});

// ---- Tests ----

describe('SettingsScreen handleSignOut — realtime cleanup', () => {
  it('4.2.1 — realtimeManager.unsubscribeAll() is called before supabase.auth.signOut()', async () => {
    const { getByLabelText } = render(<SettingsScreen />);

    // Tap the sign-out button
    fireEvent.press(getByLabelText('settings.signOut'));

    // Alert should have been shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'settings.signOutTitle',
      'settings.signOutConfirm',
      expect.any(Array),
    );

    // Get the destructive button callback and invoke it
    const onPress = getSignOutAlertCallback();
    expect(onPress).toBeDefined();

    await act(async () => {
      await onPress!();
    });

    // Both should have been called
    expect(mockUnsubscribeAll).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Verify ORDER: unsubscribeAll must come before signOut
    const unsubIdx = callOrder.indexOf('unsubscribeAll');
    const signOutIdx = callOrder.indexOf('signOut');
    expect(unsubIdx).toBeGreaterThanOrEqual(0);
    expect(signOutIdx).toBeGreaterThanOrEqual(0);
    expect(unsubIdx).toBeLessThan(signOutIdx);
  });

  it('4.2.2 — sign-out completes successfully and clears auth state after realtime cleanup', async () => {
    const { getByLabelText } = render(<SettingsScreen />);

    // Tap the sign-out button
    fireEvent.press(getByLabelText('settings.signOut'));

    const onPress = getSignOutAlertCallback();
    expect(onPress).toBeDefined();

    await act(async () => {
      await onPress!();
    });

    // clearAuth should have been called after signOut
    expect(mockClearAuth).toHaveBeenCalledTimes(1);

    const signOutIdx = callOrder.indexOf('signOut');
    const clearAuthIdx = callOrder.indexOf('clearAuth');
    expect(signOutIdx).toBeGreaterThanOrEqual(0);
    expect(clearAuthIdx).toBeGreaterThanOrEqual(0);
    expect(clearAuthIdx).toBeGreaterThan(signOutIdx);

    // Full order should be: unsubscribeAll -> signOut -> clearAuth
    expect(callOrder).toEqual(['unsubscribeAll', 'signOut', 'clearAuth']);
  });
});
