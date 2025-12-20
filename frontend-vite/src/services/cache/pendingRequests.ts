export function createPendingRequestTracker<T>() {
  const pending = new Map<string, Promise<T>>();

  function has(key: string): boolean {
    return pending.has(key);
  }

  function get(key: string): Promise<T> | null {
    return pending.get(key) ?? null;
  }

  function set(key: string, promise: Promise<T>): void {
    pending.set(key, promise);
    promise
      .finally(() => {
        pending.delete(key);
      })
      .catch(() => {
        // Swallow to avoid unhandled rejection warnings in fire-and-forget usage.
      });
  }

  function size(): number {
    return pending.size;
  }

  return {
    has,
    get,
    set,
    size,
  };
}
