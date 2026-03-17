import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/appStore';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

type Mode = 'choose' | 'create' | 'join' | 'success';

export default function PairingGateway() {
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
  const session = useAppStore((s) => s.session);
  const { t } = useTranslation();

  const [mode, setMode] = useState<Mode>('choose');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Confetti particles
  const confettiOpacity = useSharedValue(0);
  const confettiScale = useSharedValue(0.5);

  const showConfetti = useCallback(() => {
    confettiOpacity.value = withTiming(1, { duration: 300 });
    confettiScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    // Fade out after a bit
    confettiOpacity.value = withDelay(2000, withTiming(0, { duration: 600 }));
  }, []);

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
    transform: [{ scale: confettiScale.value }],
  }));

  const completePairing = useCallback(
    async (relationshipId: string, partnerId: string) => {
      if (user && session) {
        setAuth(user, session, relationshipId, partnerId);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showConfetti();
      setMode('success');
    },
    [user, session, setAuth, showConfetti],
  );

  const handleStartNewAdventure = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      const { error: insertError } = await supabase.from('pairing_codes').insert({
        code,
        created_by: user.id,
        expires_at: expiresAt,
        used: false,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setGeneratedCode(code);
      setMode('create');
    } catch (e: any) {
      setError(e.message ?? t('auth.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPartner = async () => {
    if (!user) return;
    const trimmed = joinCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError(t('pairing.enterCode'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Look up the code
      const { data: codeRecord, error: lookupError } = await supabase
        .from('pairing_codes')
        .select('*')
        .eq('code', trimmed)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (lookupError || !codeRecord) {
        setError(t('pairing.invalidCode'));
        setLoading(false);
        return;
      }

      const partnerId = codeRecord.created_by;

      // Create relationship
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .insert({
          user1_id: partnerId,
          user2_id: user.id,
        })
        .select('id')
        .single();

      if (relError || !relationship) {
        setError(relError?.message ?? t('pairing.failedCreateRelationship'));
        setLoading(false);
        return;
      }

      // Update both users' relationship_id
      await Promise.all([
        supabase
          .from('users')
          .update({ relationship_id: relationship.id })
          .eq('id', user.id),
        supabase
          .from('users')
          .update({ relationship_id: relationship.id })
          .eq('id', partnerId),
      ]);

      // Mark code as used
      await supabase
        .from('pairing_codes')
        .update({ used: true })
        .eq('id', codeRecord.id);

      await completePairing(relationship.id, partnerId);
    } catch (e: any) {
      setError(e.message ?? t('auth.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---

  if (mode === 'success') {
    return (
      <View className="flex-1 items-center justify-center bg-charcoal">
        <Animated.View style={confettiStyle} className="absolute inset-0 items-center justify-center">
          {/* Simple confetti representation */}
          {Array.from({ length: 20 }).map((_, i) => (
            <Animated.View
              key={i}
              entering={FadeIn.delay(i * 50).duration(300)}
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: i % 3 === 0 ? '#FF7F50' : i % 3 === 1 ? '#40E0D0' : '#FFD700',
                top: `${10 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
              }}
            />
          ))}
        </Animated.View>
        <Text className="text-soft-coral text-3xl font-bold" style={{ fontFamily: 'serif' }}>
          {t('pairing.paired')}
        </Text>
        <Text className="text-teal mt-2 text-base">
          {t('pairing.adventureBegins')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-charcoal px-8">
      <Text
        className="text-soft-coral text-3xl font-bold mb-2"
        style={{ fontFamily: 'serif' }}
      >
        {t('pairing.pairWithPartner')}
      </Text>
      <Text className="text-gray-400 text-base mb-10 text-center">
        {t('pairing.connectSubtitle')}
      </Text>

      {mode === 'choose' && (
        <>
          <TouchableOpacity
            className="w-full bg-soft-coral rounded-xl py-4 mb-3 items-center"
            onPress={handleStartNewAdventure}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('pairing.startNewAdventure')}
          >
            {loading ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text className="text-charcoal text-base font-semibold">
                {t('pairing.startNewAdventure')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full border border-teal rounded-xl py-4 items-center"
            onPress={() => { setMode('join'); setError(''); }}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('pairing.joinPartner')}
          >
            <Text className="text-teal text-base font-semibold">
              {t('pairing.joinPartner')}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'create' && (
        <View className="items-center">
          <Text className="text-gray-400 text-sm mb-4 text-center">
            {t('pairing.shareCodePrompt')}
          </Text>
          <Text
            className="text-teal text-4xl font-bold tracking-[8px] mb-6"
            accessibilityLabel={`Pairing code: ${generatedCode.split('').join(' ')}`}
          >
            {generatedCode}
          </Text>
          <Text className="text-gray-500 text-xs text-center">
            {t('pairing.codeExpires')}
          </Text>
          <TouchableOpacity
            className="mt-6"
            onPress={() => { setMode('choose'); setError(''); }}
            accessibilityRole="button"
          >
            <Text className="text-gray-400 text-sm underline">{t('pairing.goBack')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'join' && (
        <View className="w-full items-center">
          <TextInput
            className="w-full bg-gray-800 text-white text-center rounded-xl px-4 py-4 mb-4 text-2xl tracking-[6px]"
            placeholder={t('pairing.codePlaceholder')}
            placeholderTextColor="#6b7280"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            value={joinCode}
            onChangeText={setJoinCode}
            editable={!loading}
            accessibilityLabel={t('pairing.enterPairingCode')}
          />
          <TouchableOpacity
            className="w-full bg-soft-coral rounded-xl py-4 items-center"
            onPress={handleJoinPartner}
            disabled={loading || joinCode.trim().length !== 6}
            style={{ opacity: joinCode.trim().length === 6 ? 1 : 0.5 }}
            accessibilityRole="button"
            accessibilityLabel={t('pairing.join')}
          >
            {loading ? (
              <ActivityIndicator color="#121212" />
            ) : (
              <Text className="text-charcoal text-base font-semibold">{t('pairing.join')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-4"
            onPress={() => { setMode('choose'); setError(''); setJoinCode(''); }}
            accessibilityRole="button"
          >
            <Text className="text-gray-400 text-sm underline">{t('pairing.goBack')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>
      ) : null}
    </View>
  );
}
