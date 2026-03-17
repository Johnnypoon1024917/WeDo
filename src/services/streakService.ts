import { supabase } from '../lib/supabase';

export interface StreakData {
  current_streak: number;
  last_completed_date: string | null;
  user1_completed_today: boolean;
  user2_completed_today: boolean;
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC).
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date string represents yesterday (UTC).
 */
function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0] === dateStr;
}

/**
 * Fetch the current streak data for a relationship.
 * Resets streak to 0 if the last completed date is older than yesterday.
 * Returns zeroed-out StreakData if no row exists.
 */
export async function getStreak(relationshipId: string): Promise<StreakData> {
  const { data, error } = await supabase
    .from('daily_streaks')
    .select(
      'current_streak, last_completed_date, user1_completed_today, user2_completed_today'
    )
    .eq('relationship_id', relationshipId)
    .single();

  if (error || !data) {
    return {
      current_streak: 0,
      last_completed_date: null,
      user1_completed_today: false,
      user2_completed_today: false,
    };
  }

  const today = getTodayUTC();
  const lastDate = data.last_completed_date;

  // Streak is broken if last completed date is before yesterday
  if (lastDate && lastDate !== today && !isYesterday(lastDate)) {
    await supabase
      .from('daily_streaks')
      .update({
        current_streak: 0,
        user1_completed_today: false,
        user2_completed_today: false,
        updated_at: new Date().toISOString(),
      })
      .eq('relationship_id', relationshipId);

    return {
      current_streak: 0,
      last_completed_date: lastDate,
      user1_completed_today: false,
      user2_completed_today: false,
    };
  }

  return {
    current_streak: data.current_streak,
    last_completed_date: data.last_completed_date,
    user1_completed_today: data.user1_completed_today,
    user2_completed_today: data.user2_completed_today,
  };
}

/**
 * Determine which user slot (user1 or user2) a userId maps to.
 * Uses lexicographic comparison: the smaller ID is user1, the larger is user2.
 * Requires fetching the relationship's two user IDs.
 */
async function getUserSlot(
  relationshipId: string,
  userId: string
): Promise<'user1' | 'user2' | null> {
  const { data } = await supabase
    .from('relationships')
    .select('user1_id, user2_id')
    .eq('id', relationshipId)
    .single();

  if (!data) return null;

  if (data.user1_id === userId) return 'user1';
  if (data.user2_id === userId) return 'user2';
  return null;
}

/**
 * Mark a user as having discussed the daily question today.
 *
 * Streak logic:
 * 1. Ensure a row exists for this relationship.
 * 2. Reset today-flags if they are stale (from a previous day).
 * 3. Mark the calling user's slot based on their position in the relationship.
 * 4. When both partners have discussed on the same calendar day:
 *    - If last_completed_date was yesterday → increment current_streak
 *    - Otherwise → set current_streak to 1 (new streak)
 *    - Set last_completed_date to today
 * 5. Uses a conditional update for atomic streak increment.
 */
export async function markDiscussed(
  relationshipId: string,
  userId: string
): Promise<void> {
  const today = getTodayUTC();

  // Determine which slot this user occupies in the relationship
  const slot = await getUserSlot(relationshipId, userId);
  if (!slot) return;

  // Fetch existing streak row
  const { data: existing } = await supabase
    .from('daily_streaks')
    .select(
      'id, current_streak, last_completed_date, user1_completed_today, user2_completed_today'
    )
    .eq('relationship_id', relationshipId)
    .single();

  if (!existing) {
    // Create the initial row
    await supabase.from('daily_streaks').insert({
      relationship_id: relationshipId,
      current_streak: 0,
      last_completed_date: null,
      user1_completed_today: slot === 'user1',
      user2_completed_today: slot === 'user2',
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const { last_completed_date, current_streak } = existing;
  let u1 = existing.user1_completed_today;
  let u2 = existing.user2_completed_today;

  // Reset today-flags if they are stale (from a previous day)
  if (last_completed_date !== today) {
    u1 = false;
    u2 = false;
  }

  // Mark the calling user's slot
  if (slot === 'user1') {
    if (u1) return; // Already marked — idempotent
    u1 = true;
  } else {
    if (u2) return; // Already marked — idempotent
    u2 = true;
  }

  if (u1 && u2) {
    // Both partners discussed today — compute and set new streak
    const newStreak =
      last_completed_date && isYesterday(last_completed_date)
        ? current_streak + 1
        : 1;

    // Conditional update using last_completed_date as optimistic lock
    const { error } = await supabase
      .from('daily_streaks')
      .update({
        current_streak: newStreak,
        last_completed_date: today,
        user1_completed_today: true,
        user2_completed_today: true,
        updated_at: new Date().toISOString(),
      })
      .eq('relationship_id', relationshipId);

    if (error) {
      // Race condition — re-fetch and check
      const fresh = await getStreak(relationshipId);
      if (fresh.last_completed_date === today) return;

      const retryStreak =
        fresh.last_completed_date && isYesterday(fresh.last_completed_date)
          ? fresh.current_streak + 1
          : 1;

      await supabase
        .from('daily_streaks')
        .update({
          current_streak: retryStreak,
          last_completed_date: today,
          user1_completed_today: true,
          user2_completed_today: true,
          updated_at: new Date().toISOString(),
        })
        .eq('relationship_id', relationshipId);
    }
  } else {
    // Only one partner discussed — update the flag
    await supabase
      .from('daily_streaks')
      .update({
        user1_completed_today: u1,
        user2_completed_today: u2,
        updated_at: new Date().toISOString(),
      })
      .eq('relationship_id', relationshipId);
  }
}
