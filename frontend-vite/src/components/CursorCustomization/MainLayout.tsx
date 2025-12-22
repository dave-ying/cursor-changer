import React, { useEffect } from 'react';
import { useSafeEventListener } from '../../hooks/useSafeAsync';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Navigation } from './Navigation';
import { ContentArea } from './ContentArea';
import { DragDropContext } from './DragDropContext';
import { ClickOutsideHandler } from './ClickOutsideHandler';
import { ModalManager } from './ModalManager';
import { LibrarySection } from './LibrarySection';
import { ActiveSection } from './ActiveSection';
import type { MainLayoutProps } from './types';

/**
 * Refactored MainLayout component
 * Now composed of smaller, focused components following Single Responsibility Principle
 * Props are grouped by concern for better maintainability
 */
export function MainLayout({
  currentView,
  selectionState,
  cursorState,
  clickPointState,
  modalState,
  dragDropState,
  libraryState,
  actions
}: MainLayoutProps) {
  // Destructure grouped state for easier access
  const {
    pendingLibraryCursor,
    selectedLibraryCursor,
    selectedCursor,
    selectingFromLibrary,
    selectingCursorForCustomization
  } = selectionState;

  const {
    visibleCursors,
    customizationMode,
    defaultCursorStyle,
    accentColor
  } = cursorState;

  const {
    showClickPointPicker,
    clickPointFile,
    clickPointFilePath,
    clickPointItemId,
    clickPointPickerKey
  } = clickPointState;

  const { showSettingsModal } = modalState;
  const { draggingLib } = dragDropState;
  const { localLibrary } = libraryState;

  // Destructure grouped actions
  const { setCurrentView } = actions.view;
  const { cancelBrowseMode, cancelPreviewSelection } = actions.selection;
  const { onAddCursor, onSelectFromLibrary, onLibraryOrderChange, onApplyFromLibrary, onDeleteLibraryCursor, loadLibraryCursors } = actions.library;
  const { onBrowse, onModeChange, onDefaultCursorStyleChange, onResetCursors, loadAvailableCursors } = actions.cursor;
  const { setShowClickPointPicker, setClickPointFile, setClickPointFilePath, setClickPointItemId, onOpenClickPointEditor } = actions.clickPoint;
  const { setShowSettingsModal } = actions.modal;
  const { setDraggingLib, handleDragEnd } = actions.dragDrop;

  // Use safe async patterns for cleanup and event handling
  const { cleanup: cleanupEventListeners } = useSafeEventListener();

  useEffect(() => {
    // Simple cleanup without race conditions
    return () => {
      cleanupEventListeners();
    };
  }, [cleanupEventListeners]);

  return (
    <ErrorBoundary name="MainLayout" showDetails={false} enableRetry={true}>
      {/* Navigation component */}
      <Navigation
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      {/* Click outside handler for selection cancellation */}
      <ClickOutsideHandler
        selectingFromLibrary={selectingFromLibrary}
        pendingLibraryCursor={pendingLibraryCursor}
        selectingCursorForCustomization={selectingCursorForCustomization}
        cancelBrowseMode={cancelBrowseMode}
        cancelPreviewSelection={cancelPreviewSelection}
      />

      {/* Drag and Drop Context with main content */}
      <DragDropContext
        draggingLib={draggingLib}
        setDraggingLib={setDraggingLib}
        handleDragEnd={handleDragEnd}
      >
        {/* Content area with view switching */}
        <ContentArea currentView={currentView}>
          {currentView !== 'settings' && (
            <>
              <ErrorBoundary name="ActiveSection" showDetails={false}>
                <ActiveSection
                  visibleCursors={visibleCursors}
                  customizationMode={customizationMode}
                  selectingFromLibrary={selectingFromLibrary}
                  selectedCursor={selectedCursor}
                  pendingLibraryCursor={pendingLibraryCursor}
                  selectedLibraryCursor={selectedLibraryCursor}
                  selectingCursorForCustomization={selectingCursorForCustomization}
                  defaultCursorStyle={defaultCursorStyle}
                  accentColor={accentColor}
                  onBrowse={onBrowse}
                  onModeChange={onModeChange}
                  onDefaultCursorStyleChange={onDefaultCursorStyleChange}
                  onResetCursors={onResetCursors}
                  onCancelPendingLibraryCursor={cancelBrowseMode}
                  loadAvailableCursors={loadAvailableCursors}
                  draggingLib={draggingLib}
                />
              </ErrorBoundary>

              <ErrorBoundary name="LibrarySection" showDetails={false}>
                <LibrarySection
                  id="library-section"
                  className="flex-1 min-h-0 rounded-[var(--radius-surface)] bg-card text-card-foreground shadow-sm flex flex-col border border-border/40"
                  style={{ flex: '1 1 0%', minHeight: '0px', overflow: 'hidden' }}
                  localLibrary={localLibrary}
                  selectingFromLibrary={selectingFromLibrary}
                  selectedCursor={selectedCursor}
                  pendingLibraryCursor={pendingLibraryCursor}
                  selectedLibraryCursor={selectedLibraryCursor}
                  onAddCursor={() => onAddCursor()}
                  onSelectFromLibrary={onSelectFromLibrary}
                  onOpenClickPointEditor={onOpenClickPointEditor}
                  onLibraryOrderChange={onLibraryOrderChange}
                  onApplyFromLibrary={onApplyFromLibrary}
                  onDeleteLibraryCursor={onDeleteLibraryCursor}
                />
              </ErrorBoundary>
            </>
          )}
        </ContentArea>
      </DragDropContext>

      {/* Modal Manager for all overlay modals */}
      <ModalManager
        showClickPointPicker={showClickPointPicker}
        clickPointFile={clickPointFile}
        clickPointFilePath={clickPointFilePath}
        clickPointItemId={clickPointItemId}
        clickPointPickerKey={clickPointPickerKey}
        setShowClickPointPicker={setShowClickPointPicker}
        setClickPointFile={setClickPointFile}
        setClickPointFilePath={setClickPointFilePath}
        setClickPointItemId={setClickPointItemId}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        loadLibraryCursors={loadLibraryCursors}
      />
    </ErrorBoundary>
  );
}