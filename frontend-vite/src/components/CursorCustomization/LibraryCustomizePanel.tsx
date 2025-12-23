import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { LibraryResetDialog } from './LibraryResetDialog';

interface LibraryCustomizePanelProps {
  showCustomizePanel: boolean;
  showMoreOptions: boolean;
  resetLibraryDialogOpen: boolean;
  sortBy: 'custom' | 'name' | 'date';
  sortDirections: Record<string, 'asc' | 'desc'>;
  onToggleMoreOptions: () => void;
  onSortSelection: (sortBy: 'custom' | 'name' | 'date') => void;
  onOpenFolder: () => void;
  onResetLibraryDialogChange: (open: boolean) => void;
  onResetLibrary: () => void;
}

export function LibraryCustomizePanel({
  showCustomizePanel,
  showMoreOptions,
  resetLibraryDialogOpen,
  sortBy,
  sortDirections,
  onToggleMoreOptions,
  onSortSelection,
  onOpenFolder,
  onResetLibraryDialogChange,
  onResetLibrary
}: LibraryCustomizePanelProps) {
  return (
    <div
      className={`px-6 pb-4 border-b border-border/50 bg-muted/30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${showCustomizePanel ? 'opacity-100' : 'opacity-0'}`}
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
            onValueChange={(v) => v && onSortSelection(v as 'custom' | 'name' | 'date')}
            className="bg-muted rounded-full p-1 shadow-sm"
            aria-label="Library sort order"
          >
            <ToggleGroupItem
              value="date"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              onClick={() => onSortSelection('date')}
            >
              <span className="inline-flex items-center gap-1">
                Date Created
                {sortBy === 'date'
                  ? (sortDirections['date'] === 'asc'
                      ? <ArrowUp className="h-3.5 w-3.5" />
                      : <ArrowDown className="h-3.5 w-3.5" />)
                  : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="name"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              onClick={() => onSortSelection('name')}
            >
              <span className="inline-flex items-center gap-1">
                Name
                {sortBy === 'name'
                  ? (sortDirections['name'] === 'asc'
                      ? <ArrowUp className="h-3.5 w-3.5" />
                      : <ArrowDown className="h-3.5 w-3.5" />)
                  : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="custom"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              onClick={() => onSortSelection('custom')}
            >
              Custom
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <CollapsibleSection
          id="library-more-options"
          open={showMoreOptions}
          onToggle={onToggleMoreOptions}
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
              onClick={onOpenFolder}
            >
              Open Folder
            </Button>
          </div>
          <Separator className="my-1" />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Reset All Cursors in Library</p>
            </div>
            <LibraryResetDialog
              open={resetLibraryDialogOpen}
              onOpenChange={onResetLibraryDialogChange}
              onReset={onResetLibrary}
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
