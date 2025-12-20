// Cursor operations for Zustand store
import { Message } from '../slices/uiStateStore';
import { TauriFunctions } from '../slices/windowStore';
import { Commands } from '../../tauri/commands';
import { invokeWithFeedback } from './invokeWithFeedback';

export interface CursorOperations {
    toggleCursor: () => Promise<void>;
    restoreCursor: () => Promise<void>;
}

export const createCursorOperations = (
    getTauri: () => TauriFunctions,
    showMessage: (text: string, type?: Message['type']) => void
): CursorOperations => ({
    toggleCursor: async () => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.toggleCursor, {
            showMessage,
            logLabel: 'Failed to toggle cursor:',
            errorMessage: (error) => 'Failed to toggle cursor: ' + String(error),
            errorType: 'error'
        });
    },

    restoreCursor: async () => {
        const tauri = getTauri();
        if (!tauri.invoke) return;
        await invokeWithFeedback(tauri.invoke, Commands.restoreCursor, {
            showMessage,
            successMessage: 'Cursor restored to system defaults',
            successType: 'success',
            logLabel: 'Failed to restore cursor:',
            errorMessage: (error) => 'Failed to restore cursor: ' + String(error),
            errorType: 'error'
        });
    }
});
