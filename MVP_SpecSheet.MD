## MVP Spec Sheet — Driving Session Fuel Cost Tracker (iOS + Android)

### 1) Product overview

A cross-platform mobile app that lets users track “driving sessions” and estimates fuel cost per session using:

* GPS-derived distance (and optional route recording)
* time spent stopped (derived from GPS speed/accuracy rules)
* vehicle fuel efficiency
* gas price per session

Users can review and edit past sessions and export their session history.

---

## 2) MVP goals

1. Make it fast and reliable to record a trip: **Start → Drive → Stop → Save**
2. Provide a clear, editable estimate: **Fuel used + cost**
3. Support real-world usage: phone locked, app backgrounded, intermittent GPS
4. Keep user trust: transparent permissions, privacy controls, and deletion options

---

## 3) In-scope MVP features

### A) Accounts & sync (Day 1)

* Sign in with:

  * Apple
  * Google
  * Email + password
* Local-first storage (works offline)
* Automatic cloud sync when online (single-user, multi-device restore)

### B) Vehicle profiles

Users can add and manage multiple vehicles.

**Vehicle add options**

* Enter VIN (optional) to prefill vehicle information (make/model/year)
* Or enter make, model, year manually

**Fuel efficiency (required)**

* The app attempts to autofill fuel efficiency from a dataset/API using vehicle details
* If multiple matches exist, the user selects the correct one
* Manual entry is always available as a fallback

**Fuel type & grades**

* Support:

  * Gasoline: Regular, Midgrade, Premium
  * Diesel
  * “Other” (optional fallback)
* Each vehicle has a default fuel grade
* Users can override fuel grade per session

### C) Driving sessions (manual start/stop)

Users manually start and stop sessions.

**Tracking during a session**

* Track GPS locations during an active session to compute:

  * distance traveled
  * stopped time (see definition below)
* Optional route recording:

  * Users can enable/disable storing route points (“Save route details” toggle)
  * Regardless of route storage, the app always stores session totals

**Works while phone is locked / app is backgrounded**

* The app supports two modes based on location permission:

  * **Full Tracking (Recommended):** continues tracking reliably in background during an active session
  * **Limited Mode:** tracking may pause unless the app remains active

**If tracking pauses**

* The app shows “Tracking paused” and records a gap (no silent undercounting)

**If the user force-kills the app**

* Background tracking stops until the user reopens the app
* The session remains in a paused state until resumed or ended

### D) Gas price per session (manual)

* User enters gas price for the session (e.g., $/L or $/gal)
* App remembers the last price **per fuel grade** and suggests it next time
* User can edit the gas price during or after the session
* Currency and units are auto-selected based on locale, with manual override

### E) Session history & editing

* Session list (by date)
* Session detail view includes:

  * start/end time
  * distance
  * duration
  * stopped time
  * gas price used
  * estimated fuel used
  * estimated cost
  * notes
* Edit a session:

  * vehicle used
  * fuel grade
  * gas price
  * notes
* Recompute fuel/cost automatically after edits

### F) Export

* Export session history as CSV
* Export supports:

  * date range selection
  * optional filtering by vehicle

### G) Privacy, deletion, and user controls

* Toggle: “Save route details (precise location)”
* Delete a single session (and its route, if recorded)
* Delete all local data
* **Delete account + delete cloud data** (full deletion flow)

---

## 4) Out-of-scope (explicitly not MVP)

These are planned for later versions:

* Automatic session start/stop using Bluetooth or motion detection
* “Home gas station” price suggestions and automatic price fetching
* Family plan (roles, shared history, per-driver cost breakdown)
* Mileage reimbursement mode (distance × rate)
* Idle fuel burn modeling (fuel used from idling vs driving)

---

## 5) Key user flows (MVP)

### Flow 1 — First-time setup

1. Sign in
2. Add vehicle (VIN optional)
3. Confirm/enter fuel efficiency
4. Choose whether to save route details
5. Choose location mode:

   * Full Tracking (recommended)
   * Limited mode

### Flow 2 — Record a driving session

