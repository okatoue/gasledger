export const syncQueue = {
  async enqueue(operation: { table: string; action: string; data: unknown }) {
    // TODO: queue change for sync
  },
  async dequeue() {
    // TODO: get next pending change
    return null;
  },
  async clear() {
    // TODO: clear the queue
  },
};
