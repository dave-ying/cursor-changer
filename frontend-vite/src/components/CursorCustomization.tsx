import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BrowseModal } from './CursorCustomization/FileUpload/BrowseModal';
import { MainLayout } from './CursorCustomization/MainLayout';
import { useCursorCustomizationController } from './CursorCustomization/hooks/useCursorCustomizationController';
import { useAppStore } from '@/store/useAppStore';

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
  const controller = useCursorCustomizationController();
  const { loadAvailableCursors } = controller.actions.cursor;
  const { loadLibraryCursors } = controller.actions.library;
  const tauri = useAppStore((s) => s.tauri);
  const setTauriFunctions = useAppStore((s) => s.setTauriFunctions);

  const [cursorsLoaded, setCursorsLoaded] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const selectedCursorName =
    controller.selectionState.selectedCursor?.display_name ??
    controller.selectionState.selectedCursor?.name ??
    '';

  useEffect(() => {
    let isMounted = true;

    const ensureTauriAndLoad = async () => {
      if (typeof window !== 'undefined') {
        const tauriRuntime = (window as any).__TAURI__;
        if (!tauri?.invoke && tauriRuntime?.core?.invoke) {
          setTauriFunctions({
            invoke: tauriRuntime.core.invoke,
            listen: tauriRuntime.event?.listen ?? null,
            getAppWindow: tauriRuntime.window?.getCurrent ?? null
          });
        }
      }

      try {
        await loadAvailableCursors();
      } catch {
        // Ignore load errors; UI will show empty state
      } finally {
        if (isMounted) setCursorsLoaded(true);
      }

      try {
        await loadLibraryCursors();
      } catch {
        // Ignore load errors; UI will show empty state
      } finally {
        if (isMounted) setLibraryLoaded(true);
      }
    };

    void ensureTauriAndLoad();

    return () => {
      isMounted = false;
    };
  }, [loadAvailableCursors, loadLibraryCursors, setTauriFunctions, tauri?.invoke]);

  return (
    <div
      id="main-content"
      data-testid="cursor-customization"
      className={cn(
        className,
        controller.containerSelection.mode === 'active_first' && "cursor-selection-active selecting-from-library",
        controller.containerSelection.mode === 'library_first' && "cursor-selection-active selecting-library-cursor",
        controller.containerSelection.selectingCursorForCustomization && "cursor-selection-active"
      )}
    >
      <MainLayout
        currentView={controller.currentView}
        selectionState={controller.selectionState}
        cursorState={controller.cursorState}
        clickPointState={controller.clickPointState}
        modalState={controller.modalState}
        dragDropState={controller.dragDropState}
        libraryState={controller.libraryState}
        previewState={controller.previewState}
        actions={controller.actions}
      />

      {/* Browse Modal - Controlled by fileUpload hook */}
      <BrowseModal
        isOpen={controller.browseModal.isOpen}
        onClose={controller.browseModal.onClose}
        onImageFileSelected={controller.browseModal.onImageFileSelected}
        handleFileSelect={controller.browseModal.handleFileSelect}
        clickPointItemId={controller.browseModal.clickPointItemId}
      />

      {/* Test-friendly loading flags */}
      {!cursorsLoaded && <div data-testid="loading-cursors">loading</div>}
      {!libraryLoaded && <div data-testid="loading-library">loading</div>}
      {cursorsLoaded && <div data-testid="cursors-loaded">true</div>}
      {libraryLoaded && <div data-testid="library-loaded">true</div>}
      {selectedCursorName && (
        <div data-testid="selected-cursor" className="sr-only">
          {selectedCursorName}
        </div>
      )}
    </div>
  );
}