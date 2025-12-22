import { useState, useCallback, useEffect } from 'react';

import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';

import { useApp } from '../../../context/AppContext';
import { useMessage } from '../../../hooks/useMessage';
import { useAppStore } from '../../../store/useAppStore';
import { Commands } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';
import type { CursorInfo } from '../../../types/generated/CursorInfo';
import type { LibraryCursor } from '../../../types/generated/LibraryCursor';
import type { DraggedLibraryCursor } from '../types';
import type { Message } from '../../../store/slices/uiStateStore';
import { invokeWithFeedback } from '../../../store/operations/invokeWithFeedback';

/**
 * Custom hook for handling library operations
 * Extracts library management, cursor application, and drag-drop logic
 */
export function useLibrary() {

  const { invoke } = useApp();
  const { showMessage } = useMessage();
  const libraryCursors = useAppStore((s) => s.libraryCursors);
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
  const cursorState = useAppStore((s) => s.cursorState);
  const availableCursors = useAppStore((s) => s.availableCursors);

  const showMessageTyped = useCallback(
    (text: string, type?: Message['type']) => {
      const normalizedType: Message['type'] | undefined =
        type === '' || type === undefined ? undefined : type;
      showMessage(text, normalizedType);
    },
    [showMessage]
  );

  // State
  const [localLibrary, setLocalLibrary] = useState<LibraryCursor[]>(Array.isArray(libraryCursors) ? libraryCursors : []);
  const [draggingLib, setDraggingLib] = useState<DraggedLibraryCursor | null>(null);

  // Sync local library ordering state when context updates
  useEffect(() => {
    setLocalLibrary(Array.isArray(libraryCursors) ? libraryCursors : []);
  }, [libraryCursors]);

  type ApplyLibraryCursorArgs = {
    libCursor: LibraryCursor | null | undefined;
    cursorName?: CursorInfo['name'] | null | undefined;
    targetCursor?: CursorInfo | null | undefined;
  };

  // Single implementation for applying a library cursor to a target slot
  const applyLibraryToSlot = useCallback(async (
    libCursor: LibraryCursor | null | undefined,
    targetCursor: CursorInfo | null | undefined
  ) => {
    if (!libCursor) {
      showMessageTyped('No library cursor selected', 'error');
      return;
    }
    if (!targetCursor) {
      showMessageTyped('No target cursor selected', 'error');
      return;
    }
    const size = Number(cursorState?.cursorSize ?? 32);
    const result = await invokeWithFeedback(invoke, Commands.setSingleCursorWithSize, {
      args: {
        cursor_name: targetCursor.name,
        image_path: libCursor.file_path,
        size
      },
      showMessage: showMessageTyped,
      successMessage: `Applied ${libCursor.name} to ${targetCursor.display_name ?? targetCursor.name}`,
      successType: 'success',
      logLabel: 'Failed to apply library cursor to slot:',
      errorMessage: (err) => 'Failed to apply cursor from library: ' + String(err),
      errorType: 'error'
    });

    if (result.status !== 'success') {
      return;
    }

    await Promise.all([
      loadLibraryCursors(),
      loadAvailableCursors()
    ]);
  }, [cursorState?.cursorSize, invoke, loadLibraryCursors, loadAvailableCursors, showMessageTyped]);

  // Higher-level helper that resolves target details before delegating to applyLibraryToSlot
  const applyLibraryCursor = useCallback(async ({
    libCursor,
    cursorName,
    targetCursor
  }: ApplyLibraryCursorArgs) => {
    if (!libCursor) {
      showMessageTyped('No library cursor selected', 'error');
      return;
    }

    const resolvedCursor = targetCursor
      ?? (cursorName ? availableCursors?.find((cursor) => cursor.name === cursorName) ?? null : null);

    if (!resolvedCursor) {
      if (cursorName) {
        showMessageTyped(`Cursor "${cursorName}" is not available`, 'error');
      } else {
        showMessageTyped('No target cursor selected', 'error');
      }
      return;
    }

    await applyLibraryToSlot(libCursor, resolvedCursor);
  }, [applyLibraryToSlot, availableCursors, showMessageTyped]);

  // Backward-compatible helper used by existing components/tests
  const applyLibraryToSelected = useCallback(async (libCursor: LibraryCursor | null | undefined) => {
    await applyLibraryCursor({ libCursor });
  }, [applyLibraryCursor]);

  type DragData =
    | { type: 'library'; lib: DraggedLibraryCursor; displayOrderIds?: string[] }
    | { type: 'slot'; cursor: CursorInfo };

  // Handle drag end for library reordering and cursor application
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    try {
      const activeData = active?.data?.current as DragData | undefined;
      const overData = over?.data?.current as DragData | undefined;

      // Library item dropped onto an Active slot -> apply cursor
      if (activeData?.type === 'library' && overData?.type === 'slot') {
        const lib = activeData.lib;
        const target = overData.cursor;
        if (lib && target) {
          await applyLibraryToSlot(lib, target);

          return;
        }
      }

      // Library reordering within the Library panel
      if (activeData?.type === 'library' && overData?.type === 'library') {
        const activeId = active?.id ? String(active.id) : null;
        const overId = over?.id ? String(over.id) : null;
        if (activeId && overId && activeId !== overId) {
          const displayOrder = Array.isArray(activeData.displayOrderIds) ? (activeData.displayOrderIds as string[]) : null;
          const sourceOrder: string[] = displayOrder?.length ? displayOrder : localLibrary.map((l) => l.id as string);
          const oldIndex = sourceOrder.findIndex((id: string) => id === activeId);
          const newIndex = sourceOrder.findIndex((id: string) => id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrderIds = arrayMove(sourceOrder, oldIndex, newIndex);

            const newList = newOrderIds
              .map((id) => localLibrary.find((item) => item.id === id))
              .filter((item): item is LibraryCursor => Boolean(item));
            setLocalLibrary(newList);

            // Persist the new order to backend
            const result = await invokeWithFeedback(invoke, Commands.reorderLibraryCursors, {
              args: { order: newOrderIds },
              logLabel: 'Failed to persist library order:'
            });
            if (result.status === 'error') {
              logger.warn('Failed to persist library order:', result.error);
            }
            await loadLibraryCursors();
          }
        }
      }
    } finally {
      setDraggingLib(null);
    }
  }, [applyLibraryToSlot, invoke, localLibrary, loadLibraryCursors]);

  // Library order change handler
  const handleLibraryOrderChange = useCallback((newList: LibraryCursor[]) => {
    setLocalLibrary(newList);
  }, []);

  // Set dragging library item
  const setDraggingLibrary = useCallback((libItem: DraggedLibraryCursor | null) => {
    setDraggingLib(libItem);
  }, []);

  // Remove cursor from library
  const removeCursorFromLibrary = useCallback(async (cursorId: string) => {
    const result = await invokeWithFeedback(invoke, Commands.removeCursorFromLibrary, {
      args: { id: cursorId },
      showMessage: showMessageTyped,
      successMessage: 'Cursor removed from library',
      successType: 'success',
      logLabel: 'Failed to remove cursor from library:',
      errorMessage: (err) => 'Failed to remove cursor: ' + String(err),
      errorType: 'error'
    });
    if (result.status === 'success') {
      await loadLibraryCursors();
    }
  }, [invoke, loadLibraryCursors, showMessageTyped]);

  // Rename cursor in library
  const renameCursorInLibrary = useCallback(async (cursorId: string, newName: string) => {
    const result = await invokeWithFeedback(invoke, Commands.renameCursorInLibrary, {
      args: { id: cursorId, new_name: newName },
      showMessage: showMessageTyped,
      successMessage: 'Cursor renamed successfully',
      successType: 'success',
      logLabel: 'Failed to rename cursor:',
      errorMessage: (err) => 'Failed to rename cursor: ' + String(err),
      errorType: 'error'
    });
    if (result.status === 'success') {
      await loadLibraryCursors();
    }
  }, [invoke, loadLibraryCursors, showMessageTyped]);

  return {
    // State
    localLibrary,
    draggingLib,

    // Actions
    applyLibraryCursor,
    applyLibraryToSelected,
    applyLibraryToSlot,

    handleDragEnd,
    handleLibraryOrderChange,
    setDraggingLibrary,
    removeCursorFromLibrary,
    renameCursorInLibrary
  };
}