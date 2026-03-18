import './global.css';
import './src/i18n';
import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { AppState, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Nunito_400Regular, Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import PrivacyVaultOverlay from './src/components/PrivacyVaultOverlay';
import { useAppStore } from './src/store/appStore';
import {
  configurePurchases,
  loginUser,
  checkEntitlement,
} from './src/services/purchaseService';
import { syncWidgetData } from './src/services/widgetBridge';

SplashScreen.preventAutoHideAsync();

const WedoTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#2A2A2A',
    primary: '#FF7F50',
  },
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Extract the first URL from shared plain-text content.
 * When another app shares a link, the OS delivers the full text
 * (which may include surrounding copy). We pull out the URL.
 */
function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function handleSharedUrl(rawUrl: string | null) {
  if (!rawUrl) return;

  const parsed = extractUrl(rawUrl);
  if (!parsed) return;

  // Wait until navigation is ready before dispatching
  if (navigationRef.isReady()) {
    navigationRef.navigate('AddToListModal', { url: parsed });
  }
}

export default function App() {
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);
  const appState = useRef(AppState.currentState);

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Configure RevenueCat SDK on app load
  useEffect(() => {
    configurePurchases();
  }, []);

  // After auth, identify user in RevenueCat and check entitlement
  useEffect(() => {
    if (user?.id) {
      loginUser(user.id).then(() => checkEntitlement());
    }
  }, [user?.id]);

  // Sync widget data on foreground and when relationship changes
  useEffect(() => {
    if (relationshipId) {
      syncWidgetData();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active' &&
        relationshipId
      ) {
        syncWidgetData();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [relationshipId]);

  // Handle URLs shared from other apps (Social Catcher)
  useEffect(() => {
    // Cold start: app was opened via a shared URL
    Linking.getInitialURL().then(handleSharedUrl);

    // Runtime: app is already open and receives a shared URL
    const subscription = Linking.addEventListener('url', (event) => {
      handleSharedUrl(event.url);
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <NavigationContainer ref={navigationRef} theme={WedoTheme}>
      <RootNavigator />
      <PrivacyVaultOverlay />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
