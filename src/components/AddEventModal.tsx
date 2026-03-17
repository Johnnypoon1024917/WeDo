import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  day: string; // YYYY-MM-DD
}

export default function AddEventModal({ visible, onClose, day }: AddEventModalProps) {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user || !relationshipId) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          relationship_id: relationshipId,
          day,
          title: trimmedTitle,
          time: time.trim() || null,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      handleClose();
    } catch {
      setError(t('calendar.failedSaveEvent'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setTime('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('calendar.eventTitle', { day })}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Title Input */}
        <TextInput
          style={styles.input}
          placeholder={t('calendar.eventTitlePlaceholder')}
          placeholderTextColor="#6B7280"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* Time Input */}
        <TextInput
          style={styles.input}
          placeholder={t('calendar.eventTimePlaceholder')}
          placeholderTextColor="#6B7280"
          value={time}
          onChangeText={setTime}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.saveButton, !title.trim() && styles.saveDisabled]}
          onPress={handleSave}
          disabled={!title.trim() || saving}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}


/* ── styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 12,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginTop: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#FF7F50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
