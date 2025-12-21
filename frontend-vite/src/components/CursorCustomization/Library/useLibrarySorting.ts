import React from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useApp } from '../../../context/AppContext';
import { useAppStore } from '../../../store/useAppStore';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';
import type { LibraryCursor } from '../../../types/generated/LibraryCursor';

type SortMode = 'custom' | 'name' | 'date';
type SortDirection = 'asc' | 'desc';

interface UseLibrarySortingParams {
  localLibrary: LibraryCursor[];
  onLibraryOrderChange?: (newOrder: LibraryCursor[]) => void;
}

export function useLibrarySorting({ localLibrary, onLibraryOrderChange }: UseLibrarySortingParams) {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);

  const [sortBy, setSortBy] = React.useState<SortMode>('date');
  const [sortDirections, setSortDirections] = React.useState<{ name: SortDirection; date: SortDirection }>({
    name: 'asc',
    date: 'desc'
  });

  const previousOrderRef = React.useRef<string>('');
  const previousLengthRef = React.useRef<number>(localLibrary?.length ?? 0);
  const suppressAutoCustomRef = React.useRef<boolean>(false);

  const switchToCustomSort = React.useCallback(() => setSortBy('custom'), []);

  const resetSortState = React.useCallback(() => {
    setSortBy('date');
    setSortDirections((prev) => ({ ...prev, date: 'desc' }));
    suppressAutoCustomRef.current = true;
    previousOrderRef.current = '';
  }, []);

  const displayLibrary = React.useMemo(() => {
    if (!Array.isArray(localLibrary)) return [];
    if (sortBy === 'name') {
      const dir = sortDirections.name === 'asc' ? 1 : -1;
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      return [...localLibrary].sort((a, b) => collator.compare(a.name ?? '', b.name ?? '') * dir);
    }
    if (sortBy === 'date') {
      const dir = sortDirections.date === 'asc' ? 1 : -1;
      return [...localLibrary].sort((a, b) => {
        const aTime = new Date(a.created_at ?? '').getTime();
        const bTime = new Date(b.created_at ?? '').getTime();
        return (aTime - bTime) * dir;
      });
    }
    return localLibrary;
  }, [localLibrary, sortBy, sortDirections]);

  const handleSortSelection = React.useCallback(
    (mode: SortMode) => {
      if (mode === 'custom') {
        switchToCustomSort();
        return;
      }

      if (sortBy === mode) {
        setSortDirections((prev) => ({
          ...prev,
          [mode]: prev[mode] === 'asc' ? 'desc' : 'asc'
        }));
      } else {
        setSortBy(mode);
      }
    },
    [sortBy, switchToCustomSort]
  );

  const handleLibraryReorder = React.useCallback(
    async (activeId: string, overId: string) => {
      if (!activeId || !overId || activeId === overId) return;

      const sourceList = sortBy === 'custom' ? localLibrary : displayLibrary;
      const oldIndex = sourceList.findIndex((l) => l.id === activeId);
      const newIndex = sourceList.findIndex((l) => l.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newList = arrayMove(sourceList, oldIndex, newIndex);
      switchToCustomSort();
      onLibraryOrderChange?.(newList);
      try {
        await invokeCommand(invoke, Commands.reorderLibraryCursors, { order: newList.map((i) => i.id) });
        await loadLibraryCursors();
      } catch (err) {
        logger.warn('Failed to persist library order:', err);
        await loadLibraryCursors();
      }
    },
    [displayLibrary, localLibrary, sortBy, switchToCustomSort, onLibraryOrderChange, invoke, loadLibraryCursors]
  );

  React.useEffect(() => {
    if (!Array.isArray(localLibrary)) return;
    const currentOrder = localLibrary.map((item) => item.id).join('|');
    const lengthChanged = (localLibrary?.length ?? 0) !== previousLengthRef.current;
    if (suppressAutoCustomRef.current) {
      suppressAutoCustomRef.current = false;
    } else if (previousOrderRef.current && previousOrderRef.current !== currentOrder && sortBy !== 'custom' && !lengthChanged) {
      switchToCustomSort();
    }
    previousOrderRef.current = currentOrder;
    previousLengthRef.current = localLibrary?.length ?? 0;
  }, [localLibrary, sortBy, switchToCustomSort]);

  return {
    displayLibrary,
    sortBy,
    sortDirections,
    handleSortSelection,
    handleLibraryReorder,
    resetSortState
  };
}
