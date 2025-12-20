import { useState, useCallback } from 'react';

/**
 * Custom hook for managing cursor customization state
 * Centralizes state management for the cursor customization feature
 */
export function useCursorState() {
  // UI State
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showClickPointPicker, setShowClickPointPicker] = useState<boolean>(false);
  const [clickPointItemId, setClickPointItemId] = useState<string | null>(null);
  const [clickPointPickerKey, setClickPointPickerKey] = useState<number>(Date.now());
  const [currentView, setCurrentView] = useState<string>('cursors');

  /**
   * Open hotspot editor with file information
   */
  const openClickPointEditor = useCallback((filePath: string, itemId: string, setClickPointFilePath: (path: string) => void) => {
    setClickPointFilePath(filePath);
    setClickPointItemId(itemId);
    setClickPointPickerKey(Date.now());
    setShowClickPointPicker(true);
  }, []);

  /**
   * Handle image file selection for hotspot editing
   */
  const handleImageFileSelected = useCallback((file: File, itemId: string, setClickPointFile: (file: File) => void) => {
    setClickPointFile(file);
    setClickPointItemId(itemId);
    setClickPointPickerKey(Date.now());
    setShowClickPointPicker(true);
  }, []);

  /**
   * Toggle settings modal visibility
   */
  const toggleSettingsModal = useCallback(() => {
    setShowSettingsModal(prev => !prev);
  }, []);

  /**
   * Reset hotspot picker state
   */
  const resetClickPointPicker = useCallback(() => {
    setShowClickPointPicker(false);
    setClickPointItemId(null);
    setClickPointPickerKey(Date.now());
  }, []);

  return {
    // State
    showSettingsModal,
    showClickPointPicker,
    clickPointItemId,
    clickPointPickerKey,
    currentView,

    // Setters
    setCurrentView,
    setShowSettingsModal,
    setShowClickPointPicker,
    setClickPointItemId,
    setClickPointPickerKey,

    // Actions
    openClickPointEditor,
    handleImageFileSelected,
    toggleSettingsModal,
    resetClickPointPicker
  };
}