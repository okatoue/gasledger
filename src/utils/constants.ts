// GPS tracking constants
export const GPS_SAMPLING_INTERVAL_MOVING_MS = 3000;
export const GPS_SAMPLING_INTERVAL_STOPPED_MS = 10000;
export const MIN_DISTANCE_THRESHOLD_M = 5;
export const MIN_ACCURACY_M = 50; // accept points up to 50m accuracy
export const ACCURACY_GOOD_M = 30; // UI: green signal
export const ACCURACY_WEAK_M = 50; // UI: yellow signal; above = red/lost
export const SPEED_STOPPED_THRESHOLD_MPS = 0.5; // ~2 km/h
export const STOPPED_DURATION_THRESHOLD_S = 15;
export const MAX_SPEED_JUMP_MPS = 80; // ~288 km/h
export const GAP_TIME_THRESHOLD_S = 30; // time gap above which distance is not accumulated
export const GAP_DETECTION_MIN_POINTS = 3; // don't flag gaps until GPS has warmed up

// Background task name
export const BACKGROUND_LOCATION_TASK = 'background-location-task';
