import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function useSubscription() {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  return { isPro, isLoaded };
}
