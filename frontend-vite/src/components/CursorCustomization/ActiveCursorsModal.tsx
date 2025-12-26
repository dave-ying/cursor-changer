import React from 'react';
import type { CursorInfo } from '@/types/generated/CursorInfo';
import { Button } from '@/components/ui/button';
import { ActiveCursorPreviewCard } from './ActiveCursorPreviewCard';
import './ActiveCursorsModal.css';

interface ActiveCursorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleCursors: CursorInfo[];
  customizationMode: 'simple' | 'advanced';
}

export function ActiveCursorsModal({
  isOpen,
  onClose,
  visibleCursors,
  customizationMode
}: ActiveCursorsModalProps) {
  if (!isOpen) return null;

  // Filter cursors based on mode
  const displayCursors = React.useMemo(() => {
    if (customizationMode === 'simple') {
      // Match ActiveSection behavior by filtering on cursor names
      return visibleCursors.filter((cursor) => cursor.name === 'Normal' || cursor.name === 'Hand');
    }
    return visibleCursors;
  }, [visibleCursors, customizationMode]);

  const modeLabel = customizationMode === 'simple' ? 'Simple Mode' : 'Advanced Mode';
  const infoText =
    customizationMode === 'simple'
      ? 'Showing the 2 main cursors in Simple mode'
      : `Showing all ${displayCursors.length} cursors in Advanced mode`;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-cursors-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-panel create-pack-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={onClose}
          aria-label="Close create cursor pack modal"
          variant="ghost"
          size="icon"
          className="close-button"
        >
          <span className="text-lg">✕</span>
        </Button>

        <div className="create-pack-heading">
          <p className="create-pack-label">Creating Cursor Pack:</p>
          <div className="create-pack-pill" aria-live="polite">
            {modeLabel}
          </div>
        </div>

        <div className="create-pack-info-card">
          <p>{infoText}</p>
        </div>

        <div className="create-pack-grid" role="list">
          {displayCursors.map((cursor) => (
            <ActiveCursorPreviewCard
              key={cursor.name}
              cursor={cursor}
            />
          ))}
        </div>

        {displayCursors.length === 0 && (
          <div className="create-pack-empty">
            <p>No cursors to display</p>
          </div>
        )}

        <div className="create-pack-footer">
          <Button
            onClick={onClose}
            size="lg"
            className="create-pack-close-button"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
