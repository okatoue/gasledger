const MIN_INTERVAL_MS = 10_000; // 10 seconds between searches

let lastSearchTimestamp = 0;

export function canSearch(): boolean {
  return Date.now() - lastSearchTimestamp >= MIN_INTERVAL_MS;
}

export function markSearched(): void {
  lastSearchTimestamp = Date.now();
}
