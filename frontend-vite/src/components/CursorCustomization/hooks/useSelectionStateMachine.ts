import { useCallback, useMemo, useReducer } from 'react';

import type { SelectedCursor } from '../types';
import type { LibraryCursor } from '../../../types/generated/LibraryCursor';

export type SelectionMode = 'idle' | 'active_first' | 'library_first';

type CoreSelectionState = {
  mode: SelectionMode;
  pendingLibraryCursor: LibraryCursor | null;
  selectedLibraryCursor: LibraryCursor | null;
  selectedCursor: SelectedCursor;
};

type SelectionAction =
  | { type: 'ENTER_ACTIVE_FIRST' }
  | { type: 'ENTER_LIBRARY_FIRST'; libCursor: LibraryCursor }
  | { type: 'SET_SELECTED_LIBRARY_CURSOR'; libCursor: LibraryCursor | null }
  | { type: 'SET_SELECTED_CURSOR'; cursor: SelectedCursor }
  | { type: 'RESET' };

function reducer(state: CoreSelectionState, action: SelectionAction): CoreSelectionState {
  switch (action.type) {
    case 'ENTER_ACTIVE_FIRST':
      return {
        ...state,
        mode: 'active_first',
        pendingLibraryCursor: null,
        selectedLibraryCursor: null
      };
    case 'ENTER_LIBRARY_FIRST':
      return {
        ...state,
        mode: 'library_first',
        pendingLibraryCursor: action.libCursor,
        selectedLibraryCursor: action.libCursor
      };
    case 'SET_SELECTED_LIBRARY_CURSOR':
      return {
        ...state,
        selectedLibraryCursor: action.libCursor
      };
    case 'SET_SELECTED_CURSOR':
      return {
        ...state,
        selectedCursor: action.cursor
      };
    case 'RESET':
      return {
        mode: 'idle',
        pendingLibraryCursor: null,
        selectedLibraryCursor: null,
        selectedCursor: null
      };
    default:
      return state;
  }
}

const INITIAL_STATE: CoreSelectionState = {
  mode: 'idle',
  pendingLibraryCursor: null,
  selectedLibraryCursor: null,
  selectedCursor: null
};

export function useSelectionStateMachine() {
  const [core, dispatch] = useReducer(reducer, INITIAL_STATE);

  const selectingFromLibrary = core.mode === 'active_first';
  const selectingCursorForCustomization = core.mode !== 'idle';

  const state = useMemo(
    () => ({
      ...core,
      selectingFromLibrary,
      selectingCursorForCustomization
    }),
    [core, selectingCursorForCustomization, selectingFromLibrary]
  );

  const enterActiveFirst = useCallback(() => {
    dispatch({ type: 'ENTER_ACTIVE_FIRST' });
  }, []);

  const enterLibraryFirst = useCallback((libCursor: LibraryCursor) => {
    dispatch({ type: 'ENTER_LIBRARY_FIRST', libCursor });
  }, []);

  const setSelectedLibraryCursor = useCallback((libCursor: LibraryCursor | null) => {
    dispatch({ type: 'SET_SELECTED_LIBRARY_CURSOR', libCursor });
  }, []);

  const setSelectedCursor = useCallback((cursor: SelectedCursor) => {
    dispatch({ type: 'SET_SELECTED_CURSOR', cursor });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    enterActiveFirst,
    enterLibraryFirst,
    setSelectedLibraryCursor,
    setSelectedCursor,
    reset
  };
}
