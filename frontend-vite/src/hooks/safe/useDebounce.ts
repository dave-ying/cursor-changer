import { useCallback, useRef } from 'react';

export function useDebounce() {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const debounce = useCallback(<T extends unknown[]>(callback: (...args: T) => void, delay: number) => {
        return (...args: T) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                    callback(...args);
                }
            }, delay);
        };
    }, []);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const cleanup = useCallback(() => {
        mountedRef.current = false;
        cancel();
    }, [cancel]);

    return { debounce, cancel, cleanup };
}
