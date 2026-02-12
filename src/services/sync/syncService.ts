import { supabase } from '@/config/supabase';
import { getDatabase } from '@/db/database';
import { sessionRepository } from '@/db/repositories/sessionRepository';
import { routePointRepository } from '@/db/repositories/routePointRepository';
import { settingsRepository } from '@/db/repositories/settingsRepository';
import { syncQueue } from './syncQueue';

// ─── Push helpers ────────────────────────────────────────────────

export const syncService = {
  /**
   * Upsert a completed session (+ route_points + tracking_gaps) to Supabase.
   * Fire-and-forget: errors are logged and queued, never thrown.
   */
  async syncSession(sessionId: string): Promise<void> {
    try {
      const session = await sessionRepository.getById(sessionId);
      if (!session || session.status === 'active') return;

      const { error: sessionError } = await supabase
        .from('sessions')
        .upsert({
          id: session.id,
          user_id: session.user_id,
          vehicle_id: session.vehicle_id,
          started_at_user: session.started_at_user,
          started_at_tracking: session.started_at_tracking,
          ended_at_user: session.ended_at_user,
          distance_m: session.distance_m,
          stopped_seconds: session.stopped_seconds,
          fuel_grade: session.fuel_grade,
          gas_price_value: session.gas_price_value,
          gas_price_unit: session.gas_price_unit,
          gas_price_currency: session.gas_price_currency,
          price_source: session.price_source,
          est_fuel_used: session.est_fuel_used,
          est_cost: session.est_cost,
          route_enabled: session.route_enabled === 1,
          route_points_count: session.route_points_count,
          notes: session.notes,
          status: session.status,
          created_at: session.created_at,
          updated_at: session.updated_at,
        }, { onConflict: 'id' });

      if (sessionError) throw sessionError;

      // Sync tracking gaps
      const db = await getDatabase();
      const gaps = await db.getAllAsync<{
        id: string;
        session_id: string;
        started_at: string;
        ended_at: string | null;
        reason: string | null;
      }>('SELECT * FROM tracking_gaps WHERE session_id = ?', [sessionId]);

      if (gaps.length > 0) {
        const { error: gapsError } = await supabase
          .from('tracking_gaps')
          .upsert(
            gaps.map((g) => ({
              id: g.id,
              session_id: g.session_id,
              started_at: g.started_at,
              ended_at: g.ended_at,
              reason: g.reason,
            })),
            { onConflict: 'id' },
          );
        if (gapsError) console.warn('[Sync] tracking_gaps upsert error:', gapsError.message);
      }

      // Sync route points in batches of 500
      const routePoints = await routePointRepository.getBySession(sessionId);
      for (let i = 0; i < routePoints.length; i += 500) {
        const batch = routePoints.slice(i, i + 500);
        const { error: rpError } = await supabase
          .from('route_points')
          .upsert(
            batch.map((rp) => ({
              id: rp.id,
              session_id: rp.session_id,
              timestamp: rp.timestamp,
              latitude: rp.latitude,
              longitude: rp.longitude,
              accuracy_m: rp.accuracy_m,
              speed_mps: rp.speed_mps,
            })),
            { onConflict: 'id' },
          );
        if (rpError) console.warn('[Sync] route_points batch upsert error:', rpError.message);
      }

      console.log('[Sync] Session synced:', sessionId);
    } catch (error) {
      console.warn('[Sync] syncSession failed, queuing:', (error as Error).message);
      await syncQueue.enqueue('sessions', sessionId, 'upsert').catch(() => {});
    }
  },

  /**
   * Delete a session from Supabase (cascade handles children).
   */
  async syncSessionDelete(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);
      if (error) throw error;
      console.log('[Sync] Session deleted remotely:', sessionId);
    } catch (error) {
      console.warn('[Sync] syncSessionDelete failed, queuing:', (error as Error).message);
      await syncQueue.enqueue('sessions', sessionId, 'delete').catch(() => {});
    }
  },

  /**
   * Upsert user settings to Supabase.
   */
  async syncSettings(userId: string): Promise<void> {
    try {
      const settings = await settingsRepository.get(userId);
      if (!settings) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          distance_unit: settings.distance_unit,
          volume_unit: settings.volume_unit,
          currency: settings.currency,
          route_storage_enabled: settings.route_storage_enabled === 1,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      console.log('[Sync] Settings synced for user:', userId);
    } catch (error) {
      console.warn('[Sync] syncSettings failed, queuing:', (error as Error).message);
      await syncQueue.enqueue('user_settings', userId, 'upsert').catch(() => {});
    }
  },

  /**
   * Delete all sessions for a user from Supabase (bulk privacy operation).
   */
  async deleteAllSessionsRemote(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      console.log('[Sync] All sessions deleted remotely for user:', userId);
    } catch (error) {
      console.warn('[Sync] deleteAllSessionsRemote failed:', (error as Error).message);
    }
  },

  // ─── Queue ──────────────────────────────────────────────────────

  /**
   * Process all pending sync queue entries in FIFO order.
   * Stops on first failure (likely offline).
   */
  async flushSyncQueue(): Promise<void> {
    const entries = await syncQueue.getAll();
    if (entries.length === 0) return;
    console.log(`[Sync] Flushing ${entries.length} queued entries`);

    for (const entry of entries) {
      try {
        if (entry.table_name === 'sessions' && entry.action === 'upsert') {
          await syncService.syncSession(entry.record_id);
        } else if (entry.table_name === 'sessions' && entry.action === 'delete') {
          await syncService.syncSessionDelete(entry.record_id);
        } else if (entry.table_name === 'user_settings' && entry.action === 'upsert') {
          await syncService.syncSettings(entry.record_id);
        }
        await syncQueue.remove(entry.id);
      } catch {
        console.warn('[Sync] Queue flush stopped at entry:', entry.id);
        break;
      }
    }
  },

  // ─── Pull (restore) ────────────────────────────────────────────

  /**
   * Restore sessions, route_points, tracking_gaps, and settings from Supabase
   * into local SQLite. Used on fresh install when no local sessions exist.
   */
  async restoreFromCloud(userId: string): Promise<void> {
    try {
      console.log('[Sync] Restoring from cloud for user:', userId);

      // 1. Restore settings
      const { data: remoteSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (remoteSettings) {
        await settingsRepository.upsert(userId, {
          distance_unit: remoteSettings.distance_unit,
          volume_unit: remoteSettings.volume_unit,
          currency: remoteSettings.currency,
          route_storage_enabled: remoteSettings.route_storage_enabled ? 1 : 0,
        });
      }

      // 2. Restore sessions
      const { data: remoteSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId);

      if (!remoteSessions || remoteSessions.length === 0) {
        console.log('[Sync] No remote sessions to restore');
        return;
      }

      const db = await getDatabase();

      for (const s of remoteSessions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO sessions (id, user_id, vehicle_id, started_at_user, started_at_tracking, ended_at_user, distance_m, stopped_seconds, fuel_grade, gas_price_value, gas_price_unit, gas_price_currency, price_source, est_fuel_used, est_cost, route_enabled, route_points_count, notes, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id, s.user_id, s.vehicle_id, s.started_at_user, s.started_at_tracking,
            s.ended_at_user, s.distance_m, s.stopped_seconds, s.fuel_grade,
            s.gas_price_value, s.gas_price_unit, s.gas_price_currency, s.price_source,
            s.est_fuel_used, s.est_cost, s.route_enabled ? 1 : 0,
            s.route_points_count, s.notes, s.status, s.created_at, s.updated_at,
          ],
        );
      }

      // 3. Restore tracking gaps
      const sessionIds = remoteSessions.map((s) => s.id);
      const { data: remoteGaps } = await supabase
        .from('tracking_gaps')
        .select('*')
        .in('session_id', sessionIds);

      if (remoteGaps && remoteGaps.length > 0) {
        for (const g of remoteGaps) {
          await db.runAsync(
            'INSERT OR REPLACE INTO tracking_gaps (id, session_id, started_at, ended_at, reason) VALUES (?, ?, ?, ?, ?)',
            [g.id, g.session_id, g.started_at, g.ended_at, g.reason],
          );
        }
      }

      // 4. Restore route points (batched fetch)
      for (const sessionId of sessionIds) {
        const { data: remotePoints } = await supabase
          .from('route_points')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true });

        if (remotePoints && remotePoints.length > 0) {
          await db.withTransactionAsync(async () => {
            for (const rp of remotePoints) {
              await db.runAsync(
                'INSERT OR REPLACE INTO route_points (id, session_id, timestamp, latitude, longitude, accuracy_m, speed_mps) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [rp.id, rp.session_id, rp.timestamp, rp.latitude, rp.longitude, rp.accuracy_m, rp.speed_mps],
              );
            }
          });
        }
      }

      console.log(`[Sync] Restored ${remoteSessions.length} sessions from cloud`);
    } catch (error) {
      console.error('[Sync] restoreFromCloud failed:', (error as Error).message);
    }
  },
};
