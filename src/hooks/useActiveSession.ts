import { useSessionStore } from '@/stores/sessionStore';

export function useActiveSession() {
  return useSessionStore();
}
