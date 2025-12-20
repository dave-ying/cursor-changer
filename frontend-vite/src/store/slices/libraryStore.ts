// Library state slice for Zustand store
import { StateCreator } from 'zustand';
import { CursorInfo } from '../../types/generated/CursorInfo';
import { LibraryCursor } from '../../types/generated/LibraryCursor';

export interface LibraryStateSlice {
    availableCursors: CursorInfo[];
    libraryCursors: LibraryCursor[];

    setAvailableCursors: (cursors: CursorInfo[]) => void;
    setLibraryCursors: (cursors: LibraryCursor[]) => void;
}

export const createLibraryStateSlice: StateCreator<
    LibraryStateSlice,
    [],
    [],
    LibraryStateSlice
> = (set) => ({
    availableCursors: [],
    libraryCursors: [],

    setAvailableCursors: (cursors) => set({ availableCursors: cursors }),
    setLibraryCursors: (cursors) => set({ libraryCursors: cursors })
});
