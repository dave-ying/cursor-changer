import React from 'react';
import type { CursorInfo } from '@/types/generated/CursorInfo';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useMessage } from '@/hooks/useMessage';
import { invokeWithFeedback } from '@/store/operations/invokeWithFeedback';
import { Commands } from '@/tauri/commands';
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

  const { invoke } = useApp();
  const { showMessage } = useMessage();
  const [isExporting, setIsExporting] = React.useState(false);

  // Filter cursors based on mode
  const displayCursors = React.useMemo(() => {
    if (customizationMode === 'simple') {
      // Match ActiveSection behavior by filtering on cursor names
      return visibleCursors.filter((cursor) => cursor.name === 'Normal' || cursor.name === 'Hand');
    }
    return visibleCursors;
  }, [visibleCursors, customizationMode]);

  const handleCreateCursorPack = React.useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    const result = await invokeWithFeedback(invoke, Commands.exportActiveCursorPack, {
      logLabel: '[ActiveCursorsModal] Failed to export cursor pack',
      errorMessage: 'Unable to create cursor pack. Please try again.'
    });
    setIsExporting(false);

    if (result.status === 'success') {
      if (result.value) {
        showMessage(`Cursor pack saved to ${result.value}`, 'success');
      } else {
        showMessage('Export canceled', 'info');
      }
      onClose();
    } else if (result.status === 'error') {
      showMessage('Unable to create cursor pack. Please try again.', 'error');
    }
  }, [invoke, isExporting, onClose, showMessage]);

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
          <p className="create-pack-label">Creating Cursor Pack</p>
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
            onClick={handleCreateCursorPack}
            size="lg"
            className="create-pack-close-button"
            disabled={isExporting || displayCursors.length === 0}
          >
            {isExporting ? 'Creating...' : 'Create Cursor Pack'}
          </Button>
        </div>
      </div>
    </div>
  );
}
