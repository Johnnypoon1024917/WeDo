import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppStore } from '../store/appStore';

export default function PrivacyVaultOverlay() {
  const isVaultEnabled = useAppStore((s) => s.isVaultEnabled);
  const isVaultLocked = useAppStore((s) => s.isVaultLocked);
  const setVaultLocked = useAppStore((s) => s.setVaultLocked);
  const appStateRef = useRef(AppState.currentState);
  const authenticatingRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App went to background — lock if vault is enabled
      if (
        nextAppState === 'background' &&
        isVaultEnabled &&
        !isVaultLocked
      ) {
        setVaultLocked(true);
      }

      // App came back to foreground — prompt biometric unlock
      if (
        appStateRef.current.match(/background|inactive/) &&
        nextAppState === 'active' &&
        isVaultLocked &&
        !authenticatingRef.current
      ) {
        authenticate();
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isVaultEnabled, isVaultLocked]);

  const authenticate = async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock WeDo',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setVaultLocked(false);
      }
      // On failure the OS already offered PIN fallback via fallbackLabel.
      // If the user cancels, the vault stays locked until next attempt.
    } finally {
      authenticatingRef.current = false;
    }
  };

  if (!isVaultLocked) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-only">
      <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}
