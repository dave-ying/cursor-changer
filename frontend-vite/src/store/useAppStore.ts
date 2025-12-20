// Zustand store for cursor changer application
// Refactored: combines focused slices and operations
import { create, StateCreator, StoreApi } from 'zustand';
import { devtools } from 'zustand/middleware';

// Import slices
import { createCursorStateSlice, CursorStateSlice } from './slices/cursorStateStore';
import { createUIStateSlice, UIStateSlice } from './slices/uiStateStore';
import { createLibraryStateSlice, LibraryStateSlice } from './slices/libraryStore';
import { createWindowStateSlice, WindowStateSlice } from './slices/windowStore';

// Import operations
import { createCursorOperations, CursorOperations } from './operations/cursorOperations';
import { createSettingsOperations, SettingsOperations } from './operations/settingsOperations';
import { createThemeOperations, ThemeOperations, applyAccentColor, applyTheme } from './operations/themeOperations';
import { createDataLoadingOperations, DataLoadingOperations } from './operations/dataLoadingOperations';

// Combined store type
type AppState = CursorStateSlice &
  UIStateSlice &
  LibraryStateSlice &
  WindowStateSlice & {
    operations: CursorOperations &
    SettingsOperations &
    ThemeOperations &
    DataLoadingOperations;
  };

// Helper to invoke slice creators without requiring the third store API argument.
// This is type-safe because our slices don't use the store API parameter.
type SliceCreator<T> = StateCreator<T, [], [], T>;
function createSlice<T>(
  creator: SliceCreator<T>,
  set: StoreApi<AppState>['setState'],
  get: StoreApi<AppState>['getState']
): T {
  // Slices only use set/get; the store API is unused, so we pass a minimal stub.
  const stubApi = { setState: set, getState: get, subscribe: () => () => {}, destroy: () => {} };
  return creator(set as never, get as never, stubApi as never);
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => {
      // Create all slices first
      const cursorStateSlice = createSlice(createCursorStateSlice, set, get);
      const uiStateSlice = createSlice(createUIStateSlice, set, get);
      const libraryStateSlice = createSlice(createLibraryStateSlice, set, get);
      const windowStateSlice = createSlice(createWindowStateSlice, set, get);

      // Create a combined state object that includes all slices first
      const stateWithSlices = {
        ...cursorStateSlice,
        ...uiStateSlice,
        ...libraryStateSlice,
        ...windowStateSlice
      };

      // Now create helper functions that can access the complete state
      const getShowMessage = () => {
        const state = get();
        return state.showMessage || uiStateSlice.showMessage;
      };
      const getTauriFunc = () => get().tauri;

      // Create operations with safe access to dependencies
      // Create dataLoadingOps first since settingsOps depends on loadAvailableCursors
      const dataLoadingOps = createDataLoadingOperations(
        getTauriFunc,
        (updates) => get().updateCursorState(updates),
        (cursors) => get().setAvailableCursors(cursors),
        (cursors) => get().setLibraryCursors(cursors),
        (maximized) => get().setIsMaximized(maximized),
        getShowMessage
      );

      const cursorOps = createCursorOperations(getTauriFunc, getShowMessage);
      const settingsOps = createSettingsOperations(
        getTauriFunc,
        (updates) => get().updateCursorState(updates),
        (state) => get().setCursorState(state),
        getShowMessage,
        applyAccentColor,
        applyTheme,
        dataLoadingOps.loadAvailableCursors
      );
      const themeOps = createThemeOperations(
        getTauriFunc,
        (updates) => get().updateCursorState(updates),
        getShowMessage
      );

      return {
        ...stateWithSlices,

        // Combined operations
        operations: {
          ...cursorOps,
          ...settingsOps,
          ...themeOps,
          ...dataLoadingOps
        }
      };
    },
    { name: 'cursor-changer-store' }
  )
);

// Re-export types for convenience
export type { CursorState } from './slices/cursorStateStore';
export type { Message } from './slices/uiStateStore';
export type { TauriFunctions } from './slices/windowStore';
export { applyAccentColor, applyTheme } from './operations/themeOperations';