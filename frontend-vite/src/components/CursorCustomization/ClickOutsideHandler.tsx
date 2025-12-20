import React, { useEffect } from 'react';

/**
 * ClickOutsideHandler component - handles click outside detection for selection cancellation
 * Extracted from MainLayout for better separation of concerns
 */
interface ClickOutsideHandlerProps {
  selectingFromLibrary: boolean;
  pendingLibraryCursor: any;
  selectingCursorForCustomization: boolean;
  cancelBrowseMode: () => void;
  cancelPreviewSelection?: () => void;
}

export function ClickOutsideHandler({
  selectingFromLibrary,
  pendingLibraryCursor,
  selectingCursorForCustomization,
  cancelBrowseMode
  , cancelPreviewSelection
}: ClickOutsideHandlerProps) {
  // Handle click outside to cancel selection mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only handle if we're in selection mode (any of the three states)
      if (!selectingFromLibrary && !pendingLibraryCursor && !selectingCursorForCustomization) return;

      // Check if click is on a cursor card or library item
      const clickedOnCursorCard = (e.target as HTMLElement).closest('.cursor-card');
      const clickedOnLibraryItem = (e.target as HTMLElement).closest('.library-item');
      const clickedOnCancelButton = (e.target as HTMLElement).closest('button[aria-label="Cancel cursor selection"]');

      // If clicked outside of cursor cards and library items, cancel selection
      if (!clickedOnCursorCard && !clickedOnLibraryItem && !clickedOnCancelButton) {
        // If a preview-based selection is active, ensure both preview & pending selection states are cleared.
        if (typeof cancelPreviewSelection === 'function') {
          try { cancelPreviewSelection(); } catch (err) { /* ignore */ }
        }
        // Always call cancelBrowseMode to clear any pending/selected library cursor state
        if (typeof cancelBrowseMode === 'function') {
          try { cancelBrowseMode(); } catch (err) { /* ignore */ }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectingFromLibrary, pendingLibraryCursor, selectingCursorForCustomization, cancelBrowseMode, cancelPreviewSelection]);

  return null;
}