import { useState, useCallback } from 'react';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';

/**
 * Custom hook for handling cursor selection logic
 * Extracts cursor selection state and operations from the main component
 */
export function useCursorSelection(initialMode: string = 'simple') {
  // State for cursor selection
  const [selectingCursorForCustomization, setSelectingCursorForCustomization] = useState<boolean>(false);
  const [pendingLibraryCursor, setPendingLibraryCursor] = useState<{
    name: string;
    file_path: string;
    [key: string]: any;
  } | null>(null);
  const [selectedLibraryCursor, setSelectedLibraryCursor] = useState<{
    name: string;
    file_path: string;
    [key: string]: any;
  } | null>(null);
  const [customizationMode, setCustomizationMode] = useState<string>(initialMode);

  /**
   * Handle mode change between simple and advanced customization
   */
  /**
   * Create a mode change handler that can be used with the required dependencies
   */
  const createHandleModeChange = useCallback((
    invoke: (command: string, params?: any) => Promise<any>,
    loadAvailableCursors: () => Promise<void>,
    showMessage: (message: string, type?: any) => void
  ) => {
    return async (mode: string) => {
      // Double-check mode to prevent unnecessary calls
      const currentMode = customizationMode;

      // Skip mode change if already in the requested mode
      if (currentMode === mode) {
        logger.debug(`[useCursorSelection] Already in ${mode} mode, skipping mode change`);
        return;
      }

      logger.debug(`[useCursorSelection] Switching from ${currentMode} to ${mode} mode`);

      try {
        await invokeCommand(invoke, Commands.switchCustomizationMode, { mode });
        setCustomizationMode(mode);
        await loadAvailableCursors();
        // showMessage removed per user request to reduce toast spam
      } catch (err) {
        logger.error('Failed to switch mode:', err);

        // Never show toast notification for mode switching failures
        // This prevents annoying notifications when clicking the same mode
        logger.debug('[useCursorSelection] Mode change failed, no toast shown:', err);
      }
    };
  }, [customizationMode]);

  /**
   * Handle browse action - either apply pending cursor or enter selection mode
   */
  const handleBrowse = useCallback(async (
    cursor: {
      name: string;
      display_name: string;
      [key: string]: any;
    } | null
  ) => {
    // If in reverse selection mode, apply pending cursor
    if (pendingLibraryCursor) {
      // This would be handled by the parent component that has access to handleApplyPendingCursor
      // For now, just set the cursor for customization
      setSelectingCursorForCustomization(true);
    } else {
      // Set cursor customization mode
      setSelectingCursorForCustomization(true);
    }
  }, [pendingLibraryCursor]);

  /**
   * Handle cursor selection from library
   */
  const handleSelectFromLibrary = useCallback(async (
    libCursor: {
      name: string;
      file_path: string;
      [key: string]: any;
    } | null
  ) => {
    if (libCursor) {
      // Enter reverse selection mode - this will be handled by parent component
      setPendingLibraryCursor(libCursor);
      setSelectedLibraryCursor(libCursor);
    } else {
      // Cancel selection
      setPendingLibraryCursor(null);
      setSelectedLibraryCursor(null);
    }
  }, []);

  /**
   * Handle applying pending library cursor to an active cursor (reverse selection mode)
   */
  const handleApplyPendingCursor = useCallback(async (
    targetCursor: {
      name: string;
      display_name: string;
      [key: string]: any;
    },
    pendingLibraryCursorParam: {
      name: string;
      file_path: string;
      [key: string]: any;
    },
    cursorState: { cursorSize?: string | number; [key: string]: any },
    invoke: (command: string, params?: any) => Promise<any>,
    showMessage: (message: string, type?: any) => void,
    loadAvailableCursors: () => Promise<void>
  ) => {
    if (!pendingLibraryCursorParam) return;

    try {
      const size = parseInt(String(cursorState?.cursorSize ?? 32), 10);
      await invokeCommand(invoke, Commands.setSingleCursorWithSize, {
        cursor_name: targetCursor.name,
        image_path: pendingLibraryCursorParam.file_path,
        size
      });
      showMessage(`Applied ${pendingLibraryCursorParam.name} to ${targetCursor.display_name}`, 'success');

      // Reload active to update previews
      await loadAvailableCursors();

      // Exit reverse selection mode
      setPendingLibraryCursor(null);
      setSelectedLibraryCursor(null);
    } catch (err) {
      logger.error('Failed to apply library cursor:', err);
      showMessage('Failed to apply cursor: ' + err, 'error');
    }
  }, []);

  /**
   * Cancel browse mode and reset selection state
   */
  const cancelBrowseMode = useCallback(() => {
    setPendingLibraryCursor(null);
    setSelectedLibraryCursor(null);
    setSelectingCursorForCustomization(false);
    // preview.cancelSelection() would be called by parent component
  }, []);

  return {
    // State
    selectingCursorForCustomization,
    pendingLibraryCursor,
    selectedLibraryCursor,
    customizationMode,

    // Setters
    setSelectingCursorForCustomization,
    setPendingLibraryCursor,
    setSelectedLibraryCursor,
    setCustomizationMode,

    // Actions
    createHandleModeChange,
    handleBrowse,
    handleSelectFromLibrary,
    handleApplyPendingCursor,
    cancelBrowseMode
  };
}