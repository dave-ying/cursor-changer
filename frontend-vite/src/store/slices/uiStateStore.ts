// UI state slice for Zustand store
import { StateCreator } from 'zustand';
import { toastService } from '../../services/toastService';
import type { ToastType } from '../../types/toastTypes';

export interface Message {
    text: string;
    type: 'info' | 'success' | 'error' | 'warning' | '';
}

export interface UIStateSlice {
    customizationMode: 'simple' | 'advanced';
    activeSection: string;
    message: Message;
    recording: boolean;
    capturedShortcut: string | null;
    originalShortcut: string | null;
    selectingCursorForCustomization: boolean;

    setCustomizationMode: (mode: 'simple' | 'advanced') => void;
    setActiveSection: (section: string) => void;
    showMessage: (text: string, type?: Message['type']) => void;
    clearMessage: () => void;
    addToast: (text: string, type?: Message['type'], duration?: number) => void;
    removeToast: (id: string | number) => void;
    clearAllToasts: () => void;
    setRecording: (recording: boolean) => void;
    setCapturedShortcut: (shortcut: string | null) => void;
    setOriginalShortcut: (shortcut: string | null) => void;
    setSelectingCursorForCustomization: (selecting: boolean) => void;
}

export const createUIStateSlice: StateCreator<
    UIStateSlice,
    [],
    [],
    UIStateSlice
> = (set) => ({
    customizationMode: 'simple',
    activeSection: 'cursor-customization',
    message: { text: '', type: '' },
    recording: false,
    capturedShortcut: null,
    originalShortcut: null,
    selectingCursorForCustomization: false,

    setCustomizationMode: (mode) => set({ customizationMode: mode }),
    setActiveSection: (section) => set({ activeSection: section }),

    showMessage: (text, type = 'info') =>
        set({ message: { text, type } }),

    clearMessage: () =>
        set({ message: { text: '', type: '' } }),

    addToast: (text, type = 'info', duration = 5000) => {
        // Use ToastService to actually show the toast
        const safeType: ToastType = ((type === '' || type === null || type === undefined) ? 'info' : type) as ToastType;
        toastService.show(text, safeType, { duration });
    },

    removeToast: (id) => {
        toastService.remove(id);
    },

    clearAllToasts: () => {
        toastService.clear();
    },

    setRecording: (recording) => set({ recording }),
    setCapturedShortcut: (shortcut) => set({ capturedShortcut: shortcut }),
    setOriginalShortcut: (shortcut) => set({ originalShortcut: shortcut }),
    setSelectingCursorForCustomization: (selecting) => set({ selectingCursorForCustomization: selecting })
});