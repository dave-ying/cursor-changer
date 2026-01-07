import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { LibraryResetDialog } from './LibraryResetDialog';

interface LibraryCustomizePanelProps {
  showCustomizePanel: boolean;
  resetLibraryDialogOpen: boolean;
  sortBy: 'custom' | 'date';
  sortDirections: Record<'date', 'asc' | 'desc'>;
  previewScale: number;
  onSortSelection: (sortBy: 'custom' | 'date') => void;
  onPreviewScaleChange: (scale: number) => void;
  onOpenFolder: () => void;
  onResetLibraryDialogChange: (open: boolean) => void;
  onResetLibrary: () => void;
}

export function LibraryCustomizePanel({
  showCustomizePanel,
  resetLibraryDialogOpen,
  sortBy,
  sortDirections,
  previewScale,
  onSortSelection,
  onPreviewScaleChange,
  onOpenFolder,
  onResetLibraryDialogChange,
  onResetLibrary
}: LibraryCustomizePanelProps) {
  return (
    <div
      className={`px-6 pb-4 border-b border-border/50 bg-muted/30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${showCustomizePanel ? 'opacity-100' : 'opacity-0'}`}
      style={{
        maxHeight: showCustomizePanel ? '400px' : '0px',
        overflow: 'hidden'
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
            onValueChange={(v) => v && onSortSelection(v as 'custom' | 'date')}
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
              value="custom"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Custom
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-foreground whitespace-nowrap">Display Size</p>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Small</span>
            <Slider
              min={0.6}
              max={3}
              step={0.05}
              value={[previewScale]}
              onValueChange={(value) => {
                const next = value?.[0];
                if (typeof next === 'number') onPreviewScaleChange(next);
              }}
              onValueCommit={(value) => {
                const next = value?.[0];
                if (typeof next === 'number') onPreviewScaleChange(next);
              }}
              className="w-40 sm:w-56 md:w-64"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Large</span>
          </div>
        </div>
        <div className="pt-4 space-y-4">
          <Button
            id="show-library-folder-btn"
            className="w-[65%] mx-auto flex justify-center rounded-full px-4 py-2 h-auto transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
            onClick={onOpenFolder}
          >
            Open Library Folder on Computer
          </Button>
          <LibraryResetDialog
            open={resetLibraryDialogOpen}
            onOpenChange={onResetLibraryDialogChange}
            onReset={onResetLibrary}
          />
        </div>
      </div>
    </div>
  );
}
