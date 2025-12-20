import { useCallback, useRef } from 'react';

import { logger } from '@/utils/logger';

interface ListenerEntry {
    element: EventTarget;
    event: string;
    handler: EventListener;
    options: AddEventListenerOptions;
}

export function useSafeEventListener() {
    const listenersRef = useRef(new Map<string, ListenerEntry>());
    const mountedRef = useRef(true);

    const getEventTargetLabel = useCallback((element: EventTarget) => {
        if (element instanceof Element) {
            return element.tagName;
        }
        return 'unknown';
    }, []);

    const addEventListener = useCallback((
        element: EventTarget,
        event: string,
        handler: EventListener,
        options: AddEventListenerOptions = {}
    ) => {
        if (!mountedRef.current) return;

        try {
            element.addEventListener(event, handler, options);

            const key = `${getEventTargetLabel(element)}-${event}-${handler.toString()}`;
            listenersRef.current.set(key, { element, event, handler, options });
        } catch (error) {
            logger.warn('[useSafeEventListener] Failed to add listener:', error);
        }
    }, [getEventTargetLabel]);

    const removeEventListener = useCallback((
        element: EventTarget,
        event: string,
        handler: EventListener,
        options: AddEventListenerOptions = {}
    ) => {
        try {
            element.removeEventListener(event, handler, options);

            const key = `${getEventTargetLabel(element)}-${event}-${handler.toString()}`;
            listenersRef.current.delete(key);
        } catch (error) {
            logger.warn('[useSafeEventListener] Failed to remove listener:', error);
        }
    }, [getEventTargetLabel]);

    const cleanup = useCallback(() => {
        mountedRef.current = false;

        listenersRef.current.forEach(({ element, event, handler, options }) => {
            try {
                element.removeEventListener(event, handler, options);
            } catch (error) {
                logger.warn('[useSafeEventListener] Cleanup error:', error);
            }
        });

        listenersRef.current.clear();
    }, []);

    return {
        addEventListener,
        removeEventListener,
        cleanup,
        isMounted: () => mountedRef.current
    };
}
