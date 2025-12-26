import React from 'react';
import { Button } from '@/components/ui/button';
import { ActionPillButton } from './ActionPillButton';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedCursor } from './types';

interface LibraryHeaderProps {
  selectingFromLibrary: boolean;
  selectedCursor: SelectedCursor;
  pendingLibraryCursor: any;
  onAddCursor: () => void;
  onSelectFromLibrary: (cursor: any) => void;
  onToggleCustomizePanel: () => void;
  className?: string;
}

export function LibraryHeader({
  selectingFromLibrary,
  selectedCursor,
  pendingLibraryCursor,
  onAddCursor,
  onSelectFromLibrary,
  onToggleCustomizePanel,
  className
}: LibraryHeaderProps) {
  // Selection Mode Header - Only show when selecting FROM library, not when library cursor is selected
  if (selectingFromLibrary && selectedCursor && !pendingLibraryCursor) {
    return (
      <div className={cn("px-6 pt-5 pb-5 border-b border-border/50 flex-shrink-0 bg-muted/60", className)} style={{
        flexShrink: 0
      }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
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
    );
  }

  // Normal Mode Header with Add Button
  return (
    <div className={cn("px-6 pt-5 pb-5 border-b border-border/50 flex-shrink-0 bg-muted/60", className)} style={{
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
            onClick={onToggleCustomizePanel}
            aria-label="Toggle library options"
          >
            Customize
          </ActionPillButton>
        </div>
      </div>
    </div>
  );
}
