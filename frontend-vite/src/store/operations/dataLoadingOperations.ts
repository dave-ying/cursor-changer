// Data loading operations for Zustand store
import { CursorState } from '../slices/cursorStateStore';
import { Message } from '../slices/uiStateStore';
import { TauriFunctions } from '../slices/windowStore';
import { CursorInfo } from '../../types/generated/CursorInfo';
import { LibraryCursor } from '../../types/generated/LibraryCursor';
import { CursorStatePayload } from '../../types/generated/CursorStatePayload';
import { applyTheme, applyAccentColor } from './themeOperations';
import { preloadCursorPreviews } from '../../services/cursorPreviewCache';
import { Commands } from '../../tauri/commands';
import { mapCursorStatePayloadWithDefaults } from '../../tauri/mappers';
import { invokeWithFeedback } from './invokeWithFeedback';
import { logger } from '../../utils/logger';

export interface DataLoadingOperations {
    loadStatus: () => Promise<void>;
    loadCustomizationMode: () => Promise<void>;
    loadAvailableCursors: () => Promise<void>;
    loadLibraryCursors: () => Promise<void>;
    updateMaximizeState: () => Promise<void>;
}

export const createDataLoadingOperations = (
    getTauri: () => TauriFunctions,
    updateCursorState: (updates: Partial<CursorState>) => void,
    setCustomizationMode: (mode: 'simple' | 'advanced') => void,
    setAvailableCursors: (cursors: CursorInfo[]) => void,
    setLibraryCursors: (cursors: LibraryCursor[]) => void,
    setIsMaximized: (maximized: boolean) => void,
    showMessage: (text: string, type?: Message['type']) => void
): DataLoadingOperations => ({
    loadStatus: async () => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.getStatus, {
            showMessage,
            logLabel: 'Failed to load status:',
            errorMessage: 'Failed to load status from backend',
            errorType: 'error'
        });

        if (result.status !== 'success') return;

        const payload = result.value as Partial<CursorStatePayload>;
        const mappedState = mapCursorStatePayloadWithDefaults(payload);

        updateCursorState(mappedState);

        // Apply theme and accent color
        applyTheme(mappedState.themeMode);
        applyAccentColor(mappedState.accentColor);
    },

    loadCustomizationMode: async () => {
        let tauri = getTauri();
        if (!tauri.invoke && typeof window !== 'undefined') {
            const runtime = (window as any).__TAURI__;
            if (runtime?.core?.invoke) {
                tauri = { ...tauri, invoke: runtime.core.invoke };
            }
        }
        if (!tauri.invoke) return;

        const result = await invokeWithFeedback(tauri.invoke, Commands.getCustomizationMode, {
            logLabel: 'Failed to load customization mode:'
        });

        if (result.status !== 'success') return;
        const mode = result.value;
        if (mode === 'simple' || mode === 'advanced') {
            setCustomizationMode(mode);
        }
    },

    loadAvailableCursors: async () => {
        let tauri = getTauri();
        if (!tauri.invoke && typeof window !== 'undefined') {
            const runtime = (window as any).__TAURI__;
            if (runtime?.core?.invoke) {
                tauri = { ...tauri, invoke: runtime.core.invoke };
            }
        }
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.getAvailableCursors, {
            logLabel: 'Failed to load cursors:'
        });

        if (result.status !== 'success') {
            setAvailableCursors([]);
            return;
        }

        const cursorArray = Array.isArray(result.value) ? [...result.value] : [];

        // Update state immediately so UI can render with loading placeholders
        setAvailableCursors(cursorArray);

        // Preload all cursor previews in parallel (non-blocking for ANI files)
        // This ensures .CUR files load instantly on subsequent renders
        preloadCursorPreviews(cursorArray, tauri.invoke).catch((err) => {
            logger.warn('[DataLoading] Preview preload had some failures:', err);
        });
    },

    loadLibraryCursors: async () => {
        let tauri = getTauri();
        if (!tauri.invoke && typeof window !== 'undefined') {
            const runtime = (window as any).__TAURI__;
            if (runtime?.core?.invoke) {
                tauri = { ...tauri, invoke: runtime.core.invoke };
            }
        }
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.getLibraryCursors, {
            logLabel: 'Failed to load library cursors:'
        });

        if (result.status !== 'success') {
            setLibraryCursors([]);
            return;
        }

        setLibraryCursors(Array.isArray(result.value) ? [...result.value] : []);
    },

    updateMaximizeState: async () => {
        const tauri = getTauri();
        if (!tauri.invoke || !tauri.getAppWindow) return;
        try {
            const win = tauri.getAppWindow();
            const maximized = await win.isMaximized();
            setIsMaximized(maximized);
        } catch (error) {
            logger.error('Failed to check maximize state:', error);
        }
    }
});
