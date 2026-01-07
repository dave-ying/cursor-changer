import React from 'react';
import { ActiveCursor } from './ActiveCursor';
import { ModeToggle } from './ModeToggle';
import { Button } from '@/components/ui/button';
import { logger } from '../../utils/logger';
import { SlidersHorizontal } from 'lucide-react';
import { ActionPillButton } from './ActionPillButton';
import { CollapsibleSection } from './CollapsibleSection';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { usePersistentBoolean } from '@/hooks/usePersistentBoolean';
import { persistentKeys } from '@/constants/persistentKeys';

import type { ActiveSectionProps } from './types';

// Interface is now imported from ./types

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
  onResetCursors,
  onCancelPendingLibraryCursor,
  loadAvailableCursors,
  draggingLib,
  onShowActiveCursorsModal
}: ActiveSectionProps) {
  const safeVisibleCursors = Array.isArray(visibleCursors) ? visibleCursors : [];

  const [showModeToggle, setShowModeToggle] = React.useState(false);
  const [showCursorNames, setShowCursorNames] = usePersistentBoolean({
    key: persistentKeys.activeSection.showCursorNames,
    defaultValue: false
  });
  const handleToggleCustomizePanel = React.useCallback(() => {
    setShowModeToggle((prev) => !prev);
  }, []);

  if (!Array.isArray(visibleCursors)) {
    logger.warn(
      '[ActiveSection] visibleCursors is not an array; received:',
      visibleCursors
    );
  }

  return (
    <section
      id="active-cursors-section"
      className={cn(
        'rounded-[var(--radius-surface)] border bg-card text-card-foreground shadow-sm active-section',
        showModeToggle && 'active-section--toolbar-open'
      )}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      {/* Header - Conditional based on selection mode */}
      <div
        className={cn(
          'px-6 pt-5 pb-5 border-b border-border/50 active-cursors-header bg-muted/60',
          selectingFromLibrary && selectedCursor && !pendingLibraryCursor && 'cursor-customization-header-blurred'
        )}
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
                Active Cursors
              </h1>
            </div>
          )}

          {pendingLibraryCursor ? (
            <div className="flex-shrink-0">
              <Button
                variant="default"
                className="inline-flex items-center gap-1 rounded-full"
                onClick={onCancelPendingLibraryCursor}
                aria-label="Cancel cursor selection"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <ActionPillButton
                icon={<SlidersHorizontal />}
                variant="secondary"
                onClick={handleToggleCustomizePanel}
                aria-label="Toggle customization mode options"
              >
                Customize
              </ActionPillButton>
            </div>
          )}
        </div>

      </div>

      {!pendingLibraryCursor && (
        <div
          className={cn(
            'px-6 pb-6 border-b border-border/50 bg-muted/30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            showModeToggle ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            maxHeight: showModeToggle ? '400px' : '0px',
            overflow: 'hidden',
            flexShrink: 0
          }}
          aria-expanded={showModeToggle}
        >
          <div className="pt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Customization Mode</p>
              </div>
              <ModeToggle
                value={customizationMode}
                onValueChange={onModeChange}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Show cursor names
                </p>
              </div>
              <Switch
                checked={showCursorNames}
                onCheckedChange={setShowCursorNames}
                aria-label="Toggle cursor name visibility"
              />
            </div>
            <Button
              className="w-[65%] mx-auto flex justify-center rounded-full px-4 py-2 h-auto"
              onClick={onShowActiveCursorsModal}
            >
              Create Cursor Pack
            </Button>
            <Button
              variant="destructive"
              className="w-[65%] mx-auto flex justify-center rounded-full px-4 py-2 h-auto"
              onClick={onResetCursors}
            >
              Reset Active Cursors to Default
            </Button>
          </div>
        </div>
      )}

      {/* Cursor Grid */}
      <div
        id="cursor-grid"
        // Dim the grid only if we are selecting FROM the library (focus is on library panel)
        // If we are applying a pending cursor, we want the grid to be active/highlighted
        className={cn(
          'cursor-grid px-6 py-6',
          selectingFromLibrary && selectedCursor && 'dimmed',
          customizationMode === 'advanced' && 'cursor-grid--advanced'
        )}
        data-testid="cursor-grid"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          rowGap: showCursorNames ? undefined : '1.5rem'
        }}
      >
        {safeVisibleCursors.map((cursor, index) => (
          <ActiveCursor
            key={cursor.name}
            cursor={cursor}
            onBrowse={onBrowse}
            showNames={showCursorNames}
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
