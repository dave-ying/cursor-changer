import React from 'react';
import { ActiveCursor } from './ActiveCursor';
import { ModeToggle } from './ModeToggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { logger } from '../../utils/logger';
import { SlidersHorizontal } from 'lucide-react';

interface ActiveSectionProps {
  visibleCursors: any[];
  customizationMode: string;
  selectingFromLibrary: boolean;
  selectedCursor: any;
  pendingLibraryCursor: any;
  selectedLibraryCursor: any;
  selectingCursorForCustomization: boolean;
  defaultCursorStyle: 'windows' | 'mac';
  accentColor?: string;
  onBrowse: (cursor: any) => void;
  onModeChange: (value: string) => void;
  onDefaultCursorStyleChange: (value: 'windows' | 'mac') => void | Promise<void>;
  onResetCursors: () => void | Promise<void>;
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
  defaultCursorStyle,
  accentColor,
  onBrowse,
  onModeChange,
  onDefaultCursorStyleChange,
  onResetCursors,
  onCancelPendingLibraryCursor,
  loadAvailableCursors,
  draggingLib
}: ActiveSectionProps) {
  const safeVisibleCursors = Array.isArray(visibleCursors) ? visibleCursors : [];

  const [showModeToggle, setShowModeToggle] = React.useState(false);

  if (!Array.isArray(visibleCursors)) {
    logger.warn(
      '[ActiveSection] visibleCursors is not an array; received:',
      visibleCursors
    );
  }

  return (
    <section
      id="active-cursors-section"
      className="rounded-[var(--radius-surface)] border bg-card text-card-foreground shadow-sm"
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
                Your Active Cursors
              </h1>
            </div>
          )}

          {pendingLibraryCursor ? (
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={onCancelPendingLibraryCursor}
                aria-label="Cancel cursor selection"
              >
                <SlidersHorizontal className="h-6 w-6" />
              </Button>
            </div>
          ) : (
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                className="!h-11 !w-11 !p-0 rounded-full [&>svg]:!h-6 [&>svg]:!w-6"
                onClick={() => setShowModeToggle((prev) => !prev)}
                aria-label="Toggle customization mode options"
              >
                <SlidersHorizontal className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>

        {!pendingLibraryCursor && (
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${showModeToggle ? 'opacity-100' : 'opacity-0'}`}
            style={{ maxHeight: showModeToggle ? '220px' : '0px' }}
            aria-expanded={showModeToggle}
          >
            <div className="pt-3 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Customization Mode</p>
                  <p className="text-xs text-muted-foreground">Toggle between Simple and Advanced</p>
                </div>
                <ModeToggle
                  value={customizationMode}
                  onValueChange={onModeChange}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Default Cursor Style</p>
                  <p className="text-xs text-muted-foreground">Choose the style for defaults</p>
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
                  <p className="text-sm font-semibold text-foreground">Reset Active to Default</p>
                  <p className="text-xs text-muted-foreground">Restore the active cursors</p>
                </div>
                <Button
                  variant="destructive"
                  className="sm:w-auto rounded-full"
                  onClick={onResetCursors}
                >
                  Reset Cursors
                </Button>
              </div>
            </div>
          </div>
        )}
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
