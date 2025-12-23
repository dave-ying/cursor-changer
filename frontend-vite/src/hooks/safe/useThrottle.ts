import { useCallback, useRef } from 'react';

export function useThrottle() {
    const lastCallRef = useRef<number>(0);
    const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const throttle = useCallback(<T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
        return (...args: T) => {
            const now = Date.now();
            const timeSinceLastCall = now - lastCallRef.current;

            // Clear any pending trailing call
            if (pendingRef.current) {
                clearTimeout(pendingRef.current);
                pendingRef.current = null;
            }

            if (timeSinceLastCall >= delay) {
                // Enough time has passed, execute immediately
                lastCallRef.current = now;
                if (mountedRef.current) {
                    callback(...args);
                }
            } else {
                // Schedule a trailing call to ensure the last value is applied
                pendingRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                        lastCallRef.current = Date.now();
                        callback(...args);
                    }
                    pendingRef.current = null;
                }, delay - timeSinceLastCall);
            }
        };
    }, []);

    const cancel = useCallback(() => {
        if (pendingRef.current) {
            clearTimeout(pendingRef.current);
            pendingRef.current = null;
        }
    }, []);

    const cleanup = useCallback(() => {
        mountedRef.current = false;
        cancel();
    }, [cancel]);

    return { throttle, cancel, cleanup };
}
