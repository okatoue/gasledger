import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setNeedsOnboarding: (needsOnboarding: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  needsOnboarding: true,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),
}));
