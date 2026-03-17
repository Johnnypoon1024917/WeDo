import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import LocationSearch, { LocationResult } from '../components/LocationSearch';

type Props = NativeStackScreenProps<RootStackParamList, 'AddToListModal'>;

const FREE_ITEM_LIMIT = 10;

export default function AddToListModal({ navigation, route }: Props) {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);
  const isPremium = useAppStore((s) => s.isPremium);

  const prefilledUrl = route.params?.url ?? '';

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(prefilledUrl);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !saving;

  useEffect(() => {
    let cancelled = false;

    async function checkItemLimit() {
      if (isPremium || !relationshipId) {
        setCheckingLimit(false);
        return;
      }

      const { count, error: countError } = await supabase
        .from('bucket_list_items')
        .select('id', { count: 'exact' })
        .eq('relationship_id', relationshipId);

      if (cancelled) return;

      if (!countError && count !== null && count >= FREE_ITEM_LIMIT) {
        navigation.replace('PaywallModal');
        return;
      }

      setCheckingLimit(false);
    }

    checkItemLimit();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || !user || !relationshipId) return;

    setError(null);
    setSaving(true);

    const { error: insertError } = await supabase
      .from('bucket_list_items')
      .insert({
        relationship_id: relationshipId,
        title: title.trim(),
        url: url.trim() || null,
        completed: false,
        created_by: user.id,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        place_name: location?.place_name ?? null,
      });

    setSaving(false);

    if (insertError) {
      setError(t('addToList.saveFailed'));
      return;
    }

    navigation.goBack();
  };

  if (checkingLimit) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FF7F50" size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>

        <Text style={styles.headerTitle}>{t('addToList.newBucketListItem')}</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>{t('addToList.titleLabel')}</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder={t('addToList.titlePlaceholder')}
          placeholderTextColor="#6B7280"
          autoFocus
          returnKeyType="next"
          maxLength={200}
          accessibilityLabel={t('addToList.titleLabel')}
        />

        <Text style={[styles.label, styles.labelSpacing]}>{t('addToList.urlLabel')}</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder={t('addToList.urlPlaceholder')}
          placeholderTextColor="#6B7280"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel={t('addToList.urlLabel')}
        />

        <Text style={[styles.label, styles.labelSpacing]}>{t('addToList.locationLabel')}</Text>
        <LocationSearch onLocationSelect={setLocation} />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {/* Submit */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 50,
  },
  form: {
    flex: 1,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  labelSpacing: {
    marginTop: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: '#FF7F50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
