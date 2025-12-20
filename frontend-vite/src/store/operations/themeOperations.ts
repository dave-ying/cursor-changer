// Theme operations for Zustand store
import { CursorState } from '../slices/cursorStateStore';
import { Message } from '../slices/uiStateStore';
import { TauriFunctions } from '../slices/windowStore';
import { Commands } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { invokeWithFeedback } from './invokeWithFeedback';

export interface ThemeOperations {
    setAccentColor: (color: string, options?: { commit?: boolean }) => Promise<void>;
    setThemeMode: (mode: string) => Promise<void>;
}

// Helper functions to apply theme and accent color to DOM
export const applyAccentColor = (color: string): void => {
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-ring', color);
    document.documentElement.style.setProperty('--color-accent', color);
    document.documentElement.style.setProperty('--brand-primary', color);
};

export const applyTheme = (mode: string): void => {
    document.documentElement.classList.remove('light', 'dark');

    if (mode === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.add(systemPrefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.classList.add(mode);
    }
};

export const createThemeOperations = (
    getTauri: () => TauriFunctions,
    updateCursorState: (updates: Partial<CursorState>) => void,
    showMessage: (text: string, type?: Message['type']) => void
): ThemeOperations => ({
    // Set accent color with optional commit flag.
    // - If commit === false: update UI and state only (no backend invoke or toast).
    // - If commit === true: persist via Tauri and show a success toast.
    setAccentColor: async (color, options = { commit: true }) => {
        const { commit = true } = options || {};

        // Update UI immediately for a responsive experience
        updateCursorState({ accentColor: color });
        applyAccentColor(color);

        // Only call backend and show messages when this is a confirmed commit.
        if (!commit) return;

        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.setAccentColor, {
            args: { color },
            showMessage,
            successMessage: 'Accent color updated',
            successType: 'success',
            errorMessage: (error) => 'Failed to set accent color: ' + String(error),
            errorType: 'error',
            onError: (error) => {
                logger.error('Failed to set accent color:', error);
            }
        });
    },

    setThemeMode: async (mode) => {
        logger.debug('[ThemeOperations] setThemeMode called with mode:', mode);

        // Normalize mode (only 'light' or 'dark' for now; default to dark)
        const normalized =
            mode === 'light'
                ? 'light'
                : mode === 'dark'
                    ? 'dark'
                    : 'dark';

        // Update local state + apply DOM theme so UI responds immediately
        updateCursorState({ themeMode: normalized });
        applyTheme(normalized);

        const tauri = getTauri();
        if (tauri.invoke) {
            const result = await invokeWithFeedback(tauri.invoke, Commands.setThemeMode, {
                args: { theme_mode: normalized },
                onError: (error) => {
                    logger.error('[ThemeOperations] Failed to set theme mode:', error);
                }
            });
            if (result.status === 'success') {
                logger.debug('[ThemeOperations] Theme mode backend call succeeded');
            }
            if (result.status === 'error') {
                showMessage('Failed to save theme preference: ' + String(result.error), 'warning');
                return;
            }
        }

        showMessage('Theme updated', 'success');
        logger.debug('[ThemeOperations] Theme mode state and UI updated');
    }
});
