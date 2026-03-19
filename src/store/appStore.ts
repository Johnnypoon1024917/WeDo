import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import type { PetState } from '../services/petService';

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface AppStore {
  // Auth
  user: User | null;
  session: Session | null;
  relationshipId: string | null;
  partnerId: string | null;
  setAuth: (user: User, session: Session, relationshipId?: string | null, partnerId?: string | null) => void;
  clearAuth: () => void;

  // Premium
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;

  // Privacy Vault
  isVaultEnabled: boolean;
  isVaultLocked: boolean;
  setVaultEnabled: (value: boolean) => void;
  setVaultLocked: (value: boolean) => void;

  // Realtime connection status
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Relationship metadata
  relationshipStartDate: string | null;
  setRelationshipStartDate: (date: string) => void;

  // Pet state
  petName: string | null;
  petHealth: number;
  petTotalXp: number;
  petLastFedAt: string | null;
  setPetState: (state: PetState) => void;

  // Food inventory
  inventoryFood: number;
  setInventoryFood: (value: number) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth
  user: null,
  session: null,
  relationshipId: null,
  partnerId: null,
  setAuth: (user, session, relationshipId = null, partnerId = null) =>
    set({ user, session, relationshipId, partnerId }),
  clearAuth: () =>
    set({
      user: null,
      session: null,
      relationshipId: null,
      partnerId: null,
    }),

  // Premium
  isPremium: false,
  setIsPremium: (value) => set({ isPremium: value }),

  // Privacy Vault
  isVaultEnabled: false,
  isVaultLocked: false,
  setVaultEnabled: (value) => set({ isVaultEnabled: value }),
  setVaultLocked: (value) => set({ isVaultLocked: value }),

  // Realtime connection status
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // Relationship metadata
  relationshipStartDate: null,
  setRelationshipStartDate: (date) => set({ relationshipStartDate: date }),

  // Pet state
  petName: null,
  petHealth: 0,
  petTotalXp: 0,
  petLastFedAt: null,
  setPetState: (state) =>
    set({
      petName: state.petName,
      petHealth: state.petHealth,
      petTotalXp: state.petTotalXp,
      petLastFedAt: state.petLastFedAt,
    }),

  // Food inventory
  inventoryFood: 0,
  setInventoryFood: (value) => set({ inventoryFood: value }),
}));

export type { AppStore };
