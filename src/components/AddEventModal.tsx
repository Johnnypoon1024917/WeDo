import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { requestPermissions, syncEventToDevice } from '../services/deviceCalendarService';

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  day: string; // YYYY-MM-DD
}

export default function AddEventModal({ visible, onClose, day }: AddEventModalProps) {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);
  const isPremium = useAppStore((s) => s.isPremium);

  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
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

      // Attempt device calendar sync if toggle is enabled
      if (syncEnabled) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(t('common.ok'), t('calendar.permissionDenied'));
        } else {
          const result = await syncEventToDevice({
            title: trimmedTitle,
            date: day,
            time: time.trim() || undefined,
          });
          if (!result.success) {
            Alert.alert(t('common.error'), t('calendar.syncFailed'));
          }
        }
      }

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
    setSyncEnabled(false);
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

        {/* Sync to Device Calendar Toggle (Premium only) */}
        {isPremium && (
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{t('calendar.syncToDeviceCalendar')}</Text>
            <Switch
              value={syncEnabled}
              onValueChange={setSyncEnabled}
              trackColor={{ false: '#3E3E3E', true: '#FF7F50' }}
              thumbColor="#FFFFFF"
              accessibilityLabel={t('calendar.syncToDeviceCalendar')}
            />
          </View>
        )}

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
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  syncLabel: {
    color: '#D1D5DB',
    fontSize: 15,
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
