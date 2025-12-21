import React, { useEffect } from 'react';
import { useSafeTimer, useSafeEventListener } from '../../hooks/useSafeAsync';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Navigation } from './Navigation';
import { ContentArea } from './ContentArea';
import { DragDropContext } from './DragDropContext';
import { ClickOutsideHandler } from './ClickOutsideHandler';
import { ModalManager } from './ModalManager';
import { LibrarySection } from './LibrarySection';
import { ActiveSection } from './ActiveSection';

/**
 * Refactored MainLayout component
 * Now composed of smaller, focused components following Single Responsibility Principle
 */
export function MainLayout(props: {
  // State
  currentView: string;
  showBrowseModal: boolean;
  selectingFromLibrary: boolean;
  selectedCursor: any;
  pendingLibraryCursor: any;
  selectedLibraryCursor: any;
  selectingCursorForCustomization: boolean;
  showClickPointPicker: boolean;
  clickPointFile: File | null;
  clickPointFilePath: string | null;
  clickPointItemId: string | null;
  clickPointPickerKey: number;
  showSettingsModal: boolean;
  draggingLib: any;
  localLibrary: any[];
  selectedPreviewUrl: string | null;
  selectedPreviewLoading: boolean;
  visibleCursors: any[];
  customizationMode: 'simple' | 'advanced' | string;
  availableCursors: any[];
  defaultCursorStyle: 'windows' | 'mac';
  accentColor?: string;
  onResetCursors: () => void | Promise<void>;

  // Actions
  setCurrentView: (view: string) => void;
  setShowBrowseModal: (show: boolean) => void;
  setSelectingFromLibrary: (selecting: boolean) => void;
  setSelectedCursor: (cursor: any) => void;
  setShowClickPointPicker: (show: boolean) => void;
  setClickPointFile: (file: File | null) => void;
  setClickPointFilePath: (path: string | null) => void;
  setClickPointItemId: (id: string | null) => void;
  setShowSettingsModal: (show: boolean) => void;
  setDraggingLib: (dragging: any) => void;
  setLocalLibrary: (library: any[]) => void;
  setSelectedPreviewUrl: (url: string | null) => void;
  setSelectedPreviewLoading: (loading: boolean) => void;
  onBrowse: (cursor: any) => void;
  onModeChange: (mode: 'simple' | 'advanced' | string) => void | Promise<void>;

  // New unified prop name for Click Point / Hotspot editor — both prop names are accepted for
  // backwards compatibility: `onOpenClickPointEditor` (new) and `onOpenHotspotEditor` (legacy).
  onOpenHotspotEditor?: (filePath: string, itemId: string) => void;
  onOpenClickPointEditor?: (filePath: string, itemId: string) => void;
  onAddCursor: () => void;
  onSelectFromLibrary: (cursor: any) => void;
  onApplyLibraryToSelected: (libCursor: any) => void | Promise<void>;
  onApplyLibraryToSlot: (libCursor: any, targetCursor: any) => void | Promise<void>;
  onLibraryOrderChange: (newOrder: any[]) => void;
  onApplyFromLibrary: (libCursor: any) => void;
  onDeleteLibraryCursor: (item: any) => void;
  handleDragEnd: (event: any) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cancelBrowseMode: () => void;
  cancelPreviewSelection?: () => void;
  loadLibraryCursors: () => void | Promise<void>;
  loadAvailableCursors: () => void | Promise<void>;
  setPendingLibraryCursor: (cursor: any) => void;
  onDefaultCursorStyleChange: (value: 'windows' | 'mac') => void | Promise<void>;
  onResetCursors: () => void | Promise<void>;
}) {
  // Destructure props for easier access
  const {
    // State
    currentView,
    showBrowseModal,
    selectingFromLibrary,
    selectedCursor,
    pendingLibraryCursor,
    selectedLibraryCursor,
    selectingCursorForCustomization,
    showClickPointPicker,
    clickPointFile,
    clickPointFilePath,
    clickPointItemId,
    clickPointPickerKey,
    showSettingsModal,
    draggingLib,
    localLibrary,
    selectedPreviewUrl,
    selectedPreviewLoading,
    visibleCursors,
    customizationMode,
    availableCursors,
    defaultCursorStyle,
    accentColor,

    // Actions
    setCurrentView,
    setShowBrowseModal,
    setSelectingFromLibrary,
    setSelectedCursor,
    setShowClickPointPicker,
    setClickPointFile,
    setClickPointFilePath,
    setClickPointItemId,
    setShowSettingsModal,
    setDraggingLib,
    setLocalLibrary,
    setSelectedPreviewUrl,
    setSelectedPreviewLoading,
    onBrowse,
    onModeChange,
    onOpenHotspotEditor,
    onOpenClickPointEditor,
    onAddCursor,
    onSelectFromLibrary,
    onApplyLibraryToSelected,
    onApplyLibraryToSlot,
    onLibraryOrderChange,
    onApplyFromLibrary,
    onDeleteLibraryCursor,
    handleDragEnd,
    handleFileSelect,
    cancelBrowseMode,
    cancelPreviewSelection,
    loadLibraryCursors,
    loadAvailableCursors,
    setPendingLibraryCursor,
    onDefaultCursorStyleChange,
    onResetCursors
  } = props;

  // Use safe async patterns for cleanup and event handling
  const { cleanup: cleanupEventListeners } = useSafeEventListener();
  const { safeSetTimeout } = useSafeTimer();

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
                  onBrowse={(cursor: any) => onBrowse(cursor)}
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
                  // Accept either the new `onOpenClickPointEditor` or legacy `onOpenHotspotEditor`.
                  onOpenClickPointEditor={onOpenClickPointEditor ?? onOpenHotspotEditor}
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