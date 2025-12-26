import { useState, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import { useMessage } from '../../../hooks/useMessage';
import { useAppStore } from '../../../store/useAppStore';
import { Commands, invokeCommand } from '../../../tauri/commands';
import { logger } from '../../../utils/logger';

/**
 * Custom hook for handling file upload operations
 * Extracts file browsing, upload logic, and file processing
 */
export function useFileUpload() {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const { showMessage } = useMessage();

  // State
  const [showBrowseModal, setShowBrowseModal] = useState<boolean>(false);
  const [clickPointFile, setClickPointFile] = useState<File | null>(null);
  const [clickPointFilePath, setClickPointFilePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Handle file selection from browse modal
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const name = file.name || '';
      const ext = (name.split('.').pop() || '').toLowerCase();

      // Read the file bytes
      let arrayBuffer: ArrayBuffer;
      if (typeof file.arrayBuffer === 'function') {
        arrayBuffer = await file.arrayBuffer();
      } else {
        arrayBuffer = await new Response(file).arrayBuffer();
      }

      const uint8 = new Uint8Array(arrayBuffer);
      const data = Array.from(uint8);

      // Check file type
      if (ext === 'cur' || ext === 'ani') {
        // Handle cursor files - add to library
        try {
          const result = await invokeCommand(invoke, Commands.addUploadedCursorToLibrary, {
            filename: file.name,
            data
          });
          const displayName = (result && result.name) ? result.name : file.name;
          showMessage(`Added ${displayName} to library`, 'success');

          try {
            await loadLibraryCursors();
          } catch (refreshErr) {
            logger.warn('Failed to refresh cursor library after upload:', refreshErr);
          }
        } catch (err) {
          logger.error('Failed to add cursor to library:', err);
          showMessage('Failed to add cursor to library: ' + (err || 'unknown error'), 'error');
        } finally {
          setShowBrowseModal(false);
        }
        return;
      } else if (ext === 'zip') {
        try {
          const result = await invokeCommand(invoke, Commands.importCursorPack, {
            filename: file.name,
            data
          });

          const displayName = (result && result.name) ? result.name : file.name;
          showMessage(`Imported cursor pack ${displayName}`, 'success');

          try {
            await loadLibraryCursors();
          } catch (refreshErr) {
            logger.warn('Failed to refresh cursor library after pack import:', refreshErr);
          }
        } catch (err) {
          logger.error('Failed to import cursor pack:', err);
          showMessage('Failed to import cursor pack: ' + (err || 'unknown error'), 'error');
        } finally {
          setShowBrowseModal(false);
        }
        return;
      } else {
        // Handle image files - open click point picker
        const supported = ['svg', 'png', 'ico', 'bmp', 'jpg', 'jpeg'];
        if (supported.includes(ext)) {
          setClickPointFile(file);
          setShowBrowseModal(false);
          // This will be handled by parent component to open click point picker
          return { type: 'image', file };
        } else {
          showMessage(`Unsupported file type: .${ext}`, 'error');
          return;
        }
      }
    } catch (error) {
      logger.error('Failed to upload cursor:', error);
      showMessage('Failed to upload cursor: ' + error, 'error');
      return;
    } finally {
      setIsUploading(false);
    }
  }, [invoke, showMessage, loadLibraryCursors]);

  // Open browse modal
  const openBrowseModal = useCallback(() => {
    setShowBrowseModal(true);
  }, []);

  // Close browse modal
  const closeBrowseModal = useCallback(() => {
    setShowBrowseModal(false);
  }, []);

  // Set click point file (called by parent when image is selected)
  const setClickPointFileForPicker = useCallback((file: File | null) => {
    setClickPointFile(file);
  }, []);

  // Set click point file path (called by parent for existing files)
  const setClickPointFilePathForPicker = useCallback((filePath: string | null) => {
    setClickPointFilePath(filePath);
  }, []);

  // Clear click point file state
  const clearClickPointFile = useCallback(() => {
    setClickPointFile(null);
    setClickPointFilePath(null);
  }, []);

  return {
    // State
    showBrowseModal,
    clickPointFile,
    clickPointFilePath,
    isUploading,

    // Actions
    handleFileSelect,
    openBrowseModal,
    closeBrowseModal,
    setClickPointFileForPicker,
    setClickPointFilePathForPicker,
    clearClickPointFile
  };
}