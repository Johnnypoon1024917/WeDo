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
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import { restorePurchases } from '../services/purchaseService';
import { supabase } from '../lib/supabase';
import { calculateDaysTogether } from '../services/widgetBridge';
import i18n, { LANGUAGE_KEY } from '../i18n';

const VAULT_ENABLED_KEY = 'wedo_vault_enabled';
const THEME_KEY = 'wedo_selected_theme';
const CONNECTION_DECK_KEY = 'wedo_connection_deck';
const CONNECTION_INDEX_KEY = 'wedo_connection_index';

const PAIRING_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePairingCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += PAIRING_CHARS[Math.floor(Math.random() * PAIRING_CHARS.length)];
  }
  return code;
}

type ThemeOption = 'dark' | 'midnight' | 'warm';

const THEMES: { key: ThemeOption; label: string; color: string }[] = [
  { key: 'dark', label: 'Charcoal', color: '#121212' },
  { key: 'midnight', label: 'Midnight', color: '#0D1B2A' },
  { key: 'warm', label: 'Warm Night', color: '#1A1210' },
];

const LANGUAGES: { code: string; labelKey: string }[] = [
  { code: 'en', labelKey: 'settings.languageEnglish' },
  { code: 'es', labelKey: 'settings.languageSpanish' },
  { code: 'zh', labelKey: 'settings.languageChinese' },
];

