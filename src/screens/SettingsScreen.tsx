import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/appStore';
import { restorePurchases } from '../services/purchaseService';
import { supabase } from '../lib/supabase';
import { calculateDaysTogether } from '../services/widgetBridge';

const VAULT_ENABLED_KEY = 'wedo_vault_enabled';
const THEME_KEY = 'wedo_selected_theme';

type ThemeOption = 'dark' | 'midnight' | 'warm';

const THEMES: { key: ThemeOption; label: string; color: string }[] = [
  { key: 'dark', label: 'Charcoal', color: '#121212' },
  { key: 'midnight', label: 'Midnight', color: '#0D1B2A' },
  { key: 'warm', label: 'Warm Night', color: '#1A1210' },
];

export default function SettingsScreen() {
  const user = useAppStore((s) => s.user);
  const partnerId = useAppStore((s) => s.partnerId);
  const relationshipStartDate = useAppStore((s) => s.relationshipStartDate);
  const isVaultEnabled = useAppStore((s) => s.isVaultEnabled);
  const setVaultEnabled = useAppStore((s) => s.setVaultEnabled);
  const isPremium = useAppStore((s) => s.isPremium);
  const clearAuth = useAppStore((s) => s.clearAuth);

  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>('dark');
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Hydrate persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(VAULT_ENABLED_KEY).then((value) => {
      if (value !== null) setVaultEnabled(value === 'true');
    });
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value) setSelectedTheme(value as ThemeOption);
    });
  }, []);

  // Fetch partner display name
  useEffect(() => {
    if (!partnerId) return;
    supabase
      .from('users')
      .select('display_name, email')
      .eq('id', partnerId)
      .single()
      .then(({ data }) => {
        if (data) setPartnerName(data.display_name || data.email || 'Partner');
      });
  }, [partnerId]);

  const handleVaultToggle = async (value: boolean) => {
    setVaultEnabled(value);
    await AsyncStorage.setItem(VAULT_ENABLED_KEY, String(value));
  };

  const handleThemeSelect = async (theme: ThemeOption) => {
    setSelectedTheme(theme);
    await AsyncStorage.setItem(THEME_KEY, theme);
  };

  const handleRestore = async () => {
    setRestoreMessage(null);
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.restored) {
      setRestoreMessage('Premium restored successfully.');
    } else {
      setRestoreMessage(result.message ?? 'No previous purchase found.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          clearAuth();
          setSigningOut(false);
        },
      },
    ]);
  };

  const daysTogether = relationshipStartDate
    ? calculateDaysTogether(relationshipStartDate)
    : null;

  return (
    <ScrollView
      className="flex-1 bg-charcoal"
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <View className="px-5 pt-16">
        <Text className="text-soft-coral text-2xl font-bold mb-6">Settings</Text>

        {/* ── User Profile ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold">Your Profile</Text>
          <Text className="text-gray-400 text-sm mt-1">
            {user?.email ?? 'Not signed in'}
          </Text>
          {daysTogether !== null && (
            <Text className="text-teal text-sm mt-2">
              {daysTogether} days together 💛
            </Text>
          )}
        </SectionCard>

        {/* ── Partner Info ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold">Partner</Text>
          <Text className="text-gray-400 text-sm mt-1">
            {partnerName ?? 'Not paired yet'}
          </Text>
        </SectionCard>

        {/* ── Privacy Vault ── */}
        <View className="bg-neutral-800 rounded-xl px-4 py-4 mt-4 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-white text-base font-semibold">Privacy Vault</Text>
            <Text className="text-gray-400 text-sm mt-1">
              Lock the app with Face ID / fingerprint when you leave
            </Text>
          </View>
          <Switch
            value={isVaultEnabled}
            onValueChange={handleVaultToggle}
            trackColor={{ false: '#3e3e3e', true: '#FF7F50' }}
            thumbColor="#ffffff"
            accessibilityLabel="Toggle Privacy Vault"
            accessibilityRole="switch"
          />
        </View>

        {/* ── Theme Selector ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-3">Theme</Text>
          <View className="flex-row gap-3">
            {THEMES.map((t) => {
              const isActive = selectedTheme === t.key;
              const isPremiumTheme = t.key !== 'dark';
              const locked = isPremiumTheme && !isPremium;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => !locked && handleThemeSelect(t.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label} theme${locked ? ' (premium)' : ''}`}
                  className="items-center"
                >
                  <View
                    style={{ backgroundColor: t.color }}
                    className={`w-14 h-14 rounded-full border-2 ${
                      isActive ? 'border-soft-coral' : 'border-neutral-600'
                    } items-center justify-center`}
                  >
                    {locked && (
                      <Text className="text-gray-400 text-xs">🔒</Text>
                    )}
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!isPremium && (
            <Text className="text-gray-500 text-xs mt-2">
              Additional themes available with Premium
            </Text>
          )}
        </SectionCard>

        {/* ── Subscription Management ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-1">Subscription</Text>
          <Text className="text-gray-400 text-sm mb-3">
            {isPremium ? 'Premium — Lifetime Access ✨' : 'Free Plan'}
          </Text>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            className="bg-neutral-700 rounded-xl py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            {restoring ? (
              <ActivityIndicator color="#40E0D0" size="small" />
            ) : (
              <Text className="text-teal text-sm font-semibold">
                Restore Purchases
              </Text>
            )}
          </Pressable>

          {restoreMessage && (
            <Text className="text-gray-400 text-xs text-center mt-2">
              {restoreMessage}
            </Text>
          )}
        </SectionCard>

        {/* ── Home Screen Widget Instructions ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-2">
            Home Screen Widget
          </Text>
          <Text className="text-gray-400 text-sm leading-5">
            Add a "Days Together" counter to your home screen.
          </Text>
          {Platform.OS === 'ios' ? (
            <View className="mt-3">
              <Text className="text-gray-300 text-sm font-medium mb-1">iOS</Text>
              <Text className="text-gray-400 text-xs leading-5">
                Long-press your home screen → tap the "+" button → search for "WeDo"
                → select the widget size → tap "Add Widget."
              </Text>
            </View>
          ) : (
            <View className="mt-3">
              <Text className="text-gray-300 text-sm font-medium mb-1">Android</Text>
              <Text className="text-gray-400 text-xs leading-5">
                Long-press your home screen → tap "Widgets" → find "WeDo Days
                Together" → drag it onto your home screen.
              </Text>
            </View>
          )}
          {isPremium && (
            <Text className="text-teal text-xs mt-2">
              Premium themes are applied to your widget automatically.
            </Text>
          )}
        </SectionCard>

        {/* ── App Preferences / Sign Out ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-3">
            App Preferences
          </Text>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            className="bg-neutral-700 rounded-xl py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            {signingOut ? (
              <ActivityIndicator color="#FF7F50" size="small" />
            ) : (
              <Text className="text-soft-coral text-sm font-semibold">Sign Out</Text>
            )}
          </Pressable>
        </SectionCard>
      </View>
    </ScrollView>
  );
}

/** Reusable section wrapper */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-neutral-800 rounded-xl px-4 py-4 mt-4">{children}</View>
  );
}
