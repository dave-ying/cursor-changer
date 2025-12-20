// Cursor state slice for Zustand store
import { StateCreator } from 'zustand';
import type { ThemeMode } from '../../types/generated/ThemeMode';
import type { DefaultCursorStyle } from '../../types/generated/DefaultCursorStyle';

export interface CursorState {
  hidden: boolean;
  shortcut: string | null;
  shortcutEnabled: boolean;
  cursorSize: number;
  minimizeToTray: boolean;
  runOnStartup: boolean;
  lastLoadedCursorPath: string | null;
  cursorPaths: { [key: string]: string };
  accentColor: string;
  themeMode: ThemeMode;
  defaultCursorStyle: DefaultCursorStyle;
}

export interface CursorStateSlice {
  cursorState: CursorState;
  updateCursorState: (updates: Partial<CursorState>) => void;
  setCursorState: (newState: CursorState) => void;
}

export const defaultCursorState: CursorState = {
  hidden: false,
  shortcut: 'Ctrl+Shift+X',
  shortcutEnabled: true,
  cursorSize: 32,
  minimizeToTray: true,
  runOnStartup: false,
  lastLoadedCursorPath: null,
  cursorPaths: {},
  accentColor: '#7c3aed',
  themeMode: 'dark',
  defaultCursorStyle: 'windows'
};

export const createCursorStateSlice: StateCreator<
  CursorStateSlice,
  [],
  [],
  CursorStateSlice
> = (set) => ({
  cursorState: defaultCursorState,

  updateCursorState: (updates) =>
    set((state) => ({
      cursorState: { ...state.cursorState, ...updates }
    })),

  setCursorState: (newState) =>
    set({ cursorState: newState })
});
