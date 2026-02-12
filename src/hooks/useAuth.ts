import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  return { session, isLoading, isAuthenticated: !!session };
}
