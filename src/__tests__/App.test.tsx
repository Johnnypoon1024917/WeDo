import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ---- Mock non-JS imports that App.tsx pulls in ----

jest.mock('../../global.css', () => ({}), { virtual: true });
jest.mock('../i18n', () => ({}));

// ---- Controllable mock for useFonts ----

let mockFontsLoaded = false;
let mockFontError: Error | null = null;

jest.mock('@expo-google-fonts/playfair-display', () => ({
  useFonts: () => [mockFontsLoaded, mockFontError],
  PlayfairDisplay_700Bold: 'PlayfairDisplay_700Bold',
}));

jest.mock('@expo-google-fonts/nunito', () => ({
  Nunito_400Regular: 'Nunito_400Regular',
  Nunito_600SemiBold: 'Nunito_600SemiBold',
}));

// ---- SplashScreen mock ----

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}), { virtual: true });

import * as SplashScreen from 'expo-splash-screen';

// ---- Stub remaining App dependencies ----

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  DefaultTheme: { colors: {} },
  createNavigationContainerRef: () => ({ isReady: () => false }),
}));

jest.mock('../navigation/RootNavigator', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="root-navigator" /> };
});

jest.mock('../components/PrivacyVaultOverlay', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="privacy-overlay" /> };
});

jest.mock('../store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: any) => any) =>
    selector({
      user: { id: 'user-1' },
      relationshipId: 'rel-123',
      isPremium: false,
      isVaultEnabled: false,
      isVaultLocked: false,
    })
  ),
}));

jest.mock('../services/purchaseService', () => ({
  configurePurchases: jest.fn(),
  loginUser: jest.fn(() => Promise.resolve()),
  checkEntitlement: jest.fn(() => Promise.resolve()),
}));

jest.mock('../services/widgetBridge', () => ({
  syncWidgetData: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// ---- Import App after all mocks are set up ----

import App from '../../App';

// ---- Tests ----

beforeEach(() => {
  jest.clearAllMocks();
  mockFontsLoaded = false;
  mockFontError = null;
});

describe('App — font loading coordination', () => {
  it('calls SplashScreen.hideAsync() when fonts finish loading', async () => {
    mockFontsLoaded = true;
    mockFontError = null;

    render(<App />);

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });

  it('calls SplashScreen.hideAsync() when font loading errors', async () => {
    mockFontsLoaded = false;
    mockFontError = new Error('font error');

    render(<App />);

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });

  it('returns null (renders nothing) while fonts are loading', () => {
    mockFontsLoaded = false;
    mockFontError = null;

    const { toJSON } = render(<App />);

    expect(toJSON()).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
