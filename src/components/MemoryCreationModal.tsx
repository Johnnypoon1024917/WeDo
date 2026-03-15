import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { compress } from '../services/imageCompressor';

const MAX_CAPTION = 500;

interface MemoryCreationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MemoryCreationModal({
  visible,
  onClose,
}: MemoryCreationModalProps) {
  const user = useAppStore((s) => s.user);
  const relationshipId = useAppStore((s) => s.relationshipId);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── photo selection ── */

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
    }
  };

  const showPhotoPicker = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  /* ── validation ── */

  const captionTrimmed = caption.trim();
  const isValid = !!photoUri && captionTrimmed.length >= 1 && captionTrimmed.length <= MAX_CAPTION;

  /* ── submit ── */

  const handleSubmit = async () => {
    if (!isValid || !user || !relationshipId) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Compress photo
      const compressed = await compress(photoUri!);

      // 2. Generate entry ID
      const entryId = crypto.randomUUID();

      // 3. Upload to Supabase Storage
      const storagePath = `${relationshipId}/memories/${entryId}.jpg`;
      const response = await fetch(compressed.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('wedo-assets')
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from('wedo-assets')
        .getPublicUrl(storagePath);

      // 5. Insert memory record
      const { error: insertError } = await supabase.from('memories').insert({
        id: entryId,
        relationship_id: relationshipId,
        created_by: user.id,
        photo_url: urlData.publicUrl,
        caption: captionTrimmed,
        revealed: false,
      });

      if (insertError) throw insertError;

      // 6. Success — reset and close
      resetAndClose();
    } catch (err: any) {
      setError('Upload failed — please check your connection and try again');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── cancel / reset ── */

  const resetAndClose = () => {
    setPhotoUri(null);
    setCaption('');
    setError(null);
    onClose();
  };

  /* ── render ── */

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={resetAndClose} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>New Memory</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Photo */}
        <Pressable style={styles.photoArea} onPress={showPhotoPicker}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
            </View>
          )}
        </Pressable>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption…"
            placeholderTextColor="#6B7280"
            value={caption}
            onChangeText={setCaption}
            maxLength={MAX_CAPTION}
            multiline
          />
          <Text style={styles.charCount}>
            {captionTrimmed.length}/{MAX_CAPTION}
          </Text>
        </View>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Submit */}
        <Pressable
          style={[styles.submitButton, !isValid && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Create Memory</Text>
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

  /* photo */
  photoArea: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    color: '#6B7280',
    fontSize: 14,
  },

  /* caption */
  captionContainer: {
    marginTop: 16,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },

  /* error */
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },

  /* submit */
  submitButton: {
    backgroundColor: '#FF7F50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
