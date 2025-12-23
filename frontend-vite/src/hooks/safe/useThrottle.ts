import { useCallback, useRef } from 'react';

export function useThrottle() {
    const lastCallRef = useRef<number>(0);
    const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastArgsRef = useRef<unknown[] | null>(null);
    const mountedRef = useRef(true);

    // Leading + trailing throttle that always uses the latest arguments for the trailing call.
    const throttle = useCallback(<T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
        return (...args: T) => {
            lastArgsRef.current = args;
            const now = Date.now();
            const timeSinceLastCall = now - lastCallRef.current;
            const remaining = delay - timeSinceLastCall;

            if (timeSinceLastCall >= delay) {
                // Execute immediately (leading call)
                lastCallRef.current = now;
                if (mountedRef.current && lastArgsRef.current) {
                    callback(...(lastArgsRef.current as T));
                }
                // Clear any pending trailing call since we already applied the latest
                if (pendingRef.current) {
                    clearTimeout(pendingRef.current);
                    pendingRef.current = null;
                }
            } else {
                // Refresh trailing call with latest args
                if (pendingRef.current) {
                    clearTimeout(pendingRef.current);
                }
                pendingRef.current = setTimeout(() => {
                    if (mountedRef.current && lastArgsRef.current) {
                        lastCallRef.current = Date.now();
                        callback(...(lastArgsRef.current as T));
                    }
                    pendingRef.current = null;
                }, Math.max(0, remaining));
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
