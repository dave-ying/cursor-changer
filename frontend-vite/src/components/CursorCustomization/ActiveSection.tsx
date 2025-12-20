import React from 'react';
import { ActiveCursor } from './ActiveCursor';
import { ModeToggle } from './ModeToggle';
import { Button } from '@/components/ui/button';
import { logger } from '../../utils/logger';

interface ActiveSectionProps {
  visibleCursors: any[];
  customizationMode: string;
  selectingFromLibrary: boolean;
  selectedCursor: any;
  pendingLibraryCursor: any;
  selectedLibraryCursor: any;
  selectingCursorForCustomization: boolean;
  onBrowse: (cursor: any) => void;
  onModeChange: (value: string) => void;
  onCancelPendingLibraryCursor: () => void;
  loadAvailableCursors: () => void;
  draggingLib?: any;
}

export function ActiveSection({
  visibleCursors,
  customizationMode,
  selectingFromLibrary,
  selectedCursor,
  pendingLibraryCursor,
  selectedLibraryCursor,
  selectingCursorForCustomization,
  onBrowse,
  onModeChange,
  onCancelPendingLibraryCursor,
  loadAvailableCursors,
  draggingLib
}: ActiveSectionProps) {
  const safeVisibleCursors = Array.isArray(visibleCursors) ? visibleCursors : [];

  if (!Array.isArray(visibleCursors)) {
    logger.warn(
      '[ActiveSection] visibleCursors is not an array; received:',
      visibleCursors
    );
  }

  return (
    <section
      id="active-cursors-section"
      className="rounded-lg border bg-card text-card-foreground shadow-sm"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        overflow: 'clip'
      }}
    >
      {/* Header - Conditional based on selection mode */}
      <div
        className={`px-6 pt-4 pb-4 border-b border-border/50 ${selectingCursorForCustomization ? 'cursor-customization-header-blurred' : ''
          }`}
        style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {pendingLibraryCursor ? (
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">
                Choose a cursor to replace
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select an active cursor to apply "{pendingLibraryCursor.name}"
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground">
                Active
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Click on any cursor to change it
              </p>
            </div>
          )}

          {pendingLibraryCursor ? (
            <Button
              variant="default"
              className="inline-flex items-center gap-1 rounded-full"
              onClick={onCancelPendingLibraryCursor}
              aria-label="Cancel cursor selection"
            >
              Cancel
            </Button>
          ) : (
            <div className="flex-shrink-0">
              <ModeToggle
                value={customizationMode}
                onValueChange={onModeChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Cursor Grid */}
      <div
        id="cursor-grid"
        // Dim the grid only if we are selecting FROM the library (focus is on library panel)
        // If we are applying a pending cursor, we want the grid to be active/highlighted
        className={`cursor-grid px-6 py-6 ${selectingFromLibrary && selectedCursor ? 'dimmed' : ''} ${customizationMode === 'advanced' ? 'cursor-grid--advanced' : ''}`}
        data-testid="cursor-grid"
      >
        {safeVisibleCursors.map((cursor, index) => (
          <ActiveCursor
            key={cursor.name}
            cursor={cursor}
            onBrowse={onBrowse}
            // Highlight the card if it's the one being replaced (in selectingFromLibrary mode)
            isSelected={selectingFromLibrary && selectedCursor?.name === cursor.name}
            // Highlight as target if we have a pending library cursor
            isTarget={Boolean(pendingLibraryCursor)}
            animationIndex={index} // For staggered pulse animation during reverse selection
            enablePulseAnimation={true} // Enable pulse animation for reverse selection mode
            loadAvailableCursors={loadAvailableCursors}
            draggingLib={draggingLib}
          />
        ))}
      </div>
    </section>
  );
}