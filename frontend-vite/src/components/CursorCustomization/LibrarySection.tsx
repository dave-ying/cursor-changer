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

import type { LibrarySectionProps } from './types';

export function LibrarySection({
  localLibrary,
  selectingFromLibrary,
  selectedCursor,
  pendingLibraryCursor,
  selectedLibraryCursor,
  onAddCursor,
  onSelectFromLibrary,
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
  const [showCustomizePanel, setShowCustomizePanel] = React.useState(false);
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);
  const [resetLibraryDialogOpen, setResetLibraryDialogOpen] = React.useState(false);

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
      resetSortState();
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
    resetSortState
  } = useLibrarySorting({
    localLibrary,
    onLibraryOrderChange
  });

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
        onToggleCustomizePanel={() => setShowCustomizePanel((prev) => !prev)}
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
          <div id="library-grid" className={`cursor-grid ${pendingLibraryCursor ? 'dimmed' : ''}`}>
            {displayLibrary && displayLibrary.length > 0 ? (
              <SortableContext items={displayLibrary.map(l => l.id)} strategy={rectSortingStrategy}>
                {displayLibrary.map((lib, index) => (
                  <LibraryCursor
                    key={lib.id}
                    displayOrderIds={displayLibrary.map(item => item.id)}
                    item={lib}
                    selectionMode={Boolean(selectingFromLibrary && selectedCursor)}
                    isSelected={pendingLibraryCursor?.id === lib.id}
                    isHighlighted={selectedLibraryCursor?.id === lib.id}
                    animationIndex={index} // For staggered pulse animation
                    enablePulseAnimation={true} // Enable the new pulse feature
                    onSelect={async () => {
                      // Always call onSelectFromLibrary.
                      // If in "replace mode", it applies to active.
                      // If in "normal mode", it sets pendingLibraryCursor.
                      await onSelectFromLibrary(lib);
                    }}
                    onApply={async (item) => {
                      // Apply should work exactly like clicking on the cursor
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