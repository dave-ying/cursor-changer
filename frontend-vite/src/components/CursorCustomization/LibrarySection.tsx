import React from 'react';
import { Button } from '@/components/ui/button';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { LibraryCursor } from './LibraryCursor';
import { useApp } from '../../context/AppContext';
import { useAppStore } from '../../store/useAppStore';
import { useMessage } from '../../context/MessageContext';

import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { Plus, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ActionPillButton } from './ActionPillButton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ButtonGroup } from '@/components/ui/button-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLibrarySorting } from './Library/useLibrarySorting';
import { CollapsibleSection } from './CollapsibleSection';

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
  const { showMessage } = useMessage();
  const [showCustomizePanel, setShowCustomizePanel] = React.useState(false);
  const [showMoreOptions, setShowMoreOptions] = React.useState(false);
  const [resetLibraryDialogOpen, setResetLibraryDialogOpen] = React.useState(false);
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

  return (
    <section
      id={id}
      className={`flex flex-col ${selectingFromLibrary && selectedCursor ? 'selection-mode' : ''} ${className}`}
      style={style}
    >
      {/* Selection Mode Header - Only show when selecting FROM library, not when library cursor is selected */}
      {(selectingFromLibrary && selectedCursor) && !pendingLibraryCursor ? (
        <div className="px-6 pt-5 pb-5 border-b border-border/50 flex-shrink-0 bg-muted/60" style={{
          flexShrink: 0
        }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">
                Choose a cursor to replace
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a cursor below
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
        <div className="px-6 pt-5 pb-5 border-b border-border/50 flex-shrink-0 bg-muted/60" style={{
          flexShrink: 0
        }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">Library</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <ActionPillButton
                icon={<Plus />}
                onClick={onAddCursor}
                aria-label="Add a cursor to library"
              >
                Add Cursor
              </ActionPillButton>
              <ActionPillButton
                icon={<SlidersHorizontal />}
                variant="secondary"
                onClick={() => setShowCustomizePanel((prev) => !prev)}
                aria-label="Toggle library options"
              >
                Customize
              </ActionPillButton>
            </div>
          </div>
        </div>
      )}

      {!selectingFromLibrary && !pendingLibraryCursor && (
        <div
          className={`px-6 pb-4 border-b border-border/50 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${showCustomizePanel ? 'opacity-100' : 'opacity-0'}`}
          style={{
            maxHeight: showCustomizePanel ? '280px' : '0px',
            overflowY: showCustomizePanel ? 'auto' : 'hidden'
          }}
          aria-expanded={showCustomizePanel}
        >
          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Sort by</p>
              </div>
              <ToggleGroup
                type="single"
                value={sortBy}
                onValueChange={(v) => v && handleSortSelection(v as 'custom' | 'name' | 'date')}
                className="bg-muted rounded-full p-1 shadow-sm"
                aria-label="Library sort order"
              >
                <ToggleGroupItem
                  value="date"
                  className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  onClick={() => handleSortSelection('date')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date Created
                    {sortBy === 'date'
                      ? (sortDirections.date === 'asc'
                        ? <ArrowUp className="h-3.5 w-3.5" />
                        : <ArrowDown className="h-3.5 w-3.5" />)
                      : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="name"
                  className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  onClick={() => handleSortSelection('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Name
                    {sortBy === 'name'
                      ? (sortDirections.name === 'asc'
                        ? <ArrowUp className="h-3.5 w-3.5" />
                        : <ArrowDown className="h-3.5 w-3.5" />)
                      : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="custom"
                  className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  onClick={() => handleSortSelection('custom')}
                >
                  Custom
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <CollapsibleSection
              id="library-more-options"
              open={showMoreOptions}
              onToggle={() => setShowMoreOptions((prev) => !prev)}
              closedLabel="Show more"
              openLabel="Hide options"
              maxHeight={300}
              className="space-y-2 mt-4"
              contentClassName="pt-1 pb-1 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Library Cursors Folder</p>
                </div>
                <Button
                  id="show-library-folder-btn"
                  className="rounded-full"
                  onClick={handleOpenFolder}
                >
                  Open Folder
                </Button>
              </div>
              <Separator className="my-1" />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Reset All Cursors in Library</p>
                </div>
                <AlertDialog open={resetLibraryDialogOpen} onOpenChange={setResetLibraryDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      id="reset-library-btn"
                      variant="destructive"
                      className="sm:w-auto rounded-full"
                    >
                      Reset Library
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Library</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset your library?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Warning: This action cannot be undone.</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                          <li>All cursors you created and added to the Library will be deleted.</li>
                          <li>Your library will be reset back to default cursors only.</li>
                        </ul>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={handleResetLibrary}
                      >
                        Reset Library
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CollapsibleSection>
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
            {displayLibrary && displayLibrary.length > 0 ? (
              <SortableContext items={displayLibrary.map(l => l.id)} strategy={rectSortingStrategy}>
                {displayLibrary.map((lib, index) => (
                  <LibraryCursor
                    key={lib.id}
                    displayOrderIds={displayLibrary.map(item => item.id)}
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