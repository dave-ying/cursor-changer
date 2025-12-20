import { useCallback, useRef } from 'react';

import { logger } from '@/utils/logger';

interface SafeAsyncOptions<T> {
    onSuccess?: (result: T) => void;
    onError?: (error: unknown) => void;
    onFinally?: () => void;
    errorMessage?: string;
}

interface SafePromiseWrapper<T> {
    promise: Promise<T>;
    cancel: () => void;
}

export function useSafeAsync() {
    const mountedRef = useRef(true);

    const cleanup = useCallback(() => {
        mountedRef.current = false;
    }, []);

    const safeAsync = useCallback(async <T>(
        asyncFn: () => Promise<T>,
        options: SafeAsyncOptions<T> = {}
    ): Promise<T | null> => {
        const {
            onSuccess,
            onError,
            onFinally,
            errorMessage = 'Async operation failed'
        } = options;

        try {
            const result = await asyncFn();

            if (mountedRef.current) {
                if (onSuccess) {
                    onSuccess(result);
                }
            }

            return result;
        } catch (error) {
            logger.warn('[useSafeAsync] Operation failed:', errorMessage, error);

            if (mountedRef.current && onError) {
                onError(error);
            }

            return null;
        } finally {
            if (mountedRef.current && onFinally) {
                onFinally();
            }
        }
    }, []);

    const safePromise = useCallback(<T>(promise: Promise<T>): SafePromiseWrapper<T> => {
        let cancelled = false;

        const wrappedPromise = new Promise<T>((resolve, reject) => {
            promise.then(
                (result) => {
                    if (!cancelled && mountedRef.current) {
                        resolve(result);
                    }
                },
                (error) => {
                    if (!cancelled && mountedRef.current) {
                        reject(error);
                    }
                }
            );
        });

        return {
            promise: wrappedPromise,
            cancel: () => {
                cancelled = true;
            }
        };
    }, []);

    return {
        safeAsync,
        safePromise,
        cleanup,
        isMounted: () => mountedRef.current
    };
}
