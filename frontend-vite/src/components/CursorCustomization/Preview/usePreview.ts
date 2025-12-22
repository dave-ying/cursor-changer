import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';

/**
 * Custom hook for handling preview operations
 * Extracts preview loading, selection, and management logic
 */
export function usePreview() {
  const { invoke } = useApp();

  // State
  // Store the full selected cursor object (not just image_path) so dependent UI (like ActiveSection)
  // re-renders immediately when a new cursor is chosen or its image changes.
  const [selectedCursor, setSelectedCursor] = useState<{
    name: string;
    display_name: string;
    image_path: string | null;
    [key: string]: any;
  } | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectedPreviewLoading, setSelectedPreviewLoading] = useState<boolean>(false);
  const [selectingFromLibrary, setSelectingFromLibrary] = useState<boolean>(false);

  // Load preview for the currently-selected active cursor
  useEffect(() => {
    let mounted = true;
    if (selectedCursor && selectedCursor.image_path) {
      const imagePath = selectedCursor.image_path;
      setSelectedPreviewLoading(true);
      (async () => {
        try {
          const url = await invokeCommand(invoke, Commands.readCursorFileAsDataUrl, {
            file_path: imagePath
          });
          if (!mounted) return;
          setSelectedPreviewUrl(url);
        } catch (e) {
          logger.warn('Failed to load preview for selected cursor:', e);
          if (!mounted) return;
          setSelectedPreviewUrl(null);
        } finally {
          if (mounted) setSelectedPreviewLoading(false);
        }
      })();
    } else {
      setSelectedPreviewUrl(null);
      setSelectedPreviewLoading(false);
    }
    return () => { mounted = false; };
  }, [selectedCursor, invoke]);

  // Select a cursor for customization (enters library selection mode)
  const selectCursor = useCallback((cursor: {
    name: string;
    display_name: string;
    image_path: string | null;
    [key: string]: any;
  } | null) => {
    if (!cursor) {
      // Allow callers to clear via selectCursor(null)
      setSelectedCursor(null);
      setSelectingFromLibrary(false);
      return;
    }

    // When a cursor is chosen on the left, mark it as the active target
    // and enter "selecting from library" mode so choosing a library item
    // will immediately map to this cursor.
    //
    // Clone to break stale references so React notices changes and
    // preview / ActiveSection update instantly.
    setSelectedCursor({ ...cursor });
    setSelectingFromLibrary(true);
  }, []);

  // Cancel cursor selection (exit library selection mode)
  const cancelSelection = useCallback(() => {
    setSelectingFromLibrary(false);
    setSelectedCursor(null);
  }, []);

  // Handle ESC key to exit selection mode
  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectingFromLibrary) {
      cancelSelection();
    }
  }, [selectingFromLibrary, cancelSelection]);

  // Set up ESC key listener
  useEffect(() => {
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [handleEscKey]);

  // Apply library cursor to selected cursor
  const applyLibraryCursor = useCallback(async (libCursor: {
    name: string;
    file_path: string;
    [key: string]: any;
  }) => {
    if (!libCursor || !selectedCursor) return;

    try {
      // This will be called by parent component to handle the actual application
      return { libCursor, selectedCursor };
    } catch (err) {
      logger.error('Failed to prepare library cursor application:', err);
      throw err;
    }
  }, [selectedCursor]);

  // Get preview for a specific cursor file
  const getPreviewForFile = useCallback(async (filePath: string) => {
    try {
      return await invokeCommand(invoke, Commands.readCursorFileAsDataUrl, { file_path: filePath });
    } catch (e) {
      logger.warn('Failed to load preview for file:', e);
      return null;
    }
  }, [invoke]);

  const resetPreview = useCallback(() => {
    setSelectedPreviewUrl(null);
    setSelectedPreviewLoading(false);
  }, []);

  // Clear all selection state
  const clearSelection = useCallback(() => {
    setSelectedCursor(null);
    setSelectedPreviewUrl(null);
    setSelectedPreviewLoading(false);
    setSelectingFromLibrary(false);
  }, []);

  return {
    // State
    selectedCursor,
    selectedPreviewUrl,
    selectedPreviewLoading,
    selectingFromLibrary,

    // Actions
    selectCursor,
    setSelectedCursor,
    setSelectingFromLibrary,
    setSelectedPreviewUrl,
    setSelectedPreviewLoading,
    resetPreview,
    cancelSelection,
    applyLibraryCursor,
    getPreviewForFile,
    clearSelection
  };
}