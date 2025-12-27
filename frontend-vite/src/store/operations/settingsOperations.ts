// Settings operations for Zustand store
import { CursorState } from '../slices/cursorStateStore';
import { Message } from '../slices/uiStateStore';
import { TauriFunctions } from '../slices/windowStore';
import { Commands } from '../../tauri/commands';
import type { CursorStatePayload } from '../../types/generated/CursorStatePayload';
import type { DefaultCursorStyle } from '../../types/generated/DefaultCursorStyle';
import { mapCursorStatePayloadWithDefaults } from '../../tauri/mappers';
import { invokeWithFeedback } from './invokeWithFeedback';

export interface SettingsOperations {
    setHotkey: (shortcut: string) => Promise<void>;
    setShortcutEnabled: (enabled: boolean) => Promise<void>;
    setMinimizeToTray: (value: boolean) => Promise<void>;
    setRunOnStartup: (value: boolean) => Promise<void>;
    setCursorSize: (size: string) => Promise<void>;
    setDefaultCursorStyle: (style: DefaultCursorStyle) => Promise<void>;
    resetAllSettings: () => Promise<void>;
}

export const createSettingsOperations = (
    getTauri: () => TauriFunctions,
    updateCursorState: (updates: Partial<CursorState>) => void,
    setCursorState: (newState: CursorState) => void,
    showMessage: (text: string, type?: Message['type']) => void,
    applyAccentColor: (color: string) => void,
    applyTheme: (mode: string) => void,
    loadAvailableCursors: () => Promise<void>
): SettingsOperations => ({
    setHotkey: async (shortcut) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.setHotkey, {
            args: { shortcut },
            showMessage,
            logLabel: 'Failed to set hotkey:',
            errorMessage: (error) => 'Failed to set hotkey: ' + String(error),
            errorType: 'error',
            rethrow: true
        });
        updateCursorState({ shortcut });
        showMessage('Hotkey updated successfully', 'success');
    },

    setShortcutEnabled: async (enabled) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.setShortcutEnabled, {
            args: { enabled },
            showMessage,
            logLabel: 'Failed to set shortcut enabled:',
            errorMessage: (error) => 'Failed to update shortcut setting: ' + String(error),
            errorType: 'error',
            rethrow: true
        });
        updateCursorState({ shortcutEnabled: enabled });
        showMessage(
            enabled ? 'Keyboard shortcut enabled' : 'Keyboard shortcut disabled',
            'success'
        );
    },

    setMinimizeToTray: async (value) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.setMinimizeToTray, {
            args: { enable: value },
            logLabel: 'Failed to set minimize to tray:'
        });
        if (result.status === 'success') {
            updateCursorState({ minimizeToTray: value });
        }
    },

    setRunOnStartup: async (value) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.setRunOnStartup, {
            args: { enable: value },
            showMessage,
            logLabel: 'Failed to set run on startup:',
            errorMessage: (error) => 'Failed to update startup setting: ' + String(error),
            errorType: 'error'
        });
        if (result.status === 'success') {
            updateCursorState({ runOnStartup: value });
            showMessage(value ? 'Startup enabled' : 'Startup disabled', 'success');
        }
    },

    setCursorSize: async (size) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        const parsed = parseInt(size);

        const result = await invokeWithFeedback(tauri.invoke, Commands.setCursorSize, {
            args: { size: parsed },
            showMessage,
            logLabel: 'Failed to set cursor size:',
            errorMessage: (error) => 'Failed to set cursor size: ' + String(error),
            errorType: 'error'
        });

        if (result.status === 'success') {
            updateCursorState({ cursorSize: parsed });
        }
    },

    setDefaultCursorStyle: async (style) => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.setDefaultCursorStyle, {
            args: { style },
            showMessage,
            logLabel: 'Failed to set default cursor style:',
            errorMessage: (error) => 'Failed to set default cursor style: ' + String(error),
            errorType: 'error',
            rethrow: true
        });
        updateCursorState({ defaultCursorStyle: style });
        showMessage('Default cursors set to Windows style', 'success');
    },

    resetAllSettings: async () => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        const result = await invokeWithFeedback(tauri.invoke, Commands.resetAllSettings, {
            showMessage,
            logLabel: 'Failed to reset settings:',
            errorMessage: (error) => 'Failed to reset settings: ' + String(error),
            errorType: 'error'
        });

        if (result.status !== 'success') return;

        const payload = result.value as Partial<CursorStatePayload>;
        const mappedState = mapCursorStatePayloadWithDefaults(payload);

        setCursorState(mappedState);
        applyAccentColor(mappedState.accentColor);
        applyTheme(mappedState.themeMode);
        showMessage('All settings reset to defaults', 'success');

        await invokeWithFeedback(tauri.invoke, Commands.resetWindowSizeToDefault, {
            logLabel: 'Failed to reset window size:'
        });

        // Refresh the cursor previews in the Active section
        await loadAvailableCursors();
    }
});
