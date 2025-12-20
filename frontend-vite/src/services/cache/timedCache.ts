export type NowFn = () => number;

type Entry<T> = {
  value: T;
  timestamp: number;
};

type TimedCacheOptions = {
  expirationMs: number;
  maxSize: number;
  now?: NowFn;
};

export function createTimedCache<T>(options: TimedCacheOptions) {
  const now: NowFn = options.now ?? (() => Date.now());
  const entries = new Map<string, Entry<T>>();

  function evictOldestIfNeeded() {
    if (entries.size < options.maxSize) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    entries.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      entries.delete(oldestKey);
    }
  }

  function get(key: string): T | null {
    const entry = entries.get(key);
    if (!entry) return null;

    if (now() - entry.timestamp > options.expirationMs) {
      entries.delete(key);
      return null;
    }

    return entry.value;
  }

  function set(key: string, value: T): void {
    evictOldestIfNeeded();
    entries.set(key, { value, timestamp: now() });
  }

  function del(key: string): void {
    entries.delete(key);
  }

  function clear(): void {
    entries.clear();
  }

  function size(): number {
    return entries.size;
  }

  return {
    get,
    set,
    delete: del,
    clear,
    size,
  };
}
