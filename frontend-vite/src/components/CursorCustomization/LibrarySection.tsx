import React from 'react';
import { Button } from '@/components/ui/button';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { LibraryCursor } from './LibraryCursor';
import { useApp } from '../../context/AppContext';
import { useAppStore } from '../../store/useAppStore';
import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { Plus } from 'lucide-react';

interface LibrarySectionProps {
  localLibrary: any[];
  selectingFromLibrary: boolean;
  selectedCursor: any;
  pendingLibraryCursor: any;
  selectedLibraryCursor: any;
  onAddCursor: () => void;
  onSelectFromLibrary: (cursor: any) => void;
  onOpenClickPointEditor?: (filePath: string, id: string) => void;
  // Legacy compatibility: older modules and unit tests still pass `onOpenHotspotEditor`.
  onOpenHotspotEditor?: (filePath: string, id: string) => void;
  onLibraryOrderChange: (newOrder: any[]) => void;
  onApplyFromLibrary: (cursor: any) => void;
  onDeleteLibraryCursor: (item: any) => void;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function LibrarySection({
  localLibrary,
  selectingFromLibrary,
  selectedCursor,
  pendingLibraryCursor,
  selectedLibraryCursor,
  onAddCursor,
  onSelectFromLibrary,
  onOpenClickPointEditor,
  onOpenHotspotEditor,
  onLibraryOrderChange,
  onApplyFromLibrary,
  onDeleteLibraryCursor,
  id,
  className,
  style
}: LibrarySectionProps) {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);

  // Handle library reordering
  const handleLibraryReorder = async (activeId: string, overId: string) => {
    if (activeId && overId && activeId !== overId) {
      const oldIndex = localLibrary.findIndex(l => l.id === activeId);
      const newIndex = localLibrary.findIndex(l => l.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newList = arrayMove(localLibrary, oldIndex, newIndex);
        onLibraryOrderChange(newList);
        try {
          await invokeCommand(invoke, Commands.reorderLibraryCursors, { order: newList.map(i => i.id) });
          // Refresh library from backend to ensure canonical order
          await loadLibraryCursors();
        } catch (err) {
          logger.warn('Failed to persist library order:', err);
          // Revert to server state
          await loadLibraryCursors();
        }
      }
    }
  };

  return (
    <section
      id={id}
      className={`flex flex-col ${selectingFromLibrary && selectedCursor ? 'selection-mode' : ''} ${className}`}
      style={style}
    >
      {/* Selection Mode Header - Only show when selecting FROM library, not when library cursor is selected */}
      {(selectingFromLibrary && selectedCursor) && !pendingLibraryCursor ? (
        <div className="px-6 pt-4 pb-4 border-b border-border/50 flex-shrink-0" style={{
          flexShrink: 0
        }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">
                Choose a cursor to replace
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a cursor from the library below
              </p>
            </div>
            <Button
              variant="default"
              className="inline-flex items-center gap-1 rounded-full"
              onClick={(e) => {
                // Prevent any parent click/select handlers
                e.stopPropagation();
                // Signal cancellation back to parent
                onSelectFromLibrary(null);
              }}
              aria-label="Cancel cursor selection"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Normal Mode Header with Add Button */
        <div className="px-6 pt-4 pb-4 border-b border-border/50 flex-shrink-0" style={{
          flexShrink: 0
        }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Library</h1>
            </div>
            <Button
              variant="default"
              className="inline-flex items-center gap-1 rounded-full"
              onClick={onAddCursor}
              aria-label="Add a cursor to library"
            >
              <Plus className="!w-5 !h-5" aria-hidden="true" />
              <span>Add Cursor</span>
            </Button>
          </div>
        </div>
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
            {localLibrary && localLibrary.length > 0 ? (
              <SortableContext items={localLibrary.map(l => l.id)} strategy={rectSortingStrategy}>
                {localLibrary.map((lib, index) => (
                  <LibraryCursor
                    key={lib.id}
                    item={lib}
                    selectionMode={selectingFromLibrary && selectedCursor}
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
                      const cb = onOpenClickPointEditor ?? onOpenHotspotEditor;
                      if (typeof cb === 'function') {
                        cb(item.file_path, item.id);
                      } else {
                        logger.warn('[LibrarySection] onOpenClickPointEditor/onOpenHotspotEditor not provided');
                      }
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