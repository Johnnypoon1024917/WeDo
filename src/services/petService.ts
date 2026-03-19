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

// ─── Linked Companions: Types ───────────────────────────────────────────────

export type Archetype = 'cat' | 'dog' | 'bunny' | 'bear';
export type Personality = 'energetic' | 'grumpy' | 'sleepy' | 'shy';
export type InteractionType = 'poke' | 'hug' | 'feed' | 'kiss';

export interface Pet {
  id: string;
  user_id: string;
  relationship_id: string;
  name: string;
  archetype: Archetype;
  color_hex: string;
  personality: Personality;
  health: number;
  created_at: string;
  updated_at: string;
}

// ─── Linked Companions: Validation ──────────────────────────────────────────

const VALID_ARCHETYPES: ReadonlySet<string> = new Set(['cat', 'dog', 'bunny', 'bear']);
const VALID_PERSONALITIES: ReadonlySet<string> = new Set(['energetic', 'grumpy', 'sleepy', 'shy']);
const COLOR_HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isValidArchetype(value: string): boolean {
  return VALID_ARCHETYPES.has(value);
}

export function isValidPersonality(value: string): boolean {
  return VALID_PERSONALITIES.has(value);
}

export function isValidColorHex(value: string): boolean {
  return COLOR_HEX_REGEX.test(value);
}

// ─── Linked Companions: Helpers ─────────────────────────────────────────────

const ARCHETYPE_EMOJI: Record<Archetype, string> = {
  cat: '🐱',
  dog: '🐶',
  bunny: '🐰',
  bear: '🐻',
};

export function archetypeToEmoji(archetype: Archetype): string {
  return ARCHETYPE_EMOJI[archetype];
}

const INTERACTION_VERBS: Record<InteractionType, string> = {
  poke: 'poked',
  hug: 'hugged',
  feed: 'fed',
  kiss: 'kissed',
};

export function formatInteractionStatus(type: InteractionType, petName: string): string {
  return `Partner ${INTERACTION_VERBS[type]} your ${petName}!`;
}

// ─── Linked Companions: CRUD ────────────────────────────────────────────────

/**
 * Fetch all pets belonging to a relationship.
 */
export async function fetchPetsForRelationship(relationshipId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('relationship_id', relationshipId);

  if (error) {
    throw new Error(`Failed to fetch pets: ${error.message}`);
  }

  return (data as Pet[]) ?? [];
}

/**
 * Create a new pet for the authenticated user.
 * Validates inputs before inserting. Handles duplicate user_id (Postgres 23505).
 */
export async function createPet({
  name,
  archetype,
  color_hex,
  personality,
  relationshipId,
}: {
  name: string;
  archetype: string;
  color_hex: string;
  personality: string;
  relationshipId: string;
}): Promise<Pet> {
  if (!isValidArchetype(archetype)) {
    throw new Error(`Invalid archetype: ${archetype}. Must be one of cat, dog, bunny, bear.`);
  }
  if (!isValidPersonality(personality)) {
    throw new Error(`Invalid personality: ${personality}. Must be one of energetic, grumpy, sleepy, shy.`);
  }
  if (!isValidColorHex(color_hex)) {
    throw new Error(`Invalid color_hex: ${color_hex}. Must match #RRGGBB format.`);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Unable to determine authenticated user.');
  }

  const { data, error } = await supabase
    .from('pets')
    .insert({
      user_id: userData.user.id,
      relationship_id: relationshipId,
      name,
      archetype,
      color_hex,
      personality,
      health: 100,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already have a pet');
    }
    throw new Error(`Failed to create pet: ${error.message}`);
  }

  return data as Pet;
}

// ─── Linked Companions: Health ──────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure: compute decayed health for a Pet based on its `updated_at` timestamp.
 * Reduces health by 15 for each full day elapsed since `updated_at`.
 * If `updated_at` is in the future (clock skew), decay is 0.
 * Result is clamped to a minimum of 0.
 */
export function decayPetHealth(pet: Pet, now: Date): number {
  const updatedAt = new Date(pet.updated_at);
  const elapsed = now.getTime() - updatedAt.getTime();
  if (elapsed < 0) return pet.health;
  const daysSinceUpdate = Math.floor(elapsed / MS_PER_DAY);
  return Math.max(0, pet.health - 15 * daysSinceUpdate);
}

/**
 * Fetch a pet's current health from the DB, boost it by `amount` (capped at 100),
 * and persist the new health along with an updated `updated_at` timestamp.
 */
export async function boostPetHealth(petId: string, amount: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('pets')
    .select('health')
    .eq('id', petId)
    .single();

  if (fetchError || !data) {
    throw new Error(`Failed to fetch pet health: ${fetchError?.message ?? 'no data'}`);
  }

  const newHealth = Math.min(100, (data.health as number) + amount);

  const { error: updateError } = await supabase
    .from('pets')
    .update({ health: newHealth, updated_at: new Date().toISOString() })
    .eq('id', petId);

  if (updateError) {
    throw new Error(`Failed to update pet health: ${updateError.message}`);
  }
}

// ─── Linked Companions: Assignment ──────────────────────────────────────────

/**
 * Given an array of pets and the current user's ID, return the user's own pet
 * and the partner's pet. Either may be null if no matching pet exists.
 */
export function assignPets(
  pets: Pet[],
  currentUserId: string
): { myPet: Pet | null; partnerPet: Pet | null } {
  const myPet = pets.find((p) => p.user_id === currentUserId) ?? null;
  const partnerPet = pets.find((p) => p.user_id !== currentUserId) ?? null;
  return { myPet, partnerPet };
}
