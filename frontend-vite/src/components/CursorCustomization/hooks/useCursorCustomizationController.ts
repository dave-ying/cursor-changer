import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';

import { useApp } from '../../../context/AppContext';
import { useMessage } from '../../../hooks/useMessage';
import { useSafeAsync } from '../../../hooks/useSafeAsync';
import { useAppStore } from '../../../store/useAppStore';
import { Commands } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';
import type { CursorInfo } from '../../../types/generated/CursorInfo';
import type { LibraryCursor } from '../../../types/generated/LibraryCursor';
import type { PackFilePreview } from '@/types/generated/PackFilePreview';
import { invokeWithFeedback } from '../../../store/operations/invokeWithFeedback';
import type { Message } from '../../../store/slices/uiStateStore';
import { useFileUpload } from '../FileUpload/useFileUpload';
import { useLibrary } from '../Library/useLibrary';
import { usePreview } from '../Preview/usePreview';
import { useSelectionStateMachine } from './useSelectionStateMachine';
import { usePersistentBoolean } from '@/hooks/usePersistentBoolean';
import { persistentKeys } from '@/constants/persistentKeys';

export type CursorCustomizationController = ReturnType<typeof useCursorCustomizationController>;

export function useCursorCustomizationController() {
  const { invoke } = useApp();
  const { showMessage } = useMessage();
  const { safeAsync } = useSafeAsync();

  const showMessageTyped = useCallback(
    (text: string, type?: Message['type']) => {
      const normalizedType: Message['type'] | undefined =
        type === '' || type === undefined ? undefined : type;
      showMessage(text, normalizedType);
    },
    [showMessage]
  );

  const availableCursors = useAppStore((s) => s.availableCursors);
  const customizationMode = useAppStore((s) => s.customizationMode);
  const setCustomizationMode = useAppStore((s) => s.setCustomizationMode);
  const loadAvailableCursors = useAppStore((s) => s.operations.loadAvailableCursors);
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const setDefaultCursorStyle = useAppStore((s) => s.operations.setDefaultCursorStyle);
  const cursorState = useAppStore((s) => s.cursorState);

  const selectionMachine = useSelectionStateMachine();
  const selection = selectionMachine.state;
  const preview = usePreview();
  const fileUpload = useFileUpload();
  const library = useLibrary();

  const visibleCursors: CursorInfo[] = useMemo(
    () => (customizationMode === 'simple'
      ? availableCursors.filter((c: CursorInfo) => c.name === 'Normal' || c.name === 'Hand')
      : availableCursors),
    [availableCursors, customizationMode]
  );

  // Local UI state
  const [showSettingsModal, setShowSettingsModal] = usePersistentBoolean({
    key: persistentKeys.modals.showSettings,
    defaultValue: false
  });
  const [showActiveCursorsModal, setShowActiveCursorsModal] = usePersistentBoolean({
    key: persistentKeys.modals.showActiveCursors,
    defaultValue: false
  });
  const [showClickPointPicker, setShowClickPointPicker] = usePersistentBoolean({
    key: persistentKeys.modals.showClickPointPicker,
    defaultValue: false
  });
  const [clickPointItemId, setClickPointItemId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('cursors');
  const [showPackDetailsModal, setShowPackDetailsModal] = useState(false);
  const [packDetails, setPackDetails] = useState<LibraryCursor | null>(null);
  const [packDetailsLoading, setPackDetailsLoading] = useState(false);
  const [packFilePreviews, setPackFilePreviews] = useState<Record<string, string>>({});
  const [isApplyingPack, setIsApplyingPack] = useState(false);

  const resetCustomizePanels = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storage = window.localStorage;
      const keysToClose = [
        persistentKeys.activeSection.showModeToggle,
        persistentKeys.activeSection.showMoreOptions,
        persistentKeys.library.showCustomizePanel,
        persistentKeys.library.showMoreOptions
      ];

      keysToClose.forEach((key) => {
        storage.setItem(key, 'false');
      });
    } catch (error) {
      logger.warn('[CursorCustomization] Failed to reset customize panel state:', error);
    }
  }, []);

  useEffect(() => {
    resetCustomizePanels();
  }, [resetCustomizePanels]);

  useEffect(() => {
    if (currentView === 'cursors') {
      return;
    }

    resetCustomizePanels();
  }, [currentView, resetCustomizePanels]);

  const applyLibraryCursor = useCallback(async (libCursor: LibraryCursor, targetCursor: CursorInfo | null) => {
    await library.applyLibraryCursor({ libCursor, targetCursor });
  }, [library]);

  const handleActiveCursorClick = useCallback(async (cursor: CursorInfo) => {
    if (selection.mode === 'library_first' && selection.pendingLibraryCursor) {
      await applyLibraryCursor(selection.pendingLibraryCursor, cursor);
      selectionMachine.reset();
      preview.resetPreview();
      return;
    }

    selectionMachine.enterActiveFirst();
    selectionMachine.setSelectedCursor(cursor);
  }, [applyLibraryCursor, preview, selection.mode, selection.pendingLibraryCursor, selectionMachine]);

  const handleSelectFromLibrary = useCallback(async (libCursor: LibraryCursor | null) => {
    if (!libCursor) {
      selectionMachine.reset();
      preview.resetPreview();
      selectionMachine.reset();
      return;
    }

    if (selection.mode === 'active_first' && selection.selectedCursor) {
      await applyLibraryCursor(libCursor, selection.selectedCursor);
      preview.resetPreview();
      selectionMachine.reset();
      return;
    }

    selectionMachine.enterLibraryFirst(libCursor);
    preview.resetPreview();
  }, [applyLibraryCursor, preview, selection.mode, selectionMachine, selection.selectedCursor]);

  const applyLibraryToSelected = useCallback(async (libCursor: LibraryCursor | null) => {
    if (!libCursor) {
      preview.resetPreview();
      selectionMachine.reset();
      return;
    }

    if (!selection.selectedCursor) {
      showMessage('Select a cursor on the left first, then choose one from your library.', 'info');
      preview.resetPreview();
      selectionMachine.reset();
      return;
    }

    await applyLibraryCursor(libCursor, selection.selectedCursor);
    preview.resetPreview();
    selectionMachine.reset();
  }, [applyLibraryCursor, preview, selection.selectedCursor, selectionMachine, showMessage]);

  const handleModeChange = useCallback(async (mode: 'simple' | 'advanced' | string) => {
    if (mode !== 'simple' && mode !== 'advanced') return;
    const currentMode = customizationMode;
    if (currentMode === mode) {
      logger.debug(`[CursorCustomization] Already in ${mode} mode, skipping mode change`);
      return;
    }

    logger.debug(`[CursorCustomization] Switching from ${currentMode} to ${mode} mode`);

    await safeAsync(async () => {
      const result = await invokeWithFeedback(invoke, Commands.switchCustomizationMode, {
        args: { mode },
        showMessage: showMessageTyped,
        logLabel: '[CursorCustomization] Failed to switch mode:',
        errorMessage: 'Failed to switch customization mode',
        errorType: 'error'
      });
      if (result.status !== 'success') return;
      setCustomizationMode(mode);
      await loadAvailableCursors();
    }, {
      onError: (err: unknown) => {
        logger.error('[CursorCustomization] Failed to switch mode:', err);
      },
      errorMessage: 'Failed to switch customization mode'
    });
  }, [customizationMode, invoke, loadAvailableCursors, safeAsync, setCustomizationMode, showMessageTyped]);

  const handleDefaultCursorStyleChange = useCallback(async (style: 'windows' | 'mac') => {
    if (!style || style === cursorState?.defaultCursorStyle) return;
    await safeAsync(async () => {
      await setDefaultCursorStyle(style);
      const result = await invokeWithFeedback(invoke, Commands.resetCurrentModeCursors, {
        logLabel: '[CursorCustomization] Failed to reset current mode cursors:',
        errorMessage: 'Failed to change default cursor style',
        errorType: 'error'
      });
      if (result.status !== 'success') return;
      await loadAvailableCursors();
    }, {
      onError: (err: unknown) => {
        logger.error('[CursorCustomization] Failed to change default cursor style:', err);
      },
      errorMessage: 'Failed to change default cursor style'
    });
  }, [cursorState?.defaultCursorStyle, invoke, loadAvailableCursors, safeAsync, setDefaultCursorStyle]);

  const handleResetCursors = useCallback(async () => {
    await safeAsync(async () => {
      const result = await invokeWithFeedback(invoke, Commands.resetCurrentModeCursors, {
        logLabel: '[CursorCustomization] Failed to reset active cursors:',
        errorMessage: 'Failed to reset active cursors',
        errorType: 'error'
      });
      if (result.status !== 'success') return;
      await loadAvailableCursors();
      showMessage('Active Reset to Default', 'success');
    }, {
      onError: (err: unknown) => {
        logger.error('[CursorCustomization] Failed to reset active cursors:', err);
      },
      errorMessage: 'Failed to reset active cursors'
    });
  }, [invoke, loadAvailableCursors, safeAsync, showMessage]);

  const openClickPointEditor = useCallback((filePath: string, itemId: string) => {
    fileUpload.setClickPointFilePathForPicker(filePath);
    setClickPointItemId(itemId);
    setShowClickPointPicker(true);
  }, [fileUpload]);

  const handleImageFileSelected = useCallback((file: File, itemId: string) => {
    fileUpload.setClickPointFileForPicker(file);
    setClickPointItemId(itemId);
    setShowClickPointPicker(true);
  }, [fileUpload]);

  const handleAddCursor = useCallback(() => {
    fileUpload.openBrowseModal();
  }, [fileUpload]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    return fileUpload.handleFileSelect(event);
  }, [fileUpload]);

  const cancelBrowseMode = useCallback(() => {
    preview.resetPreview();
    selectionMachine.reset();
  }, [preview, selectionMachine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selection.mode === 'idle') return;
      cancelBrowseMode();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelBrowseMode, selection.mode]);

  const handleLoadLibraryCursors = useCallback(() => {
    return loadLibraryCursors();
  }, [loadLibraryCursors]);

  const handleDeleteLibraryCursor = useCallback(async (item: { id: string }) => {
    const result = await invokeWithFeedback(invoke, Commands.removeCursorFromLibrary, {
      args: { id: item.id },
      logLabel: '[CursorCustomization] Failed to delete cursor from library:',
      errorMessage: 'Failed to delete cursor from library',
      errorType: 'error'
    });
    if (result.status === 'success') {
      await loadLibraryCursors();
    }
  }, [invoke, loadLibraryCursors]);

  const selectingCursorForCustomization = selection.selectingCursorForCustomization;

  const resolvePackArchivePath = useCallback((cursor: LibraryCursor) => {
    return cursor.pack_metadata?.archive_path ?? cursor.file_path ?? '';
  }, []);

  const handleOpenPackDetails = useCallback(async (cursor: LibraryCursor) => {
    if (!cursor) return;
    if (!(cursor.is_pack || cursor.pack_metadata)) {
      showMessage('This library item is not a cursor pack.', 'info');
      return;
    }

    setPackDetails(cursor);
    setPackFilePreviews({});
    setShowPackDetailsModal(true);

    const archivePath = resolvePackArchivePath(cursor);
    if (!archivePath) {
      showMessage('Cursor pack file is missing or invalid.', 'error');
      setPackDetailsLoading(false);
      return;
    }

    setPackDetailsLoading(true);
    const needsManifest = !(cursor.pack_metadata?.items?.length);

    const loadManifest = needsManifest
      ? (async () => {
          const manifestResult = await invokeWithFeedback(invoke, Commands.getCursorPackManifest, {
            args: { archive_path: archivePath },
            logLabel: '[CursorCustomization] Failed to load cursor pack manifest:',
            errorMessage: 'Failed to load cursor pack details',
            errorType: 'error'
          });

          if (manifestResult.status === 'success') {
            const manifest = manifestResult.value as {
              pack_name?: string;
              mode: LibraryCursor['pack_metadata'] extends infer T ? T extends { mode: infer M } ? M : never : never;
              items: NonNullable<LibraryCursor['pack_metadata']>['items'];
            };

            setPackDetails((prev) => {
              const base = prev ?? cursor;
              return {
                ...base,
                name: manifest.pack_name || base.name,
                is_pack: true,
                pack_metadata: {
                  archive_path: archivePath,
                  mode: manifest.mode as NonNullable<LibraryCursor['pack_metadata']>['mode'],
                  items: manifest.items
                }
              };
            });
          }
        })()
      : Promise.resolve();

    const loadPreviews = (async () => {
      const previewResult = await invokeWithFeedback(invoke, Commands.getCursorPackFilePreviews, {
        args: { archive_path: archivePath },
        logLabel: '[CursorCustomization] Failed to load pack previews:',
        errorMessage: 'Failed to load pack previews',
        errorType: 'error'
      });

      if (previewResult.status === 'success') {
        const values = previewResult.value as PackFilePreview[];
        const previewMap = values.reduce<Record<string, string>>((acc, preview) => {
          acc[preview.file_name.toLowerCase()] = preview.data_url;
          return acc;
        }, {});
        setPackFilePreviews(previewMap);
      }
    })();

    await Promise.all([loadManifest, loadPreviews]);
    setPackDetailsLoading(false);
  }, [invoke, resolvePackArchivePath, showMessage]);

  const closePackDetailsModal = useCallback(() => {
    setShowPackDetailsModal(false);
    setPackDetails(null);
    setPackDetailsLoading(false);
    setIsApplyingPack(false);
    setPackFilePreviews({});
  }, []);

  const handleApplyCursorPack = useCallback(async (pack?: LibraryCursor | null) => {
    const targetPack = pack ?? packDetails;
    if (!targetPack) return;

    setIsApplyingPack(true);
    const result = await invokeWithFeedback(invoke, Commands.applyCursorPack, {
      args: { id: targetPack.id },
      showMessage: showMessageTyped,
      successMessage: `Applied ${targetPack.name || 'cursor pack'}`,
      successType: 'success',
      logLabel: '[CursorCustomization] Failed to apply cursor pack:',
      errorMessage: 'Failed to apply cursor pack',
      errorType: 'error'
    });
    setIsApplyingPack(false);

    if (result.status === 'success') {
      closePackDetailsModal();
      await Promise.all([loadAvailableCursors(), loadLibraryCursors()]);
    }
  }, [closePackDetailsModal, invoke, loadAvailableCursors, loadLibraryCursors, packDetails, showMessageTyped]);

  return {
    containerSelection: {
      mode: selection.mode,
      selectingCursorForCustomization
    },
    currentView,
    selectionState: {
      mode: selection.mode,
      pendingLibraryCursor: selection.pendingLibraryCursor,
      selectedLibraryCursor: selection.selectedLibraryCursor,
      selectedCursor: selection.selectedCursor,
      selectingFromLibrary: selection.selectingFromLibrary,
      selectingCursorForCustomization
    },
    cursorState: {
      visibleCursors,
      availableCursors,
      customizationMode: customizationMode as 'simple' | 'advanced',
      defaultCursorStyle: cursorState?.defaultCursorStyle ?? 'windows',
      accentColor: cursorState?.accentColor
    },
    clickPointState: {
      showClickPointPicker,
      clickPointFile: fileUpload.clickPointFile,
      clickPointFilePath: fileUpload.clickPointFilePath,
      clickPointItemId,
      clickPointPickerKey: 0
    },
    modalState: {
      showSettingsModal,
      showBrowseModal: fileUpload.showBrowseModal,
      showActiveCursorsModal,
      showPackDetailsModal,
      packDetails,
      packDetailsLoading,
      packFilePreviews,
      isApplyingPack
    },
    dragDropState: {
      draggingLib: library.draggingLib
    },
    libraryState: {
      localLibrary: library.localLibrary
    },
    previewState: {
      selectedPreviewUrl: preview.selectedPreviewUrl,
      selectedPreviewLoading: preview.selectedPreviewLoading
    },
    actions: {
      view: {
        setCurrentView
      },
      selection: {
        setSelectedCursor: (cursor: CursorInfo | null) => {
          if (cursor) {
            selectionMachine.setSelectedCursor(cursor);
            selectionMachine.enterActiveFirst();
          } else {
            selectionMachine.reset();
            preview.resetPreview();
          }
        },
        setPendingLibraryCursor: (libCursor: LibraryCursor | null) => {
          if (!libCursor) {
            selectionMachine.reset();
            preview.resetPreview();
            return;
          }
          selectionMachine.enterLibraryFirst(libCursor);
          preview.resetPreview();
        },
        cancelBrowseMode,
        cancelPreviewSelection: preview.resetPreview
      },
      library: {
        onAddCursor: handleAddCursor,
        onSelectFromLibrary: handleSelectFromLibrary,
        onOpenPackDetails: handleOpenPackDetails,
        onApplyLibraryToSelected: applyLibraryToSelected,
        onApplyLibraryToSlot: applyLibraryCursor,
        onLibraryOrderChange: library.handleLibraryOrderChange,
        onApplyFromLibrary: (libCursor: LibraryCursor) => {
          selectionMachine.enterLibraryFirst(libCursor);
          preview.resetPreview();
        },
        onDeleteLibraryCursor: handleDeleteLibraryCursor,
        loadLibraryCursors: handleLoadLibraryCursors
      },
      cursor: {
        onBrowse: handleActiveCursorClick,
        onModeChange: handleModeChange,
        onDefaultCursorStyleChange: handleDefaultCursorStyleChange,
        onResetCursors: handleResetCursors,
        loadAvailableCursors
      },
      clickPoint: {
        setShowClickPointPicker,
        setClickPointFile: fileUpload.setClickPointFileForPicker,
        setClickPointFilePath: fileUpload.setClickPointFilePathForPicker,
        setClickPointItemId,
        onOpenClickPointEditor: openClickPointEditor
      },
      modal: {
        setShowSettingsModal,
        setShowBrowseModal: (show: boolean) => {
          if (show) {
            fileUpload.openBrowseModal();
          } else {
            fileUpload.closeBrowseModal();
          }
        },
        setShowActiveCursorsModal,
        closePackDetailsModal,
        applyCursorPack: handleApplyCursorPack
      },
      dragDrop: {
        setDraggingLib: library.setDraggingLibrary,
        handleDragEnd: library.handleDragEnd
      },
      file: {
        handleFileSelect
      }
    },
    browseModal: {
      isOpen: fileUpload.showBrowseModal,
      onClose: fileUpload.closeBrowseModal,
      onImageFileSelected: handleImageFileSelected,
      handleFileSelect,
      clickPointItemId: clickPointItemId ?? undefined
    }
  };
}
