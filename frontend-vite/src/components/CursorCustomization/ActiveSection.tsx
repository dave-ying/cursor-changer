import React from 'react';
import { ActiveCursor } from './ActiveCursor';
import { ModeToggle } from './ModeToggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { logger } from '../../utils/logger';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
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
  defaultCursorStyle,
  accentColor,
  onBrowse,
  onModeChange,
  onDefaultCursorStyleChange,
  onResetCursors,
  onCancelPendingLibraryCursor,
  loadAvailableCursors,
  draggingLib,
  onShowActiveCursorsModal
}: ActiveSectionProps) {
  const safeVisibleCursors = Array.isArray(visibleCursors) ? visibleCursors : [];

  const [showModeToggle, setShowModeToggle] = usePersistentBoolean({
    key: persistentKeys.activeSection.showModeToggle,
    defaultValue: false
  });
  const [showMoreOptions, setShowMoreOptions] = usePersistentBoolean({
    key: persistentKeys.activeSection.showMoreOptions,
    defaultValue: false
  });
  const [showCursorNames, setShowCursorNames] = usePersistentBoolean({
    key: persistentKeys.activeSection.showCursorNames,
    defaultValue: true
  });

  const handleToggleCustomizePanel = React.useCallback(() => {
    setShowMoreOptions(false);
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
            'px-6 pb-4 border-b border-border/50 bg-muted/30 overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            showModeToggle ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            maxHeight: showModeToggle ? (showMoreOptions ? '400px' : '260px') : '0px',
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Default Cursor Style</p>
              </div>
              <ToggleGroup
                type="single"
                value={defaultCursorStyle}
                onValueChange={(value) => {
                  if (value && value !== defaultCursorStyle) {
                    onDefaultCursorStyleChange(value as 'windows' | 'mac');
                  }
                }}
                className="bg-muted rounded-full p-1"
                aria-label="Default Cursor Style"
              >
                <ToggleGroupItem
                  value="windows"
                  className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
                  style={defaultCursorStyle === 'windows'
                    ? {
                      backgroundColor: accentColor || '#7c3aed',
                      borderColor: accentColor || '#7c3aed'
                    }
                    : {}}
                  aria-label="Windows style cursors"
                >
                  Windows
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="mac"
                  className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
                  style={defaultCursorStyle === 'mac'
                    ? {
                      backgroundColor: accentColor || '#7c3aed',
                      borderColor: accentColor || '#7c3aed'
                    }
                    : {}}
                  aria-label="Mac style cursors"
                >
                  Mac
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Create Cursor Pack</p>
              </div>
              <Button
                className="rounded-full"
                onClick={onShowActiveCursorsModal}
              >
                Create
              </Button>
            </div>
            <CollapsibleSection
              id="active-cursors-more-options"
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
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Reset All Active Cursors to Default
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="sm:w-auto rounded-full"
                  onClick={onResetCursors}
                >
                  Reset Active Cursors
                </Button>
              </div>
            </CollapsibleSection>
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
