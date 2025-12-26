// UI state slice for Zustand store
import { StateCreator } from 'zustand';
import { toastService } from '@/services/toastService';
import type { ToastType } from '@/types/toastTypes';
import { persistentKeys } from '@/constants/persistentKeys';

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
}

export const initialUIStateSlice: Pick<UIStateSlice,
    'customizationMode' |
    'activeSection' |
    'message' |
    'recording' |
    'capturedShortcut' |
    'originalShortcut'
> = {
    customizationMode: 'simple',
    activeSection: 'cursor-customization',
    message: { text: '', type: '' },
    recording: false,
    capturedShortcut: null,
    originalShortcut: null
};

export const createUIStateSlice: StateCreator<
    UIStateSlice,
    [],
    [],
    UIStateSlice
> = (set) => ({
    ...initialUIStateSlice,

    setCustomizationMode: (mode) => set({ customizationMode: mode ?? 'simple' }),
    setActiveSection: (section) => {
        const newSection = section ?? 'cursor-customization';
        
        // Auto-close customize panels when leaving cursor-customization section
        if (newSection !== 'cursor-customization') {
            // Clear active section customize panel state
            localStorage.removeItem(persistentKeys.activeSection.showModeToggle);
            localStorage.removeItem(persistentKeys.activeSection.showMoreOptions);
            
            // Clear library customize panel state
            localStorage.removeItem(persistentKeys.library.showCustomizePanel);
            localStorage.removeItem(persistentKeys.library.showMoreOptions);
        }
        
        set({ activeSection: newSection });
    },

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
        try {
            toastService.remove(id);
        } catch (error) {
            // Surface errors to callers to handle
            throw error;
        }
    },

    clearAllToasts: () => {
        try {
            toastService.clear();
        } catch (error) {
            // Surface errors to callers to handle
            throw error;
        }
    },

    setRecording: (recording) => set({ recording }),
    setCapturedShortcut: (shortcut) => set({ capturedShortcut: shortcut }),
    setOriginalShortcut: (shortcut) => set({ originalShortcut: shortcut })
});