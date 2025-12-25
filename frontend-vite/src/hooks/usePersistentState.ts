import React from 'react';
import { logger } from '../utils/logger';

export interface UsePersistentStateOptions<T> {
  key: string;
  defaultValue: T;
  storage?: Storage;
  serialize?: (value: T) => string;
  deserialize?: (stored: string) => T;
}

export type PersistentStateReturn<T> = readonly [T, React.Dispatch<React.SetStateAction<T>>];

const getStorageFromOptions = (storage?: Storage) => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

/**
 * Persist any serializable value in localStorage (or provided Storage) with SSR safety.
 */
export function usePersistentState<T>({
  key,
  defaultValue,
  storage,
  serialize,
  deserialize
}: UsePersistentStateOptions<T>): PersistentStateReturn<T> {
  const serializeFn = React.useMemo(() => serialize ?? JSON.stringify, [serialize]);
  const deserializeFn = React.useMemo(
    () => deserialize ?? ((stored: string) => JSON.parse(stored) as T),
    [deserialize]
  );

  const getStorage = React.useCallback(() => getStorageFromOptions(storage), [storage]);

  const [value, setValue] = React.useState<T>(() => {
    const target = getStorage();
    if (!target) return defaultValue;
    try {
      const stored = target.getItem(key);
      return stored === null ? defaultValue : deserializeFn(stored);
    } catch (error) {
      logger.error('[usePersistentState] Failed to read value:', error);
      return defaultValue;
    }
  });

  React.useEffect(() => {
    const target = getStorage();
    if (!target) return;
    try {
      target.setItem(key, serializeFn(value));
    } catch (error) {
      logger.error('[usePersistentState] Failed to persist value:', error);
    }
  }, [key, value, serializeFn, getStorage]);

  return [value, setValue] as const;
}
