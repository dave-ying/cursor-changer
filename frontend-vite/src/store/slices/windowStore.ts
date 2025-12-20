// Window state slice for Zustand store
import { StateCreator } from 'zustand';

export interface TauriFunctions {
    invoke: ((cmd: string, args?: any) => Promise<any>) | null;
    listen: ((event: string, handler: (event: any) => void) => Promise<() => void>) | null;
    getAppWindow: (() => any) | null;
}

export interface WindowStateSlice {
    isMaximized: boolean;
    isReady: boolean;
    tauri: TauriFunctions;

    setIsMaximized: (maximized: boolean) => void;
    setTauriReady: (isReady: boolean) => void;
    setTauriFunctions: (functions: Partial<TauriFunctions>) => void;
}

export const createWindowStateSlice: StateCreator<
    WindowStateSlice,
    [],
    [],
    WindowStateSlice
> = (set) => ({
    isMaximized: false,
    isReady: false,
    tauri: {
        invoke: null,
        listen: null,
        getAppWindow: null
    },

    setIsMaximized: (maximized) => set({ isMaximized: maximized }),

    setTauriReady: (isReady) => set({ isReady }),

    setTauriFunctions: (functions) =>
        set((state) => ({
            tauri: { ...state.tauri, ...functions },
            isReady: true
        }))
});