export default function SettingsScreen() {
  const user = useAppStore((s) => s.user);
  const partnerId = useAppStore((s) => s.partnerId);
  const relationshipId = useAppStore((s) => s.relationshipId);
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
  const [disconnecting, setDisconnecting] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const { t } = useTranslation();

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
        if (data) setPartnerName(data.display_name || data.email || t('settings.partner'));
      });
  }, [partnerId]);

  // Fetch active pairing code when unpaired (Task 13.1.1)
  useEffect(() => {
    if (relationshipId || !user) return;
    supabase
      .from('pairing_codes')
      .select('code')
      .eq('created_by', user.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPairingCode(data[0].code);
        }
      });
  }, [relationshipId, user]);

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
      setRestoreMessage(t('settings.premiumRestored'));
    } else {
      setRestoreMessage(result.message ?? t('settings.noRestoreFound'));
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
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

  // Task 12.1: Disconnect partner
  const handleDisconnect = () => {
    Alert.alert(
      t('settings.disconnectTitle'),
      t('settings.disconnectWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.disconnect'),
          style: 'destructive',
          onPress: async () => {
            if (!user || !relationshipId) return;
            setDisconnecting(true);
            try {
              // Set relationship_id = null on both users
              await Promise.all([
                supabase
                  .from('users')
                  .update({ relationship_id: null })
                  .eq('id', user.id),
                supabase
                  .from('users')
                  .update({ relationship_id: null })
                  .eq('id', partnerId),
              ]);

              // Clear relevant AsyncStorage keys
              await AsyncStorage.multiRemove([
                VAULT_ENABLED_KEY,
                THEME_KEY,
                CONNECTION_DECK_KEY,
                CONNECTION_INDEX_KEY,
              ]);

              // Clear Zustand store — RootNavigator will auto-navigate to OnboardingStack
              clearAuth();
            } catch {
              Alert.alert(t('common.error'), t('settings.disconnectError'));
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  // Task 13.1: Generate a new pairing code
  const handleGenerateCode = async () => {
    if (!user) return;
    setLoadingCode(true);
    try {
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const { error } = await supabase.from('pairing_codes').insert({
        code,
        created_by: user.id,
        expires_at: expiresAt,
        used: false,
      });

      if (!error) {
        setPairingCode(code);
      } else {
        Alert.alert(t('common.error'), t('settings.generateCodeError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.generateCodeError'));
    } finally {
      setLoadingCode(false);
    }
  };

  // Task 13.1: Share the pairing code
  const handleShareCode = async () => {
    if (!pairingCode) return;
    await Share.share({ message: pairingCode });
  };

  // Task 14.2: Change app language
  const handleLanguageSelect = async (locale: string) => {
    setCurrentLanguage(locale);
    await i18n.changeLanguage(locale);
    await AsyncStorage.setItem(LANGUAGE_KEY, locale);
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
        <Text className="text-soft-coral text-2xl font-bold mb-6">{t('settings.settings')}</Text>

        {/* ── User Profile ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold">{t('settings.profile')}</Text>
          <Text className="text-gray-400 text-sm mt-1">
            {user?.email ?? t('settings.notSignedIn')}
          </Text>
          {daysTogether !== null && (
            <Text className="text-teal text-sm mt-2">
              {t('settings.daysTogether', { count: daysTogether })}
            </Text>
          )}
        </SectionCard>

        {/* ── Partner Info ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold">{t('settings.partner')}</Text>
          <Text className="text-gray-400 text-sm mt-1">
            {partnerName ?? t('settings.notPaired')}
          </Text>
        </SectionCard>

        {/* ── Disconnect Partner (Task 12.1) ── */}
        {relationshipId !== null && (
          <SectionCard>
            <Pressable
              onPress={handleDisconnect}
              disabled={disconnecting}
              style={{ backgroundColor: '#EF4444' }}
              className="rounded-xl py-3 items-center"
              accessibilityRole="button"
              accessibilityLabel={t('settings.disconnectPartner')}
            >
              {disconnecting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white text-sm font-semibold">
                  {t('settings.disconnectPartner')}
                </Text>
              )}
            </Pressable>
          </SectionCard>
        )}

        {/* ── Invite / Share Code (Task 13.1) ── */}
        {relationshipId === null && (
          <SectionCard>
            <Text className="text-white text-base font-semibold mb-3">
              {t('settings.invitePartner')}
            </Text>
            {pairingCode ? (
              <View className="items-center">
                <Text className="text-teal text-3xl font-bold tracking-[6px] mb-3">
                  {pairingCode}
                </Text>
                <Text className="text-gray-400 text-xs mb-3">
                  {t('settings.shareCodeHint')}
                </Text>
                <Pressable
                  onPress={handleShareCode}
                  style={{ backgroundColor: '#FF7F50' }}
                  className="rounded-xl py-3 w-full items-center"
                  accessibilityRole="button"
                  accessibilityLabel={t('settings.shareCode')}
                >
                  <Text className="text-white text-sm font-semibold">
                    {t('settings.shareCode')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleGenerateCode}
                disabled={loadingCode}
                style={{ backgroundColor: '#FF7F50' }}
                className="rounded-xl py-3 items-center"
                accessibilityRole="button"
                accessibilityLabel={t('settings.generateCode')}
              >
                {loadingCode ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="text-white text-sm font-semibold">
                    {t('settings.generateCode')}
                  </Text>
                )}
              </Pressable>
            )}
          </SectionCard>
        )}

        {/* ── Privacy Vault ── */}
        <View className="bg-neutral-800 rounded-xl px-4 py-4 mt-4 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-white text-base font-semibold">{t('settings.privacyVault')}</Text>
            <Text className="text-gray-400 text-sm mt-1">
              {t('settings.privacyVaultDesc')}
            </Text>
          </View>
          <Switch
            value={isVaultEnabled}
            onValueChange={handleVaultToggle}
            trackColor={{ false: '#3e3e3e', true: '#FF7F50' }}
            thumbColor="#ffffff"
            accessibilityLabel={t('settings.privacyVault')}
            accessibilityRole="switch"
          />
        </View>

        {/* ── Theme Selector ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-3">{t('settings.theme')}</Text>
          <View className="flex-row gap-3">
            {THEMES.map((theme) => {
              const isActive = selectedTheme === theme.key;
              const isPremiumTheme = theme.key !== 'dark';
              const locked = isPremiumTheme && !isPremium;
              return (
                <Pressable
                  key={theme.key}
                  onPress={() => !locked && handleThemeSelect(theme.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${theme.label} theme${locked ? ' (premium)' : ''}`}
                  className="items-center"
                >
                  <View
                    style={{ backgroundColor: theme.color }}
                    className={`w-14 h-14 rounded-full border-2 ${
                      isActive ? 'border-soft-coral' : 'border-neutral-600'
                    } items-center justify-center`}
                  >
                    {locked && (
                      <Text className="text-gray-400 text-xs">🔒</Text>
                    )}
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">{theme.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {!isPremium && (
            <Text className="text-gray-500 text-xs mt-2">
              {t('settings.premiumThemes')}
            </Text>
          )}
        </SectionCard>

        {/* ── Subscription Management ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-1">{t('settings.subscription')}</Text>
          <Text className="text-gray-400 text-sm mb-3">
            {isPremium ? t('settings.premiumLifetime') : t('settings.freePlan')}
          </Text>

          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            className="bg-neutral-700 rounded-xl py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel={t('settings.restorePurchases')}
          >
            {restoring ? (
              <ActivityIndicator color="#40E0D0" size="small" />
            ) : (
              <Text className="text-teal text-sm font-semibold">
                {t('settings.restorePurchases')}
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
            {t('settings.widget')}
          </Text>
          <Text className="text-gray-400 text-sm leading-5">
            {t('settings.widgetDesc')}
          </Text>
          {Platform.OS === 'ios' ? (
            <View className="mt-3">
              <Text className="text-gray-300 text-sm font-medium mb-1">iOS</Text>
              <Text className="text-gray-400 text-xs leading-5">
                {t('settings.widgetIos')}
              </Text>
            </View>
          ) : (
            <View className="mt-3">
              <Text className="text-gray-300 text-sm font-medium mb-1">Android</Text>
              <Text className="text-gray-400 text-xs leading-5">
                {t('settings.widgetAndroid')}
              </Text>
            </View>
          )}
          {isPremium && (
            <Text className="text-teal text-xs mt-2">
              {t('settings.widgetPremiumNote')}
            </Text>
          )}
        </SectionCard>

        {/* ── Language Switcher (Task 14.2) ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-3">{t('settings.language')}</Text>
          <View className="flex-row gap-3">
            {LANGUAGES.map((lang) => {
              const isActive = currentLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${t(lang.labelKey)} language`}
                  className={`flex-1 rounded-xl py-3 items-center ${
                    isActive ? 'bg-soft-coral' : 'bg-neutral-700'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {t(lang.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── App Preferences / Sign Out ── */}
        <SectionCard>
          <Text className="text-white text-base font-semibold mb-3">
            {t('settings.appPreferences')}
          </Text>
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            className="bg-neutral-700 rounded-xl py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel={t('settings.signOut')}
          >
            {signingOut ? (
              <ActivityIndicator color="#FF7F50" size="small" />
            ) : (
              <Text className="text-soft-coral text-sm font-semibold">{t('settings.signOut')}</Text>
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
