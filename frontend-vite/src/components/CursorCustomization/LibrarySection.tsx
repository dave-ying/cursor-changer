import React from 'react';

import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { LibraryCursor } from './LibraryCursor';
import { LibraryHeader } from './LibraryHeader';
import { LibraryCustomizePanel } from './LibraryCustomizePanel';
import { useApp } from '../../context/AppContext';
import { useAppStore } from '../../store/useAppStore';
import { useMessage } from '../../hooks/useMessage';
import { useLibrarySorting } from './Library/useLibrarySorting';

import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { cn } from '@/lib/utils';
import { usePersistentBoolean } from '@/hooks/usePersistentBoolean';
import { usePersistentState } from '@/hooks/usePersistentState';
import { persistentKeys } from '@/constants/persistentKeys';

import type { LibrarySectionProps } from './types';

export function LibrarySection({
  localLibrary,
  selectingFromLibrary,
  selectedCursor,
  pendingLibraryCursor,
  selectedLibraryCursor,
  onAddCursor,
  onSelectFromLibrary,
  onOpenPackDetails,
  onOpenClickPointEditor,
  onLibraryOrderChange,
  onApplyFromLibrary,
  onDeleteLibraryCursor,
  id,
  className,
  style
}: LibrarySectionProps) {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const { showMessage } = useMessage();
  const [showCustomizePanel, setShowCustomizePanel] = usePersistentBoolean({
    key: persistentKeys.library.showCustomizePanel,
    defaultValue: false
  });
  const [showMoreOptions, setShowMoreOptions] = usePersistentBoolean({
    key: persistentKeys.library.showMoreOptions,
    defaultValue: false
  });

  const [resetLibraryDialogOpen, setResetLibraryDialogOpen] = React.useState(false);
  const scaleMin = 0.6;
  const scaleMax = 3;
  const previewScaleDefault = 1.65;

  const serializePreviewScale = React.useCallback((value: number) => String(value), []);
  const deserializePreviewScale = React.useCallback((stored: string) => {
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) return previewScaleDefault;
    if (parsed < scaleMin) return scaleMin;
    if (parsed > scaleMax) return scaleMax;
    return parsed;
  }, [previewScaleDefault, scaleMin, scaleMax]);

  const [libraryPreviewScale, setLibraryPreviewScale] = usePersistentState<number>({
    key: persistentKeys.library.previewScale,
    defaultValue: previewScaleDefault,
    serialize: serializePreviewScale,
    deserialize: deserializePreviewScale
  });

  const handleToggleCustomizePanel = React.useCallback(() => {
    setShowMoreOptions(false);
    setShowCustomizePanel((prev) => !prev);
  }, []);

  const handleOpenFolder = async () => {
    try {
      await invokeCommand(invoke, Commands.showLibraryCursorsFolder);
    } catch (error) {
      logger.error('Failed to open library folder:', error);
      showMessage('Failed to open library folder: ' + String(error), 'error');
    }
  };

  const handleResetLibrary = async () => {
    try {
      await invokeCommand(invoke, Commands.resetLibrary);
      await invokeCommand(invoke, Commands.syncLibraryWithFolder);
      resetSortPreference();
      setLibraryPreviewScale(previewScaleDefault);
      await loadLibraryCursors();
      showMessage('Library reset to defaults', 'success');
    } catch (error) {
      logger.error('Failed to reset library:', error);
      showMessage('Failed to reset library: ' + String(error), 'error');
    } finally {
      setResetLibraryDialogOpen(false);
    }
  };

  const {
    displayLibrary,
    sortBy,
    sortDirections,
    handleSortSelection,
    handleLibraryReorder,
    resetSortPreference
  } = useLibrarySorting({
    localLibrary,
    onLibraryOrderChange
  });

  const gridStyle = React.useMemo<React.CSSProperties>(() => {
    // Dynamically size cards and gaps based on preview scale so smaller previews show more columns.
    const normalized = Math.min(1, Math.max(0, (libraryPreviewScale - scaleMin) / (scaleMax - scaleMin))); // 0 at min, 1 at max
    const cardSize = Math.round(78 + normalized * 102); // 78px at min, ~180px at max to keep mid-range 3-up
    const padding = Math.max(5, Math.round(cardSize * 0.05));
    const gapValue = 4 + normalized * 8; // 4px at min, 12px at max

    const gap = `${gapValue}px`;

    // For large scales, use flexible columns to better utilize available width
    // For smaller scales, use fixed columns to maintain grid structure
    const useFlexibleColumns = libraryPreviewScale >= 1.5; // Use flexible layout for large cursors
    
    return {
      '--cursor-grid-template': useFlexibleColumns 
        ? `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
        : `repeat(auto-fill, minmax(${cardSize}px, ${cardSize}px))`,
      '--cursor-grid-min': `${cardSize}px`,
      '--library-item-size': `${cardSize}px`,
      '--library-item-padding': `${padding}px`,
      '--cursor-grid-gap': gap,
      gap,
      gridTemplateColumns: useFlexibleColumns
        ? `repeat(auto-fill, minmax(${cardSize}px, 1fr))`
        : `repeat(auto-fill, minmax(${cardSize}px, ${cardSize}px))`,
      gridAutoRows: `${cardSize}px`,
      gridAutoFlow: 'row',
      justifyContent: useFlexibleColumns ? 'start' : 'center',
      justifyItems: useFlexibleColumns ? 'stretch' : 'center',
      width: '100%'
    } as React.CSSProperties;
  }, [libraryPreviewScale]);

  return (
    <section
      id={id}
      className={cn(
        'flex flex-col',
        selectingFromLibrary && selectedCursor && 'selection-mode',
        className
      )}
      style={style}
    >
      <LibraryHeader
        selectingFromLibrary={selectingFromLibrary}
        selectedCursor={selectedCursor}
        pendingLibraryCursor={pendingLibraryCursor}
        onAddCursor={onAddCursor}
        onSelectFromLibrary={onSelectFromLibrary}
        onToggleCustomizePanel={handleToggleCustomizePanel}
      />

      {!selectingFromLibrary && !pendingLibraryCursor && (
        <LibraryCustomizePanel
          showCustomizePanel={showCustomizePanel}
          showMoreOptions={showMoreOptions}
          resetLibraryDialogOpen={resetLibraryDialogOpen}
          sortBy={sortBy}
          sortDirections={sortDirections}
          onToggleMoreOptions={() => setShowMoreOptions((prev) => !prev)}
          onSortSelection={handleSortSelection}
          previewScale={libraryPreviewScale}
          onPreviewScaleChange={setLibraryPreviewScale}
          onOpenFolder={handleOpenFolder}
          onResetLibraryDialogChange={setResetLibraryDialogOpen}
          onResetLibrary={handleResetLibrary}
        />
      )}

      <div className="p-0 flex-1 flex flex-col overflow-hidden" style={{
        minHeight: 0
      }}>
        <div aria-label="Library" className="scroll-area flex-1 px-6" style={{
          minHeight: 0,
          overflow: 'auto',
          flex: 1
        }}>
          <div
            id="library-grid"
            className={`cursor-grid ${pendingLibraryCursor ? 'dimmed' : ''}`}
            style={gridStyle}
          >

            {displayLibrary && displayLibrary.length > 0 ? (
              <SortableContext items={displayLibrary.map(l => l.id)} strategy={rectSortingStrategy}>
                {displayLibrary.map((lib, index) => (
                  <LibraryCursor
                    key={lib.id}
                    displayOrderIds={displayLibrary.map(item => item.id)}
                    item={lib}
                    previewScale={libraryPreviewScale}
                    selectionMode={Boolean(selectingFromLibrary && selectedCursor)}
                    isSelected={pendingLibraryCursor?.id === lib.id}
                    isHighlighted={selectedLibraryCursor?.id === lib.id}
                    animationIndex={index} // For staggered pulse animation
                    enablePulseAnimation={true} // Enable the new pulse feature
                    onSelect={async () => {
                      const isPack = Boolean(lib.is_pack || lib.pack_metadata);
                      if (isPack) {
                        onOpenPackDetails(lib);
                        return;
                      }
                      await onSelectFromLibrary(lib);
                    }}
                    onApply={async (item) => {
                      const isPack = Boolean(item.is_pack || item.pack_metadata);
                      if (isPack) {
                        onOpenPackDetails(item);
                        return;
                      }
                      await onSelectFromLibrary(item);
                    }}
                    onEdit={(item) => {
                      onOpenClickPointEditor(item.file_path, item.id);
                    }}
                    onDelete={(id: string) => onDeleteLibraryCursor({ id })}
                  />
                ))}
              </SortableContext>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p>No cursors in library yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
