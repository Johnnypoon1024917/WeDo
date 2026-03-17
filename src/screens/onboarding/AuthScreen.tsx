import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';
import type { OnboardingStackParamList } from '../../navigation/OnboardingStack';

type AuthNav = NativeStackNavigationProp<OnboardingStackParamList, 'Auth'>;

export default function AuthScreen() {
  const navigation = useNavigation<AuthNav>();
  const { t } = useTranslation();
  const setAuth = useAppStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleOAuth = async (provider: 'apple' | 'google') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) {
        Alert.alert(t('auth.signInError'), error.message);
        return;
      }
      // OAuth redirects externally; session is picked up by auth listener
    } catch (e: any) {
      Alert.alert(t('auth.signInError'), e.message ?? t('auth.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.emailRequired'), t('auth.enterEmail'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) {
        Alert.alert(t('auth.magicLinkError'), error.message);
        return;
      }
      setMagicLinkSent(true);
    } catch (e: any) {
      Alert.alert(t('auth.magicLinkError'), e.message ?? t('auth.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  // Listen for auth state changes (handles OAuth redirect + magic link)
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch user's relationship info
          const { data: userData } = await supabase
            .from('users')
            .select('relationship_id')
            .eq('id', session.user.id)
            .single();

          let partnerId: string | null = null;
          const relationshipId = userData?.relationship_id ?? null;

          if (relationshipId) {
            const { data: rel } = await supabase
              .from('relationships')
              .select('user1_id, user2_id')
              .eq('id', relationshipId)
              .single();
            if (rel) {
              partnerId = rel.user1_id === session.user.id
                ? rel.user2_id
                : rel.user1_id;
            }
          }

          setAuth(session.user, session, relationshipId, partnerId);

          // If not yet paired, go to PairingGateway
          if (!relationshipId) {
            navigation.replace('PairingGateway');
          }
          // If paired, RootNavigator will swap to MainTabNavigator automatically
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-charcoal"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 items-center justify-center px-8">
        <Text
          className="text-soft-coral text-4xl font-bold mb-2"
          style={{ fontFamily: 'serif' }}
        >
          WeDo
        </Text>
        <Text className="text-gray-400 text-base mb-10">
          {t('auth.subtitle')}
        </Text>

        {/* Apple Sign In */}
        <TouchableOpacity
          className="w-full bg-white rounded-xl py-4 mb-3 items-center"
          onPress={() => handleOAuth('apple')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithApple')}
        >
          <Text className="text-black text-base font-semibold">
            {t('auth.continueWithApple')}
          </Text>
        </TouchableOpacity>

        {/* Google Sign In */}
        <TouchableOpacity
          className="w-full bg-white rounded-xl py-4 mb-6 items-center"
          onPress={() => handleOAuth('google')}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithGoogle')}
        >
          <Text className="text-black text-base font-semibold">
            {t('auth.continueWithGoogle')}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center w-full mb-6">
          <View className="flex-1 h-px bg-gray-700" />
          <Text className="text-gray-500 mx-4 text-sm">{t('auth.or')}</Text>
          <View className="flex-1 h-px bg-gray-700" />
        </View>

        {/* Magic Link */}
        {magicLinkSent ? (
          <View className="items-center">
            <Text className="text-teal text-base font-semibold mb-1">
              {t('auth.checkYourEmail')}
            </Text>
            <Text className="text-gray-400 text-sm text-center">
              {t('auth.magicLinkSent', { email })}
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-4 mb-3 text-base"
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              accessibilityLabel={t('auth.emailPlaceholder')}
            />
            <TouchableOpacity
              className="w-full bg-soft-coral rounded-xl py-4 items-center"
              onPress={handleMagicLink}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('auth.sendMagicLink')}
            >
              {loading ? (
                <ActivityIndicator color="#121212" />
              ) : (
                <Text className="text-charcoal text-base font-semibold">
                  {t('auth.sendMagicLink')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* DEV ONLY: Skip to main app */}
        {__DEV__ && (
          <TouchableOpacity
            className="mt-8 py-3 px-6 rounded-lg border border-gray-600"
            onPress={() => {
              // Fake user/session to bypass auth + pairing gate (valid UUIDs)
              setAuth(
                { id: '00000000-0000-0000-0000-000000000001', email: 'dev@test.com' } as any,
                { access_token: 'dev-token' } as any,
                '00000000-0000-0000-0000-000000000010',
                '00000000-0000-0000-0000-000000000002',
              );
            }}
          >
            <Text className="text-gray-500 text-sm text-center">
              ⚡ Skip to Main (Dev)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