1. Tap **Start session**
2. Select vehicle (defaults to last used)
3. Confirm fuel grade (defaults to vehicle)
4. Confirm gas price (defaults to last used for that grade)
5. Drive (tracking runs in background during session)
6. Tap **Stop**
7. Review summary → Save

### Flow 3 — Edit a session

1. Open session from history
2. Edit gas price / grade / vehicle / notes
3. Save (totals update automatically)

### Flow 4 — Export

1. Choose date range + vehicle filter
2. Export CSV

### Flow 5 — Delete account

1. User requests deletion
2. App confirms and deletes cloud + local data
3. User is signed out

---

## 6) Definitions & calculations

### A) Distance calculation

* Distance is computed from GPS location points gathered during the session
* Points are filtered by accuracy and sanity checks to reduce GPS jumps/drift
* Distance is the sum of accepted point-to-point segment distances

### B) Stopped time (“idle time” in MVP)

MVP defines stopped time as:

* speed below a small threshold (e.g., < ~2 km/h)
* sustained for a short duration (e.g., > ~15–20 seconds)
* only counted when GPS accuracy is acceptable

This is reported as **stopped time**, not guaranteed engine idling.

### C) Fuel used (estimate)

* Fuel used is computed using distance and vehicle fuel efficiency
* Efficiency supports common formats (MPG, L/100km) normalized internally

### D) Cost (estimate)

* Estimated cost = estimated fuel used × gas price (confirmed for that session)

---

## 7) Location permissions & background tracking (MVP)

### Permission strategy (recommended)

* Request location permission at onboarding
* When the user starts their first session, show a “tracking reliability” modal:

  * Full Tracking (recommended): requires background-capable authorization
  * Limited mode: may pause when the app is not considered “in use”

### User-facing behavior

* If permissions allow background tracking, sessions continue while the phone is locked
* If not, the app warns the user and visibly indicates when tracking pauses

---

## 8) Data model (high-level)

### User

* id
* auth provider(s)
* settings:

  * units (mi/km, L/gal)
  * currency
  * route_storage_enabled

### Vehicle

* id, user_id
* vin (optional)
* make, model, year
* fuel_type (gas/diesel)
* default_fuel_grade
* efficiency_value + efficiency_unit
* efficiency_source: dataset | manual
* last_price_by_grade: map grade → price + unit + currency

### Session

* id, user_id, vehicle_id
* timestamps:

  * started_at_user (Start button press)
  * started_at_tracking (first good GPS fix)
  * ended_at_user (Stop button press)
* totals:

  * distance_m
  * stopped_seconds
* fuel:

  * fuel_grade
  * gas_price_confirmed (price + unit + currency)
  * price_source (manual / edited)
  * est_fuel_used
  * est_cost
* route:

  * route_enabled (true/false for that session)
  * route_points_count
* notes
* tracking gaps (optional):

  * list of paused intervals with timestamps

### RoutePoint (only if route_enabled)

* session_id
* timestamp
* lat/lng
* accuracy_m
* speed_mps

---

## 9) Technical considerations (MVP)

### GPS + battery

* Adaptive sampling: more frequent while moving, reduced while stopped
* Accuracy-based filtering to reduce drift
* Route compression may be used for storage efficiency

### Offline-first + sync

* Sessions and vehicles are stored locally immediately
* Sync runs when online
* Conflict strategy (MVP):

  * last-write-wins for edits
  * avoid simultaneous edits by locking a session during active edit (optional)

### Data deletion

* Deleting account triggers deletion of cloud data and local data

---

## 10) Risks & edge cases (MVP)

* GPS drift in urban areas → accuracy filtering + jump rejection
* Tunnels/garages → tracking gaps
* User denies background-capable permission → limited mode warnings
* User force-kills app → tracking stops; session becomes paused
* Vehicle efficiency mismatch → trim selection UI + manual override
* Wrong gas price entered → editable after session

---

## 11) MVP success criteria

* User can create a vehicle and record a session end-to-end in under 60 seconds
* Sessions continue tracking during lock screen in Full Tracking mode
* History editing is simple and recalculations are correct
* CSV export works reliably
* Users can delete sessions and delete account cleanly