import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

// Type definitions for Tauri window object
interface TauriWindow {
    hide?: () => Promise<void>;
    minimize?: () => Promise<void>;
    listen?: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
    [key: string]: any;
}

interface TauriAPI {
    invoke: <T = any>(command: string, args?: Record<string, any>) => Promise<T>;
    listen?: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
    appWindow: TauriWindow | null;
}

interface UseTauriReturn {
    invoke: <T = any>(command: string, args?: Record<string, any>) => Promise<T>;
    listen: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
    getAppWindow: () => TauriWindow;
    isReady: boolean;
    error: Error | null;
    tauri: TauriAPI | null;
}

function toCamelCaseKey(key: string): string {
    if (!key.includes('_')) return key;
    const parts = key.split('_');
    return parts[0] + parts.slice(1).map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : '')).join('');
}

function normalizeInvokeArgs(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalizeInvokeArgs);
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            const normalizedValue = normalizeInvokeArgs(v);
            const camelKey = toCamelCaseKey(k);
            out[camelKey] = normalizedValue;
            if (camelKey !== k) {
                out[k] = normalizedValue;
            }
        }
        return out;
    }
    return value;
}

/**
 * Custom hook for accessing Tauri APIs
 * Handles the complex initialization and provides invoke, listen, and appWindow
 */
export function useTauri(): UseTauriReturn {
    const isTauriDebug = import.meta.env['VITE_DEBUG_TAURI'] === 'true';

    const tryGlobalTauri = (): TauriAPI | null => {
        try {
            if (typeof window === 'undefined') return null;
            const injected = (window as any).__TAURI__;
            if (!injected) return null;

            const invokeFn: TauriAPI['invoke'] | null =
                typeof injected.invoke === 'function'
                    ? injected.invoke
                    : injected.core && typeof injected.core.invoke === 'function'
                        ? injected.core.invoke
                        : null;

            if (!invokeFn) return null;

            const listenFn: TauriAPI['listen'] | undefined =
                typeof injected.listen === 'function'
                    ? injected.listen
                    : injected.event && typeof injected.event.listen === 'function'
                        ? injected.event.listen
                        : undefined;

            let appWindowObj: TauriWindow | null = null;
            if (injected.window && typeof injected.window.getCurrentWindow === 'function') {
                appWindowObj = injected.window.getCurrentWindow();
            } else if (injected.window && typeof injected.window.getCurrent === 'function') {
                appWindowObj = injected.window.getCurrent();
            } else {
                appWindowObj = (injected.window && injected.window.appWindow) || injected.appWindow || null;
            }

            return { invoke: invokeFn, listen: listenFn, appWindow: appWindowObj };
        } catch (err) {
            if (isTauriDebug) {
                logger.debug('[useTauri] Failed to detect Tauri global:', err);
            }
            return null;
        }
    };

    const initialTauri = tryGlobalTauri();
    const [tauri, setTauri] = useState<TauriAPI | null>(initialTauri);
    const [isReady, setIsReady] = useState(Boolean(initialTauri));
    const [error, setError] = useState<Error | null>(null);
    const tauriRef = useRef<TauriAPI | null>(initialTauri);

    useEffect(() => {
        let mounted = true;

        const waitForGlobal = async (maxMs = 1000, intervalMs = 50): Promise<TauriAPI | null> => {
            const start = Date.now();
            while (Date.now() - start < maxMs) {
                const maybe = tryGlobalTauri();
                if (maybe) return maybe;
                await new Promise((r) => setTimeout(r, intervalMs));
            }
            return null;
        };

        const initializeTauri = async () => {
            try {
                const injectedNow = tryGlobalTauri();
                if (injectedNow) {
                    if (mounted) {
                        tauriRef.current = injectedNow;
                        setTauri(injectedNow);
                        setIsReady(true);
                    }
                    return;
                }

                const later = await waitForGlobal();
                if (later && mounted) {
                    tauriRef.current = later;
                    setTauri(later);
                    setIsReady(true);
                    return;
                }

                // Return stubs if not available
                const stubs: TauriAPI = {
                    invoke: async () => { throw new Error('tauri.invoke is not available. Are you running inside Tauri?'); },
                    listen: async () => { throw new Error('event.listen is not available. Are you running inside Tauri?'); },
                    appWindow: {
                        hide: async () => { throw new Error('appWindow.hide is not available. Are you running inside Tauri?'); },
                        minimize: async () => { throw new Error('appWindow.minimize is not available. Are you running inside Tauri?'); },
                        listen: async () => { throw new Error('appWindow.listen is not available. Are you running inside Tauri?'); }
                    }
                };

                if (mounted) {
                    logger.error('[useTauri] Tauri runtime not detected');
                    tauriRef.current = stubs;
                    setTauri(stubs);
                    setError(new Error('Tauri runtime not detected'));
                    setIsReady(true);
                }
            } catch (err) {
                if (mounted) {
                    logger.error('[useTauri] Failed to initialize Tauri APIs:', err);
                    setError(err as Error);
                    setIsReady(true);
                }
            }
        };

        initializeTauri();

        return () => {
            mounted = false;
        };
    }, []);

    const invoke = useCallback(async <T = any>(command: string, args?: Record<string, any>): Promise<T> => {
        const t = tauriRef.current || tauri;
        if (!t || typeof t.invoke !== 'function') {
            logger.error('[useTauri] tauri.invoke is not available');
            throw new Error('tauri.invoke is not available');
        }

        const normalizedArgs = args ? (normalizeInvokeArgs(args) as Record<string, any>) : args;
        if (isTauriDebug) {
            logger.debug('[useTauri] Invoking with args:', { command, args: normalizedArgs });
        }
        let result: T;
        try {
            result = await t.invoke<T>(command, normalizedArgs);
        } catch (err) {
            logger.error('[useTauri] Invoke failed:', { command, args: normalizedArgs, err });
            throw err;
        }
        if (isTauriDebug) {
            logger.debug('[useTauri] Invoked successfully:', result);
        }
        return result;
    }, [isTauriDebug, tauri]);

    const listen = useCallback(async <T = any>(
        event: string,
        handler: (event: { payload: T }) => void
    ): Promise<() => void> => {
        const t = tauriRef.current || tauri;
        if (!t || typeof t.listen !== 'function') {
            logger.error('[useTauri] event.listen is not available');
            throw new Error('event.listen is not available');
        }
        try {
            return await t.listen(event, handler);
        } catch (err) {
            logger.error('[useTauri] Listen failed:', { event, err });
            throw err;
        }
    }, [tauri]);

    const getAppWindow = useCallback((): TauriWindow => {
        const t = tauriRef.current || tauri;
        if (!t || !t.appWindow) {
            logger.error('[useTauri] appWindow is not available');
            throw new Error('appWindow is not available');
        }
        return t.appWindow;
    }, [tauri]);

    return { invoke, listen, getAppWindow, isReady, error, tauri };
}
