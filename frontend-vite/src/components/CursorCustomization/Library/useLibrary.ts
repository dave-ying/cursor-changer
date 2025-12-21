import { useState, useCallback, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';

import { useApp } from '../../../context/AppContext';
import { useMessage } from '../../../context/MessageContext';
import { useAppStore } from '../../../store/useAppStore';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';

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

  // State
  const [localLibrary, setLocalLibrary] = useState<any[]>(libraryCursors || []);
  const [draggingLib, setDraggingLib] = useState<any>(null);

  // Sync local library ordering state when context updates
  useEffect(() => {
    setLocalLibrary(Array.isArray(libraryCursors) ? libraryCursors : []);
  }, [libraryCursors]);

  // Apply a library cursor to the selected cursor type
  const applyLibraryToSelected = useCallback(async (libCursor: {
    name: string;
    file_path: string;
    targetCursorName?: string;
    [key: string]: any;
  }) => {
    if (!libCursor) return;

    try {
      if (!libCursor.targetCursorName) {
        showMessage('No target cursor selected', 'error');
        return;
      }
      const size = Number(cursorState?.cursorSize ?? 32);
      await invokeCommand(invoke, Commands.setSingleCursorWithSize, {
        cursor_name: libCursor.targetCursorName, // This would be set by parent
        image_path: libCursor.file_path,
        size
      });

      showMessage(`Applied ${libCursor.name} to cursor`, 'success');

      // Refresh both library cursors and available cursors to update previews
      await Promise.all([
        loadLibraryCursors(),
        loadAvailableCursors()
      ]);
    } catch (err) {
      logger.error('Failed to apply library cursor:', err);
      showMessage('Failed to apply cursor from library: ' + err, 'error');
    }
  }, [cursorState?.cursorSize, invoke, loadLibraryCursors, loadAvailableCursors, showMessage]);

  // Apply a library cursor to a specific active cursor slot
  const applyLibraryToSlot = useCallback(async (libCursor: {
    name: string;
    file_path: string;
    [key: string]: any;
  }, targetCursor: {
    name: string;
    display_name: string;
    [key: string]: any;
  }) => {
    if (!libCursor || !targetCursor) return;
    try {
      const size = Number(cursorState?.cursorSize ?? 32);
      await invokeCommand(invoke, Commands.setSingleCursorWithSize, {
        cursor_name: targetCursor.name,
        image_path: libCursor.file_path,
        size
      });

      showMessage(`Applied ${libCursor.name} to ${targetCursor.display_name}`, 'success');

      // Refresh both library cursors and available cursors to update previews
      await Promise.all([
        loadLibraryCursors(),
        loadAvailableCursors()
      ]);
    } catch (err) {
      logger.error('Failed to apply library cursor to slot:', err);
      showMessage('Failed to apply cursor from library: ' + err, 'error');
    }
  }, [cursorState?.cursorSize, invoke, loadLibraryCursors, loadAvailableCursors, showMessage]);

  // Add logging to help debug the cursor application flow
  const debugLog = (message: string, data: any) => {
    logger.debug(`[useLibrary] ${message}`, data);
  };

  // Handle drag end for library reordering and cursor application
  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;
    try {
      const activeData = active?.data?.current;
      const overData = over?.data?.current;

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
        const activeId = active.id;
        const overId = over.id;
        if (activeId && overId && activeId !== overId) {
          const displayOrder = Array.isArray(activeData.displayOrderIds) ? (activeData.displayOrderIds as string[]) : null;
          const sourceOrder: string[] = displayOrder?.length ? displayOrder : localLibrary.map((l) => l.id as string);
          const oldIndex = sourceOrder.findIndex((id: string) => id === activeId);
          const newIndex = sourceOrder.findIndex((id: string) => id === overId);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newOrderIds = arrayMove(sourceOrder, oldIndex, newIndex);

            const newList = newOrderIds
              .map((id) => localLibrary.find((item) => item.id === id))
              .filter(Boolean) as any[];
            setLocalLibrary(newList);

            // Persist the new order to backend
            try {
              await invokeCommand(invoke, Commands.reorderLibraryCursors, {
                order: newOrderIds
              });
              await loadLibraryCursors();
            } catch (err) {
              logger.warn('Failed to persist library order:', err);
              await loadLibraryCursors();
            }
          }
        }
      }
    } finally {
      setDraggingLib(null);
    }
  }, [applyLibraryToSlot, invoke, localLibrary, loadLibraryCursors]);

  // Library order change handler
  const handleLibraryOrderChange = useCallback((newList: any[]) => {
    setLocalLibrary(newList);
  }, []);

  // Set dragging library item
  const setDraggingLibrary = useCallback((libItem: any) => {
    setDraggingLib(libItem);
  }, []);

  // Remove cursor from library
  const removeCursorFromLibrary = useCallback(async (cursorId: string) => {
    try {
      await invokeCommand(invoke, Commands.removeCursorFromLibrary, { id: cursorId });
      showMessage('Cursor removed from library', 'success');
      await loadLibraryCursors();
    } catch (err) {
      logger.error('Failed to remove cursor from library:', err);
      showMessage('Failed to remove cursor: ' + err, 'error');
    }
  }, [invoke, showMessage, loadLibraryCursors]);

  // Rename cursor in library
  const renameCursorInLibrary = useCallback(async (cursorId: string, newName: string) => {
    try {
      await invokeCommand(invoke, Commands.renameCursorInLibrary, { id: cursorId, new_name: newName });
      showMessage('Cursor renamed successfully', 'success');
      await loadLibraryCursors();
    } catch (err) {
      logger.error('Failed to rename cursor:', err);
      showMessage('Failed to rename cursor: ' + err, 'error');
    }
  }, [invoke, showMessage, loadLibraryCursors]);

  return {
    // State
    localLibrary,
    draggingLib,

    // Actions
    applyLibraryToSelected,
    applyLibraryToSlot,
    handleDragEnd,
    handleLibraryOrderChange,
    setDraggingLibrary,
    removeCursorFromLibrary,
    renameCursorInLibrary
  };
}