# GPS Tracking + Session Persistence

## Context
The app has a polished dashboard UI with start/stop buttons, a live session display, and all the tracking infrastructure scaffolded (location processor, stopped time detector, distance calculator, constants, DB schema, session store). But nothing is wired together — the tracking services are empty TODOs, sessions only live in memory, and there's no summary screen. This plan connects all the pieces into a working end-to-end drive flow.

## Existing code to reuse
- `src/services/tracking/locationProcessor.ts` — accuracy gate, min-distance filter, speed-jump rejection (fully implemented)
- `src/services/tracking/distanceCalculator.ts` — haversine function (fully implemented)
- `src/services/tracking/stoppedTimeDetector.ts` — speed threshold + duration gate (fully implemented)
- `src/utils/constants.ts` — all GPS tuning constants defined
- `src/stores/sessionStore.ts` — Zustand store with all fields/actions
- `src/db/schema.ts` — sessions, route_points, tracking_gaps tables ready
- `src/db/repositories/vehicleRepository.ts` — pattern to follow for DB ops (Crypto.randomUUID, getDatabase, runAsync)
- `app/(tabs)/index.tsx` — dashboard with handleStartDrive/handleStopDrive stubs

## Implementation steps (in order)

### Step 1: Session repository CRUD
**File:** `src/db/repositories/sessionRepository.ts`

Implement following `vehicleRepository.ts` pattern:
- `create(input)` — INSERT with status='active', started_at_user=now, return id
- `setTrackingStarted(sessionId)` — SET started_at_tracking
- `updateTracking(sessionId, {distanceM, stoppedSeconds, routePointsCount})` — periodic persist during drive
- `complete(sessionId, {distanceM, stoppedSeconds, estFuelUsed, estCost, routePointsCount})` — SET status='completed', ended_at_user=now
- `getById(sessionId)` — SELECT single session
- `getActiveSession()` — SELECT WHERE status='active' LIMIT 1 (crash recovery)
- `getByUser(userId, limit, offset)` — for history screen later
- `updateNotes(sessionId, notes)` — for summary screen

### Step 2: Route point repository
**File:** `src/db/repositories/routePointRepository.ts`

- `insertBatch(sessionId, points[])` — batch INSERT in a transaction
- `getBySession(sessionId)` — for future map display
- `deleteBySession(sessionId)` — for session deletion

### Step 3: Location permission hook
**File:** `src/hooks/useLocationPermission.ts`

Replace stub with real expo-location permissions:
- Check foreground + background permission status on mount
- `requestForeground()` / `requestBackground()` — two-step flow (required by iOS/Android)
- Expose `permissionLevel: 'none' | 'foreground' | 'background'`

### Step 4: Location update handler (NEW)
**File:** `src/services/tracking/locationUpdateHandler.ts`

Central processing pipeline — called by both foreground and background location updates:
- Module-level state (not React — background task can't access components)
- `initSession(sessionId, routeEnabled)` — reset processors, init state
- `processLocationUpdate(raw)` — run through locationProcessor → accumulate distance via haversine → processSpeedUpdate → update sessionStore via getState() → batch queue route points → periodically persist to DB
- `teardownSession()` — flush pending route points, return final totals
- Updates GPS signal indicator based on accuracy

### Step 5: Background task registration (NEW)
**File:** `src/services/tracking/backgroundTask.ts`

- `TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ...)` at module level
- Receives location updates, calls `processLocationUpdate()` for each
- Must be imported in `app/_layout.tsx` top-level to register before any component renders

### Step 6: Platform tracking services
**Files:** `src/services/tracking/trackingService.ios.ts`, `trackingService.android.ts`, `trackingService.ts` (interface)

- Update interface: `stopTracking()` returns `{ distanceM, stoppedSeconds, routePointCount }`
- iOS: `Location.startLocationUpdatesAsync` with BestForNavigation, activityType=AutomotiveNavigation, showsBackgroundLocationIndicator
- Android: same but with `foregroundService` notification config (required for Android 10+)
- Both call `initSession`/`teardownSession` from locationUpdateHandler

### Step 7: useTracking hook
**File:** `src/hooks/useTracking.ts`

Session lifecycle orchestrator:
- `startTracking({userId, vehicleId, fuelGrade, gasPrice, ...})`:
  1. Request permissions (foreground required, background attempted)
  2. Create session in DB via sessionRepository
  3. Update sessionStore
  4. Call trackingService.startTracking()
- `stopTracking(efficiencyMpg, gasPrice)`:
  1. Call trackingService.stopTracking() → get totals
  2. Calculate fuel used & cost
  3. Complete session in DB
  4. Navigate to summary screen
  5. Reset sessionStore

### Step 8: Wire dashboard
**File:** `app/(tabs)/index.tsx`

- Import and use `useTracking` hook
- `handleStartDrive`: call `startTracking()` with vehicle/price/session data, show alert if permission denied
- `handleStopDrive`: call `stopTracking()` with efficiency and gas price
- Register background task: add `import '@/services/tracking/backgroundTask'` in `app/_layout.tsx`

### Step 9: Fuel calculator
**File:** `src/services/fuel/fuelCalculator.ts`

Fill in stub — support mpg, l/100km, km/l conversions.

### Step 10: Session summary screen
**File:** `app/session/summary.tsx`

- Read sessionId from route params
- Fetch session from sessionRepository.getById()
- Display: cost, distance, duration, stopped time, fuel used, gas price, fuel grade
- Notes text input with save
- "Done" button → navigate to dashboard

## Verification
1. Open app, sign in, see dashboard with vehicle
2. Tap "START DRIVE" → permission dialog appears → accept
3. Drive (or walk) — distance and cost update live on dashboard
4. GPS signal indicator reflects actual accuracy
5. Tap "STOP" → confirmation → summary screen shows trip stats
6. Tap "Done" → back to dashboard
7. Lock phone during active session → tracking continues (background mode)
8. Force-kill app during session → reopen → session state recovered
