import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

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
}));

export type { AppStore };
