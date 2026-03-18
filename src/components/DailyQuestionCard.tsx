import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getDailyQuestion, Prompt } from '../services/dailyQuestionService';
import { markDiscussed } from '../services/streakService';
import { feedPet } from '../services/petService';

interface DailyQuestionCardProps {
  relationshipId: string;
  userId: string;
}

/**
 * Returns milliseconds until the next midnight UTC.
 */
function msUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.getTime() - now.getTime();
}

export default function DailyQuestionCard({
  relationshipId,
  userId,
}: DailyQuestionCardProps) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState<Prompt>(() =>
    getDailyQuestion(new Date()),
  );
  const [discussed, setDiscussed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refresh the daily question at midnight UTC
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function scheduleRefresh() {
      const ms = msUntilMidnightUTC();
      timer = setTimeout(() => {
        setQuestion(getDailyQuestion(new Date()));
        setDiscussed(false);
        scheduleRefresh();
      }, ms);
    }

    scheduleRefresh();
    return () => clearTimeout(timer);
  }, []);

  const handleMarkDiscussed = useCallback(async () => {
    if (discussed || loading) return;
    setLoading(true);
    try {
      await markDiscussed(relationshipId, userId);
      setDiscussed(true);
      feedPet(relationshipId, 20, 20).catch(() => {});
    } catch {
      // Silently fail — streak service handles retries internally
    } finally {
      setLoading(false);
    }
  }, [discussed, loading, relationshipId, userId]);

  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.label}>{t('connection.dailyQuestion')}</Text>
      <Text style={styles.category}>{question.category}</Text>
      <Text style={styles.questionText}>{question.prompt}</Text>
      <Pressable
        onPress={handleMarkDiscussed}
        disabled={discussed || loading}
        style={[
          styles.button,
          discussed && styles.buttonDiscussed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          discussed
            ? t('connection.discussed')
            : t('connection.markDiscussed')
        }
      >
        <Text
          style={[
            styles.buttonText,
            discussed && styles.buttonTextDiscussed,
          ]}
        >
          {discussed
            ? t('connection.discussed')
            : t('connection.markDiscussed')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(64, 224, 208, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(64, 224, 208, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: '#40E0D0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  category: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF7F50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  buttonDiscussed: {
    backgroundColor: 'rgba(64, 224, 208, 0.15)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextDiscussed: {
    color: '#40E0D0',
  },
});
