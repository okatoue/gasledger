import '@/services/tracking/backgroundTask';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/config/supabase';
import { vehicleService } from '@/services/vehicle/vehicleService';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { useSessionStore } from '@/stores/sessionStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { trackingService } from '@/services/tracking/trackingService';
import { syncService } from '@/services/sync/syncService';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (session) {
      vehicleService.countByUser(session.user.id).then((count) => {
        setNeedsOnboarding(count === 0);
      });
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (!session && inAuthGroup && (segments as string[])[1] === 'onboarding') {
      router.replace('/(auth)');
    } else if (session && needsOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (session && !needsOnboarding && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, needsOnboarding, segments]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { isReady: dbReady } = useDatabase();
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user settings from SQLite when both DB and session are ready
  const session = useAuthStore((s) => s.session);
  useEffect(() => {
    if (!dbReady || !session) return;
    useSettingsStore.getState().loadSettings(session.user.id);
  }, [dbReady, session]);

  // Sync: flush queue on startup + restore from cloud on fresh install
  useEffect(() => {
    if (!dbReady || !session) return;
    const userId = session.user.id;

    (async () => {
      // Flush any queued sync operations from previous offline session
      await syncService.flushSyncQueue().catch(console.error);

      // Check if this is a fresh install (no local sessions)
      const localSessions = await sessionRepository.getByUser(userId, 1);
      if (localSessions.length === 0) {
        await syncService.restoreFromCloud(userId);
        // Reload settings after restore
        await useSettingsStore.getState().loadSettings(userId);
      }
    })();
  }, [dbReady, session]);

  // Recover interrupted sessions on app restart
  useEffect(() => {
    if (!dbReady) return;
    sessionRepository.getActiveSession().then((activeSession) => {
      if (!activeSession) return;
      const store = useSessionStore.getState();
      store.setActiveSession(activeSession.id);
      store.updateStats({
        distanceM: activeSession.distance_m,
        stoppedSeconds: activeSession.stopped_seconds,
        elapsedSeconds: 0,
      });
      trackingService.isTracking().then((running: boolean) => {
        store.setTracking(running);
        if (!running) store.setGpsSignal('lost');
      });
    });
  }, [dbReady]);

  if (!dbReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGate>
        <Slot />
      </AuthGate>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
