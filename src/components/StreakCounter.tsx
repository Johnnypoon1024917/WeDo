import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { getStreak, StreakData } from '../services/streakService';

interface StreakCounterProps {
  relationshipId: string;
}

export default function StreakCounter({ relationshipId }: StreakCounterProps) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialStreak() {
      const data: StreakData = await getStreak(relationshipId);
      if (!cancelled) {
        setStreak(data.current_streak);
      }
    }

    fetchInitialStreak();

    const channel = supabase
      .channel(`streak:${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_streaks',
          filter: `relationship_id=eq.${relationshipId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row && typeof row.current_streak === 'number') {
            setStreak(row.current_streak);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  const isActive = streak > 0;


  return (
    <View
      style={[styles.container, isActive ? styles.active : styles.dimmed]}
      accessibilityRole="text"
      accessibilityLabel={`Current streak: ${streak} days`}
    >
      <Text style={[styles.icon, !isActive && styles.iconDimmed]}>🔥</Text>
      <Text style={[styles.count, isActive ? styles.countActive : styles.countDimmed]}>
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  active: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
  },
  dimmed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  icon: {
    fontSize: 20,
    marginRight: 4,
  },
  iconDimmed: {
    opacity: 0.4,
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
  },
  countActive: {
    color: '#FF7F50',
  },
  countDimmed: {
    color: '#666',
  },
});
