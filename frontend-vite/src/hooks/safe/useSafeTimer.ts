import { useCallback, useRef } from 'react';

import { logger } from '@/utils/logger';

export function useSafeTimer() {
    const intervalsRef = useRef(new Set<ReturnType<typeof setInterval>>());
    const timeoutsRef = useRef(new Set<ReturnType<typeof setTimeout>>());
    const mountedRef = useRef(true);

    const clearAll = useCallback(() => {
        mountedRef.current = false;

        intervalsRef.current.forEach(intervalId => {
            clearInterval(intervalId);
        });
        intervalsRef.current.clear();

        timeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        timeoutsRef.current.clear();
    }, []);

    const safeSetInterval = useCallback((callback: () => void, delay: number): ReturnType<typeof setInterval> | null => {
        if (!mountedRef.current) return null;

        const intervalId = setInterval(() => {
            if (mountedRef.current) {
                try {
                    callback();
                } catch (error) {
                    logger.warn('[useSafeTimer] Interval callback error:', error);
                }
            }
        }, delay);

        intervalsRef.current.add(intervalId);
        return intervalId;
    }, []);

    const safeSetTimeout = useCallback((callback: () => void, delay: number): ReturnType<typeof setTimeout> | null => {
        if (!mountedRef.current) return null;

        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                try {
                    callback();
                } catch (error) {
                    logger.warn('[useSafeTimer] Timeout callback error:', error);
                }
            }
        }, delay);

        timeoutsRef.current.add(timeoutId);
        return timeoutId;
    }, []);

    const clearIntervalSafe = useCallback((intervalId: ReturnType<typeof setInterval> | null) => {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalsRef.current.delete(intervalId);
        }
    }, []);

    const clearTimeoutSafe = useCallback((timeoutId: ReturnType<typeof setTimeout> | null) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutsRef.current.delete(timeoutId);
        }
    }, []);

    return {
        safeSetInterval,
        safeSetTimeout,
        clearIntervalSafe,
        clearTimeoutSafe,
        clearAll,
        cleanup: clearAll,
        isMounted: () => mountedRef.current
    };
}
