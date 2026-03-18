import { supabase } from '../lib/supabase';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '../store/appStore';

export interface PetState {
  petName: string;
  petHealth: number; // 0–100
  petTotalXp: number;
  petLastFedAt: string; // ISO timestamp
}

export type EvolutionStage = 'egg' | 'baby' | 'teen' | 'adult';

/**
 * Pure: compute health after time-based decay.
 * Reduces health by 15 for each full day elapsed since lastFedAt.
 * Result is clamped to a minimum of 0.
 */
export function decayHealth(
  currentHealth: number,
  lastFedAt: string,
  now: Date
): number {
  const lastFedDate = new Date(lastFedAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysBetween = Math.floor(
    (now.getTime() - lastFedDate.getTime()) / msPerDay
  );
  return Math.max(0, currentHealth - daysBetween * 15);
}

/**
 * Pure: derive evolution stage from cumulative XP.
 * egg: 0–99, baby: 100–499, teen: 500–999, adult: 1000+
 */
export function getEvolutionStage(totalXp: number): EvolutionStage {
  if (totalXp >= 1000) return 'adult';
  if (totalXp >= 500) return 'teen';
  if (totalXp >= 100) return 'baby';
  return 'egg';
}

/**
 * Pure: derive pet mood from current health.
 * sad if health < 30, happy if health >= 30
 */
export function getPetMood(health: number): 'happy' | 'sad' {
  return health < 30 ? 'sad' : 'happy';
}

/**
 * Pure: determine if an inactivity notification should be scheduled.
 * Returns true iff health === 0 AND full days since lastFedAt >= 7.
 */
export function shouldScheduleInactivityNotification(
  petHealth: number,
  lastFedAt: string,
  now: Date
): boolean {
  if (petHealth !== 0) return false;
  const lastFedDate = new Date(lastFedAt);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysBetween = Math.floor(
    (now.getTime() - lastFedDate.getTime()) / msPerDay
  );
  return daysBetween >= 7;
}

/**
 * Fetch pet state from Supabase, apply decay, persist if changed,
 * and schedule a notification if the pet has been neglected.
 */
export async function loadAndDecayPet(
  relationshipId: string
): Promise<PetState> {
  const { data, error } = await supabase
    .from('relationships')
    .select('pet_name, pet_health, pet_total_xp, pet_last_fed_at')
    .eq('id', relationshipId)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to load pet state: ${error?.message ?? 'no data'}`
    );
  }

  const now = new Date();
  const currentHealth: number = data.pet_health;
  const newHealth = decayHealth(currentHealth, data.pet_last_fed_at, now);

  if (newHealth !== currentHealth) {
    await supabase
      .from('relationships')
      .update({ pet_health: newHealth })
      .eq('id', relationshipId);
  }

  if (shouldScheduleInactivityNotification(newHealth, data.pet_last_fed_at, now)) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'WeDo',
          body: 'Your pet misses you both! 🥺',
        },
        trigger: null, // immediate
      });
    } catch {
      // Silently skip if notifications permissions denied or unavailable
    }
  }

  return {
    petName: data.pet_name,
    petHealth: newHealth,
    petTotalXp: data.pet_total_xp,
    petLastFedAt: data.pet_last_fed_at,
  };
}

/**
 * Apply a feeding action: increment health (capped 100) + XP,
 * update pet_last_fed_at, persist to Supabase, and update AppStore.
 */
export async function feedPet(
  relationshipId: string,
  healthBoost: number,
  xpBoost: number
): Promise<PetState> {
  const state = useAppStore.getState();
  const currentHealth = state.petHealth ?? 0;
  const currentXp = state.petTotalXp ?? 0;
  const currentName = state.petName ?? 'Buddy';

  const newHealth = Math.min(100, currentHealth + healthBoost);
  const newXp = currentXp + xpBoost;
  const newLastFedAt = new Date().toISOString();

  const { error } = await supabase
    .from('relationships')
    .update({
      pet_health: newHealth,
      pet_total_xp: newXp,
      pet_last_fed_at: newLastFedAt,
    })
    .eq('id', relationshipId);

  if (error) {
    throw new Error(`Failed to persist pet feed: ${error.message}`);
  }

  const updatedPetState: PetState = {
    petName: currentName,
    petHealth: newHealth,
    petTotalXp: newXp,
    petLastFedAt: newLastFedAt,
  };

  state.setPetState(updatedPetState);

  return updatedPetState;
}
