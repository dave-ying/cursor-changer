import React, { useEffect, useState, useCallback, useReducer } from 'react';
import { useApp } from '../context/AppContext';
import { useMessage } from '../context/MessageContext';
import { useAppStore } from '../store/useAppStore';
import { useSafeAsync } from '../hooks/useSafeAsync';
import { useFileUpload } from './CursorCustomization/FileUpload/useFileUpload';
import { useLibrary } from './CursorCustomization/Library/useLibrary';
import { usePreview } from './CursorCustomization/Preview/usePreview';
import { BrowseModal } from './CursorCustomization/FileUpload/BrowseModal';
import { MainLayout } from './CursorCustomization/MainLayout';

import { CursorInfo } from '../types/generated/CursorInfo';
import { LibraryCursor } from '../types/generated/LibraryCursor';
import { Commands, invokeCommand } from '../tauri/commands';
import { logger } from '../utils/logger';

/**
 * Modular CursorCustomization component
 *
 * This is a refactored version that delegates to focused modules:
 * - useFileUpload: File browsing and upload logic
 * - useLibrary: Library management and cursor application
 * - usePreview: Preview loading and cursor selection
 * - Individual UI components for specific tasks
 */
export function CursorCustomization({ className = '' }: { className?: string }): React.JSX.Element {
  const { invoke } = useApp();
  const { showMessage } = useMessage();
  const availableCursors = useAppStore((s) => s.availableCursors);
  const customizationMode = useAppStore((s) => s.customizationMode);
  const setCustomizationMode = useAppStore((s) => s.setCustomizationMode);
  const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const cursorState = useAppStore((s) => s.cursorState);
  const selectingCursorForCustomization = useAppStore((s) => s.selectingCursorForCustomization);
  const setSelectingCursorForCustomization = useAppStore((s) => s.setSelectingCursorForCustomization);

  // Filter cursors based on mode
  const visibleCursors: CursorInfo[] = customizationMode === 'simple'
    ? availableCursors.filter((c: CursorInfo) => c.name === 'Normal' || c.name === 'Hand')
    : availableCursors;

  // Local UI state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClickPointPicker, setShowClickPointPicker] = useState(false);
  const [clickPointItemId, setClickPointItemId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('cursors');

  type SelectionMode = 'idle' | 'active_first' | 'library_first';

  type SelectionState = {
    mode: SelectionMode;
    pendingLibraryCursor: LibraryCursor | null;
    selectedLibraryCursor: LibraryCursor | null;
  };

  type SelectionAction =
    | { type: 'ENTER_ACTIVE_FIRST' }
    | { type: 'ENTER_LIBRARY_FIRST'; libCursor: LibraryCursor }
    | { type: 'SET_SELECTED_LIBRARY_CURSOR'; libCursor: LibraryCursor | null }
    | { type: 'RESET' };

  const [selection, dispatchSelection] = useReducer(
    (state: SelectionState, action: SelectionAction): SelectionState => {
      switch (action.type) {
        case 'ENTER_ACTIVE_FIRST':
          return {
            mode: 'active_first',
            pendingLibraryCursor: null,
            selectedLibraryCursor: null
          };
        case 'ENTER_LIBRARY_FIRST':
          return {
            mode: 'library_first',
            pendingLibraryCursor: action.libCursor,
            selectedLibraryCursor: action.libCursor
          };
        case 'SET_SELECTED_LIBRARY_CURSOR':
          return {
            ...state,
            selectedLibraryCursor: action.libCursor
          };
        case 'RESET':
          return {
            mode: 'idle',
            pendingLibraryCursor: null,
            selectedLibraryCursor: null
          };
        default:
          return state;
      }
    },
    {
      mode: 'idle',
      pendingLibraryCursor: null,
      selectedLibraryCursor: null
    }
  );

  // Initialize modular hooks
  const fileUpload = useFileUpload();
  const library = useLibrary();
  const preview = usePreview();

  // Safe async hook for operations
  const { safeAsync } = useSafeAsync();

  const refreshAfterAction = useCallback(async (
    action: () => Promise<void>,
    refresh: { available?: boolean; library?: boolean } = { available: true }
  ) => {
    await action();
    const tasks: Array<Promise<void>> = [];
    if (refresh.available) tasks.push(loadAvailableCursors());
    if (refresh.library) tasks.push(loadLibraryCursors());
    await Promise.all(tasks);
  }, [loadAvailableCursors, loadLibraryCursors]);

  // Handle mode change with safe async handling
  const handleModeChange = useCallback(async (mode: 'simple' | 'advanced' | string) => {
    if (mode !== 'simple' && mode !== 'advanced') return;
    // Double-check mode to prevent unnecessary calls
    const currentMode = customizationMode;

    // Skip mode change if already in the requested mode
    if (currentMode === mode) {
      logger.debug(`[CursorCustomization] Already in ${mode} mode, skipping mode change`);
      return;
    }

    logger.debug(`[CursorCustomization] Switching from ${currentMode} to ${mode} mode`);

    await safeAsync(async () => {
      await invokeCommand(invoke, Commands.switchCustomizationMode, { mode });
      setCustomizationMode(mode);
      await loadAvailableCursors();
    }, {
      onError: (err: unknown) => {
        logger.error('[CursorCustomization] Failed to switch mode:', err);
      },
      errorMessage: 'Failed to switch customization mode'
    });
  }, [customizationMode, invoke, setCustomizationMode, loadAvailableCursors, safeAsync]);

  // Apply library cursor to selected slot
  const applyLibraryToSlot = useCallback(async (libCursor: LibraryCursor, targetCursor: CursorInfo) => {
    // useLibrary already refreshes both library and available cursors.
    await library.applyLibraryToSlot(libCursor, targetCursor);
  }, [library]);

  // Handle active cursor click
  // If we have a pending library cursor, apply it to this slot.
  // Otherwise, enter selection mode (standard behavior).
  const handleActiveCursorClick = useCallback(async (cursor: CursorInfo) => {
    if (selection.mode === 'library_first' && selection.pendingLibraryCursor) {
      await applyLibraryToSlot(selection.pendingLibraryCursor, cursor);
      dispatchSelection({ type: 'RESET' });
      setSelectingCursorForCustomization(false);
      preview.cancelSelection();
      return;
    }

    dispatchSelection({ type: 'ENTER_ACTIVE_FIRST' });
    setSelectingCursorForCustomization(true);
    preview.selectCursor(cursor);
  }, [selection.mode, selection.pendingLibraryCursor, applyLibraryToSlot, preview, setSelectingCursorForCustomization]);

  // Handle cursor selection from library
  // If we are in "replace mode" (active cursor selected), apply to it.
  // Otherwise, set this library cursor as "pending" for the next active cursor click.
  const handleSelectFromLibrary = useCallback(async (libCursor: LibraryCursor | null) => {
    // If user cancelled from LibrarySection (passed null), clear all selection modes.
    if (!libCursor) {
      preview.cancelSelection();
      dispatchSelection({ type: 'RESET' });
      setSelectingCursorForCustomization(false);
      return;
    }

    // Case 1: We are in "replace mode" (Active cursor was clicked first)
    if (selection.mode === 'active_first' && preview.selectedCursor) {
      try {
        const size = parseInt(cursorState?.cursorSize?.toString() ?? '32');
        const result = await invokeCommand(invoke, Commands.setSingleCursorWithSize, {
          cursor_name: preview.selectedCursor.name,
          image_path: libCursor.file_path,
          size
        });

        logger.debug('[CursorCustomization] Applied cursor from library selection mode:', {
          libId: libCursor.id,
          libName: libCursor.name,
          targetCursor: preview.selectedCursor.name,
          result
        });

        showMessage(
          `Applied ${libCursor.name} to ${preview.selectedCursor.display_name}`,
          'success'
        );

        await refreshAfterAction(async () => Promise.resolve(), { available: true });
      } catch (err: unknown) {
        logger.error('Failed to apply library cursor from selection mode:', err);
        showMessage('Failed to apply cursor from library: ' + String(err), 'error');
      } finally {
        preview.clearSelection();
        dispatchSelection({ type: 'RESET' });
        setSelectingCursorForCustomization(false);
      }
      return;
    }

    // Case 2: No active cursor selected yet. Set this library item as pending.
    // This enables "reverse selection" mode: Click Library -> Click Active to apply.
    dispatchSelection({ type: 'ENTER_LIBRARY_FIRST', libCursor });
    setSelectingCursorForCustomization(true);
    preview.cancelSelection();
  }, [preview, selection.mode, cursorState?.cursorSize, invoke, showMessage, refreshAfterAction, setSelectingCursorForCustomization]);

  // Open click point editor for library item
  const openClickPointEditor = useCallback((filePath: string, itemId: string) => {
    fileUpload.setClickPointFilePathForPicker(filePath);
    setClickPointItemId(itemId);
    setShowClickPointPicker(true);
  }, [fileUpload]);

  // Handle image file selection (from BrowseModal)
  const handleImageFileSelected = useCallback((file: File, itemId: string) => {
    fileUpload.setClickPointFileForPicker(file);
    setClickPointItemId(itemId);
    setShowClickPointPicker(true);
  }, [fileUpload]);

  // Add cursor handler (opens browse modal)
  const handleAddCursor = useCallback(() => {
    fileUpload.openBrowseModal();
  }, [fileUpload]);

  // Apply library cursor to selected cursor (slot click)
  // After applying via this path, selection mode should always exit.
  const applyLibraryToSelected = useCallback(async (libCursor: LibraryCursor | null) => {
    if (!libCursor) {
      preview.cancelSelection();
      dispatchSelection({ type: 'RESET' });
      return;
    }

    if (!preview.selectedCursor) {
      // If, for any reason, no active cursor is selected, inform and exit.
      showMessage('Select a cursor on the left first, then choose one from your library.', 'info');
      preview.cancelSelection();
      dispatchSelection({ type: 'RESET' });
      return;
    }

    await handleSelectFromLibrary(libCursor);
    // handleSelectFromLibrary already clears selection on success/failure,
    // so we are guaranteed to exit the mode once a library cursor is chosen.
  }, [preview, handleSelectFromLibrary, showMessage]);

  // Handle file selection from BrowseModal
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    return fileUpload.handleFileSelect(event);
  }, [fileUpload]);

  // Handle drag end from Library component
  const handleDragEnd = useCallback((event: any) => {
    library.handleDragEnd(event);
  }, [library]);

  // Cancel selection mode
  const cancelBrowseMode = useCallback(() => {
    preview.cancelSelection();
    dispatchSelection({ type: 'RESET' });
    setSelectingCursorForCustomization(false);
  }, [preview, setSelectingCursorForCustomization]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!preview.selectingFromLibrary && selection.mode === 'idle' && !selectingCursorForCustomization) return;
      cancelBrowseMode();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelBrowseMode, preview.selectingFromLibrary, selectingCursorForCustomization, selection.mode]);

  // Refresh library
  const handleLoadLibraryCursors = useCallback(() => {
    loadLibraryCursors();
  }, [loadLibraryCursors]);

  const handleApplyFromLibrary = useCallback((libCursor: LibraryCursor) => {
    // Enter reverse selection mode: library first, then click an active cursor.
    dispatchSelection({ type: 'ENTER_LIBRARY_FIRST', libCursor });
    setSelectingCursorForCustomization(true);
    preview.cancelSelection();
  }, [preview, setSelectingCursorForCustomization]);

  const handleDeleteLibraryCursor = useCallback(async (item: any) => {
    try {
      await refreshAfterAction(async () => {
        await invokeCommand(invoke, Commands.removeCursorFromLibrary, { id: item?.id });
      }, { library: true, available: false });
    } catch (err) {
      logger.error('Failed to delete cursor from library:', err);
    }
  }, [invoke, refreshAfterAction]);

  return (
    <div
      id="main-content"
      className={[
        className,
        selection.mode === 'active_first' ? "cursor-selection-active selecting-from-library" : "",
        selection.mode === 'library_first' ? "cursor-selection-active selecting-library-cursor" : "",
        selectingCursorForCustomization ? "cursor-selection-active" : ""
      ].filter(Boolean).join(" ")}
    >
      <MainLayout
        // State
        currentView={currentView}
        showBrowseModal={fileUpload.showBrowseModal}
        selectingFromLibrary={selection.mode === 'active_first'}
        selectedCursor={preview.selectedCursor}
        pendingLibraryCursor={selection.pendingLibraryCursor}
        selectedLibraryCursor={selection.selectedLibraryCursor}
        selectingCursorForCustomization={selectingCursorForCustomization}
        showClickPointPicker={showClickPointPicker}
        clickPointFile={fileUpload.clickPointFile}
        clickPointFilePath={fileUpload.clickPointFilePath}
        clickPointItemId={clickPointItemId}
        clickPointPickerKey={0}
        showSettingsModal={showSettingsModal}
        draggingLib={library.draggingLib}
        localLibrary={library.localLibrary}
        selectedPreviewUrl={preview.selectedPreviewUrl}
        selectedPreviewLoading={preview.selectedPreviewLoading}
        visibleCursors={visibleCursors}
        customizationMode={customizationMode}
        availableCursors={availableCursors}

        // Actions
        setCurrentView={setCurrentView}
        setShowBrowseModal={fileUpload.openBrowseModal}
        setSelectingFromLibrary={(selecting: boolean) => {
          preview.setSelectingFromLibrary(selecting);
          if (!selecting) {
            dispatchSelection({ type: 'RESET' });
            return;
          }
          dispatchSelection({ type: 'ENTER_ACTIVE_FIRST' });
        }}
        setSelectedCursor={(cursor: CursorInfo | null) => {
          preview.selectCursor(cursor);
          if (!cursor) {
            dispatchSelection({ type: 'RESET' });
            return;
          }
          dispatchSelection({ type: 'ENTER_ACTIVE_FIRST' });
        }}
        setShowClickPointPicker={setShowClickPointPicker}
        setClickPointFile={fileUpload.setClickPointFileForPicker}
        setClickPointFilePath={fileUpload.setClickPointFilePathForPicker}
        setClickPointItemId={setClickPointItemId}
        setShowSettingsModal={setShowSettingsModal}
        setDraggingLib={library.setDraggingLibrary}
        setLocalLibrary={library.handleLibraryOrderChange}
        // Ensure preview card re-renders immediately when a cursor is applied
        setSelectedPreviewUrl={preview.setSelectedPreviewUrl}
        setSelectedPreviewLoading={preview.setSelectedPreviewLoading}
        onBrowse={handleActiveCursorClick}
        onModeChange={handleModeChange}

        // Pass both the new and legacy prop names for compatibility.
        onOpenClickPointEditor={openClickPointEditor}
        onOpenHotspotEditor={openClickPointEditor}
        onAddCursor={handleAddCursor}
        onSelectFromLibrary={handleSelectFromLibrary}
        onApplyLibraryToSelected={applyLibraryToSelected}
        onApplyLibraryToSlot={applyLibraryToSlot}
        onLibraryOrderChange={library.handleLibraryOrderChange}
        onApplyFromLibrary={handleApplyFromLibrary}
        onDeleteLibraryCursor={handleDeleteLibraryCursor}
        handleDragEnd={handleDragEnd}
        handleFileSelect={handleFileSelect}
        cancelBrowseMode={cancelBrowseMode}
        loadLibraryCursors={handleLoadLibraryCursors}
        loadAvailableCursors={loadAvailableCursors}
        setPendingLibraryCursor={(libCursor: LibraryCursor | null) => {
          if (!libCursor) {
            dispatchSelection({ type: 'RESET' });
            return;
          }
          dispatchSelection({ type: 'ENTER_LIBRARY_FIRST', libCursor });
        }}
      />

      {/* Browse Modal - Controlled by fileUpload hook */}
      <BrowseModal
        isOpen={fileUpload.showBrowseModal}
        onClose={fileUpload.closeBrowseModal}
        onImageFileSelected={handleImageFileSelected}
        handleFileSelect={handleFileSelect}
        clickPointItemId={clickPointItemId ?? undefined}
      />
    </div>
  );
}