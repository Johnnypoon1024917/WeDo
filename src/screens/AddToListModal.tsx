import React, { useState } from 'react';
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
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

type Props = NativeStackScreenProps<RootStackParamList, 'AddToListModal'>;

export default function AddToListModal({ navigation, route }: Props) {
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);

  const prefilledUrl = route.params?.url ?? '';

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState(prefilledUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !saving;

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
      });

    setSaving(false);

    if (insertError) {
      setError('Save failed — please check your connection and try again');
      return;
    }

    navigation.goBack();
  };

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
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.headerTitle}>New Bucket List Item</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Sunset picnic at the beach"
          placeholderTextColor="#6B7280"
          autoFocus
          returnKeyType="next"
          maxLength={200}
          accessibilityLabel="Item title"
        />

        <Text style={[styles.label, styles.labelSpacing]}>URL (optional)</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://..."
          placeholderTextColor="#6B7280"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Item URL"
        />

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
          accessibilityLabel="Save bucket list item"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save</Text>
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
