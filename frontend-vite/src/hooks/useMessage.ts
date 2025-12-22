import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSafeTimer } from './safe';
import { logger } from '../utils/logger';

/**
 * Direct hook for message/toast functionality using Zustand store.
 * Replaces the MessageContext wrapper for simpler, more direct state access.
 */
export function useMessage() {
  const message = useAppStore((s) => s.message);
  const storeShowMessage = useAppStore((s) => s.showMessage);
  const storeAddToast = useAppStore((s) => s.addToast);
  const storeClearMessage = useAppStore((s) => s.clearMessage);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { safeSetTimeout, clearTimeoutSafe, clearAll } = useSafeTimer();

  const showMessage = useCallback(
    (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
      clearTimeoutSafe(clearTimeoutRef.current);

      if (typeof storeShowMessage === 'function') {
        storeShowMessage(text, type);
      } else {
        logger.warn('[MessageContext] showMessage called but showMessage is not available on store');
      }
      if (typeof storeAddToast === 'function') {
        storeAddToast(text, type, 4000);
      } else {
        logger.warn('[MessageContext] addToast called but addToast is not available on store');
      }

      const timeoutId = safeSetTimeout(() => {
        if (typeof storeClearMessage === 'function') {
          storeClearMessage();
        } else {
          logger.warn('[MessageContext] clearMessage called but clearMessage is not available on store');
        }
      }, 5000);
      clearTimeoutRef.current = timeoutId;
    },
    [clearTimeoutSafe, safeSetTimeout, storeAddToast, storeClearMessage, storeShowMessage]
  );

  const addToast = useCallback(
    (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration: number = 5000) => {
      if (typeof storeAddToast === 'function') {
        storeAddToast(text, type, duration);
      } else {
        logger.warn('[MessageContext] addToast called but addToast is not available on store');
      }
    },
    [storeAddToast]
  );

  useEffect(
    () => () => {
      clearTimeoutSafe(clearTimeoutRef.current);
      clearAll();
    },
    [clearAll, clearTimeoutSafe]
  );

  return {
    message: message || { text: '', type: '' },
    showMessage,
    addToast
  };
}
