import type { CursorInfo } from '@/types/generated/CursorInfo';
import type { LibraryCursor } from '@/types/generated/LibraryCursor';
import type { DragEndEvent } from '@dnd-kit/core';

export type DraggedLibraryCursor = LibraryCursor & {
  preview?: string | null;
};

/**
 * Cursor info with optional id for compatibility with usePreview hook
 */
export type SelectedCursor = CursorInfo | null;

/**
 * Selection state for cursor customization workflow
 */
export type SelectionMode = 'idle' | 'active_first' | 'library_first';

export interface SelectionState {
  mode: SelectionMode;
  pendingLibraryCursor: LibraryCursor | null;
  selectedLibraryCursor: LibraryCursor | null;
  selectedCursor: SelectedCursor;
  selectingFromLibrary: boolean;
  selectingCursorForCustomization: boolean;
}

/**
 * Cursor state from the store
 */
export interface CursorState {
  visibleCursors: CursorInfo[];
  availableCursors: CursorInfo[];
  customizationMode: 'simple' | 'advanced';
  defaultCursorStyle: 'windows' | 'mac';
  accentColor?: string;
}

/**
 * Click point editor modal state
 */
export interface ClickPointState {
  showClickPointPicker: boolean;
  clickPointFile: File | null;
  clickPointFilePath: string | null;
  clickPointItemId: string | null;
  clickPointPickerKey: number;
}

/**
 * Modal visibility state
 */
export interface ModalState {
  showSettingsModal: boolean;
  showBrowseModal: boolean;
}

/**
 * Drag and drop state
 */
export interface DragDropState {
  draggingLib: DraggedLibraryCursor | null;
}

/**
 * Library state
 */
export interface LibraryState {
  localLibrary: LibraryCursor[];
}

/**
 * Preview state
 */
export interface PreviewState {
  selectedPreviewUrl: string | null;
  selectedPreviewLoading: boolean;
}

/**
 * Selection-related actions
 */
export interface SelectionActions {
  setSelectedCursor: (cursor: CursorInfo | null) => void;
  setPendingLibraryCursor: (cursor: LibraryCursor | null) => void;
  cancelBrowseMode: () => void;
  cancelPreviewSelection?: () => void;
}

/**
 * Library-related actions
 */
export interface LibraryActions {
  onAddCursor: () => void;
  onSelectFromLibrary: (cursor: LibraryCursor | null) => void;
  onApplyLibraryToSelected: (libCursor: LibraryCursor | null) => void | Promise<void>;
  onApplyLibraryToSlot: (libCursor: LibraryCursor, targetCursor: CursorInfo) => void | Promise<void>;
  onLibraryOrderChange: (newOrder: LibraryCursor[]) => void;
  onApplyFromLibrary: (libCursor: LibraryCursor) => void;
  onDeleteLibraryCursor: (item: { id: string }) => void;
  loadLibraryCursors: () => void | Promise<void>;
}

/**
 * Cursor customization actions
 */
export interface CursorActions {
  onBrowse: (cursor: CursorInfo) => void;
  onModeChange: (mode: 'simple' | 'advanced' | string) => void | Promise<void>;
  onDefaultCursorStyleChange: (value: 'windows' | 'mac') => void | Promise<void>;
  onResetCursors: () => void | Promise<void>;
  loadAvailableCursors: () => void | Promise<void>;
}

/**
 * Click point editor actions
 */
export interface ClickPointActions {
  setShowClickPointPicker: (show: boolean) => void;
  setClickPointFile: (file: File | null) => void;
  setClickPointFilePath: (path: string | null) => void;
  setClickPointItemId: (id: string | null) => void;
  onOpenClickPointEditor: (filePath: string, itemId: string) => void;
}

/**
 * Modal actions
 */
export interface ModalActions {
  setShowSettingsModal: (show: boolean) => void;
  setShowBrowseModal: (show: boolean) => void;
}

/**
 * Drag and drop actions
 */
export interface DragDropActions {
  setDraggingLib: (cursor: DraggedLibraryCursor | null) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

/**
 * View actions
 */
export interface ViewActions {
  setCurrentView: (view: string) => void;
}

/**
 * File handling actions
 */
export interface FileActions {
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Grouped MainLayout props following Single Responsibility Principle
 */
export interface MainLayoutProps {
  currentView: string;

  selectionState: SelectionState;
  cursorState: CursorState;
  clickPointState: ClickPointState;
  modalState: ModalState;
  dragDropState: DragDropState;
  libraryState: LibraryState;
  previewState: PreviewState;

  actions: {
    view: ViewActions;
    selection: SelectionActions;
    library: LibraryActions;
    cursor: CursorActions;
    clickPoint: ClickPointActions;
    modal: ModalActions;
    dragDrop: DragDropActions;
    file: FileActions;
  };
}

/**
 * ActiveSection props with proper types
 */
export interface ActiveSectionProps {
  visibleCursors: CursorInfo[];
  customizationMode: 'simple' | 'advanced';
  selectingFromLibrary: boolean;
  selectedCursor: SelectedCursor;
  pendingLibraryCursor: LibraryCursor | null;
  selectedLibraryCursor: LibraryCursor | null;
  selectingCursorForCustomization: boolean;
  defaultCursorStyle: 'windows' | 'mac';
  accentColor?: string;
  draggingLib?: DraggedLibraryCursor | null;

  onBrowse: (cursor: CursorInfo) => void;
  onModeChange: (value: 'simple' | 'advanced' | string) => void | Promise<void>;
  onDefaultCursorStyleChange: (value: 'windows' | 'mac') => void | Promise<void>;
  onResetCursors: () => void | Promise<void>;
  onCancelPendingLibraryCursor: () => void;
  loadAvailableCursors: () => void | Promise<void>;
}

/**
 * LibrarySection props with proper types
 */
export interface LibrarySectionProps {
  localLibrary: LibraryCursor[];
  selectingFromLibrary: boolean;
  selectedCursor: SelectedCursor;
  pendingLibraryCursor: LibraryCursor | null;
  selectedLibraryCursor: LibraryCursor | null;

  onAddCursor: () => void;
  onSelectFromLibrary: (cursor: LibraryCursor | null) => void;
  onOpenClickPointEditor: (filePath: string, id: string) => void;
  onLibraryOrderChange: (newOrder: LibraryCursor[]) => void;
  onApplyFromLibrary: (cursor: LibraryCursor) => void;
  onDeleteLibraryCursor: (item: { id: string }) => void;

  id?: string;
  className?: string;
  style?: React.CSSProperties;
}
