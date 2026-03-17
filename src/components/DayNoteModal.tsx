import React, { useEffect, useState } from 'react';
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

interface DayNoteModalProps {
  visible: boolean;
  onClose: () => void;
  day: string; // YYYY-MM-DD
}

export default function DayNoteModal({ visible, onClose, day }: DayNoteModalProps) {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);

  const [noteText, setNoteText] = useState('');
  const [existingNoteId, setExistingNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing note when modal opens
  useEffect(() => {
    if (!visible || !relationshipId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: fetchError } = await supabase
        .from('calendar_notes')
        .select('id, note_text')
        .eq('relationship_id', relationshipId)
        .eq('day', day)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setLoading(false);

      if (fetchError) {
        setError(t('calendar.failedLoadNote'));
        return;
      }

      if (data) {
        setNoteText(data.note_text);
        setExistingNoteId(data.id);
      } else {
        setNoteText('');
        setExistingNoteId(null);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, relationshipId, day]);

  const handleSave = async () => {
    if (!user || !relationshipId) return;

    const trimmed = noteText.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);

    try {
      if (existingNoteId) {
        // Update existing note
        const { error: updateError } = await supabase
          .from('calendar_notes')
          .update({ note_text: trimmed })
          .eq('id', existingNoteId);

        if (updateError) throw updateError;
      } else {
        // Insert new note
        const { error: insertError } = await supabase
          .from('calendar_notes')
          .insert({
            relationship_id: relationshipId,
            day,
            note_text: trimmed,
            created_by: user.id,
          });

        if (insertError) throw insertError;
      }

      handleClose();
    } catch {
      setError(t('calendar.failedSaveNote'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNoteText('');
    setExistingNoteId(null);
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
          <Text style={styles.title}>{t('calendar.noteTitle', { day })}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FF7F50" size="large" />
          </View>
        ) : (
          <>
            <TextInput
              style={styles.noteInput}
              placeholder={t('calendar.notePlaceholder')}
              placeholderTextColor="#6B7280"
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.saveButton, !noteText.trim() && styles.saveDisabled]}
              onPress={handleSave}
              disabled={!noteText.trim() || saving}
              accessibilityRole="button"
              accessibilityLabel={t('calendar.saveNote')}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveText}>{t('common.save')}</Text>
              )}
            </Pressable>
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
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
