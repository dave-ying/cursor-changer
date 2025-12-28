import React from 'react';
import type { CursorInfo } from '@/types/generated/CursorInfo';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useMessage } from '@/hooks/useMessage';
import { invokeWithFeedback } from '@/store/operations/invokeWithFeedback';
import { Commands } from '@/tauri/commands';
import { CURSOR_NAME_MAX_LENGTH, INVALID_FILENAME_CHARS, sanitizeCursorName } from '@/utils/fileNameUtils';
import { ActiveCursorPreviewCard } from './ActiveCursorPreviewCard';
import './ActiveCursorsModal.css';
import '../HotspotPicker/HotspotPicker.css';

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
  const defaultPackName = React.useMemo(
    () => (customizationMode === 'simple' ? 'Simple Cursor Pack' : 'Advanced Cursor Pack'),
    [customizationMode]
  );
  const [packName, setPackName] = React.useState(defaultPackName);
  const [rawPackName, setRawPackName] = React.useState(defaultPackName);
  const [draftSanitizedPackName, setDraftSanitizedPackName] = React.useState(defaultPackName);
  const [isEditingPackName, setIsEditingPackName] = React.useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setPackName(defaultPackName);
    setRawPackName(defaultPackName);
    setDraftSanitizedPackName(defaultPackName);
    setIsEditingPackName(false);
  }, [defaultPackName, isOpen]);

  // Filter cursors based on mode
  const displayCursors = React.useMemo(() => {
    if (customizationMode === 'simple') {
      // Match ActiveSection behavior by filtering on cursor names
      return visibleCursors.filter((cursor) => cursor.name === 'Normal' || cursor.name === 'Hand');
    }
    return visibleCursors;
  }, [visibleCursors, customizationMode]);

  const handlePackNameInputChange = React.useCallback((value: string) => {
    const limited = value.slice(0, CURSOR_NAME_MAX_LENGTH);
    setRawPackName(limited);
    setDraftSanitizedPackName(sanitizeCursorName(limited).slice(0, CURSOR_NAME_MAX_LENGTH));
  }, []);

  const handleCancelPackNameEdit = React.useCallback(() => {
    setRawPackName(packName);
    setDraftSanitizedPackName(packName);
    setIsEditingPackName(false);
  }, [packName]);

  const handleSavePackName = React.useCallback(() => {
    setPackName(draftSanitizedPackName);
    setRawPackName(draftSanitizedPackName);
    setIsEditingPackName(false);
  }, [draftSanitizedPackName]);

  const showSanitizationHint =
    isEditingPackName && rawPackName.length > 0 && rawPackName !== draftSanitizedPackName;
  const displayedPackName = isEditingPackName ? rawPackName : packName;

  const handleCreateCursorPack = React.useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    const pendingName = (isEditingPackName ? draftSanitizedPackName : packName).trim();
    const args = pendingName ? { pack_name: pendingName } : undefined;
    const result = await invokeWithFeedback(invoke, Commands.exportActiveCursorPack, {
      args,
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

        <div className="cursor-name-top-row">
          <div className="cursor-name-block">
            <label className="cursor-name-label" htmlFor="pack-name-input">
              Pack Name:
            </label>
            <div className={`cursor-filename ${isEditingPackName ? 'is-editing' : ''}`} aria-label="cursor pack name">
              <input
                type="text"
                ref={nameInputRef}
                id="pack-name-input"
                value={displayedPackName}
                readOnly={!isEditingPackName}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="cursor-name-input"
                aria-label="cursor pack name input"
                size={Math.min(Math.max(displayedPackName.length + 2, 12), CURSOR_NAME_MAX_LENGTH + 2)}
                style={{ width: `${Math.min(Math.max(displayedPackName.length + 2, 12), CURSOR_NAME_MAX_LENGTH + 2)}ch` }}
                onChange={(e) => {
                  if (!isEditingPackName) return;
                  handlePackNameInputChange(e.target.value);
                }}
                onPaste={(e) => {
                  if (!isEditingPackName) return;
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  handlePackNameInputChange(pasted);
                }}
                onKeyDown={(e) => {
                  if (!isEditingPackName) return;
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelPackNameEdit();
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSavePackName();
                    return;
                  }
                  if (e.key === ' ') {
                    return;
                  }
                  INVALID_FILENAME_CHARS.lastIndex = 0;
                  if (e.key.length === 1 && INVALID_FILENAME_CHARS.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />

              {showSanitizationHint && (
                <div className="cursor-name-sanitization-hint">
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ Invalid characters removed for Windows compatibility
                  </span>
                </div>
              )}

              <div className="cursor-name-buttons">
                <button
                  type="button"
                  className={`cursor-name-icon cursor-name-save ${isEditingPackName ? '' : 'is-hidden'}`}
                  aria-label="Save pack name"
                  onClick={() => {
                    if (!isEditingPackName) return;
                    handleSavePackName();
                  }}
                  disabled={!isEditingPackName}
                >
                  <span aria-hidden="true">✔</span>
                </button>
                <button
                  type="button"
                  className={`cursor-name-icon ${isEditingPackName ? 'cursor-name-cancel' : 'cursor-name-edit'}`}
                  aria-label={isEditingPackName ? 'Cancel pack name edit' : 'Edit pack name'}
                  onClick={() => {
                    if (isEditingPackName) {
                      handleCancelPackNameEdit();
                    } else {
                      setIsEditingPackName(true);
                      setRawPackName(packName);
                      setDraftSanitizedPackName(packName);
                      queueMicrotask(() => {
                        nameInputRef.current?.focus();
                        nameInputRef.current?.select();
                      });
                    }
                  }}
                >
                  {isEditingPackName ? <span aria-hidden="true">✕</span> : <span aria-hidden="true">✎</span>}
                </button>
              </div>
            </div>
          </div>
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
