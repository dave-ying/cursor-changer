import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useDroppable } from '@dnd-kit/core';
import { ActiveCursorContextMenu } from './ActiveCursorContextMenu';
import { toastService } from '../../services/toastService';
import { useLibraryAnimation, useAnimationCSSProperties } from '../../hooks/useLibraryAnimation';
import { AniPreview, useAniPreview } from './AniPreview';
import { LoaderCircle } from 'lucide-react';
import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { 
  getCachedPreview, 
  setCachedPreview, 
  invalidatePreview,
  hasPendingRequest,
  getPendingRequest,
  setPendingRequest
} from '../../services/cursorPreviewCache';

export function ActiveCursor({
  cursor,
  onBrowse,
  isSelected = false,
  isTarget = false,
  isHighlighted = false,
  animationIndex = 0,
  enablePulseAnimation = false,
  loadAvailableCursors,
  draggingLib
}: {
  cursor: any;
  onBrowse: (cursor: any) => void;
  isSelected?: boolean;
  isTarget?: boolean;
  isHighlighted?: boolean;
  animationIndex?: number;
  enablePulseAnimation?: boolean;
  loadAvailableCursors?: () => void;
  draggingLib?: any;
}) {
  const { invoke } = useApp();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);

  // Check if this is an ANI file for optimized animated preview
  const isAniFile = cursor.image_path?.toLowerCase().endsWith('.ani');
  const { data: aniData, loading: aniLoading } = useAniPreview(
    invoke,
    isAniFile ? cursor.image_path : null
  );

  // droppable for library items
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${cursor.name}`,
    data: { type: 'slot', cursor }
  });

  // Load preview whenever the cursor data changes
  useEffect(() => {
    let mounted = true;

    // Skip if ANI file (handled by useAniPreview hook)
    if (isAniFile) {
      setLoading(aniLoading);
      return;
    }

    const filePath = cursor.image_path;
    const cacheKey = filePath || `system:${cursor.name}`;

    // Check cache first for instant preview
    const cachedUrl = getCachedPreview(cacheKey);
    if (cachedUrl) {
      setPreviewUrl(cachedUrl);
      setLoading(false);
      return;
    }

    // Check if there's already a pending request for this cursor
    const pendingPromise = getPendingRequest(cacheKey);
    if (pendingPromise) {
      setLoading(true);
      pendingPromise
        .then(() => {
          if (mounted) {
            // The cache should now have the result
            const url = getCachedPreview(cacheKey);
            setPreviewUrl(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setPreviewUrl(null);
            setLoading(false);
          }
        });
      return () => { mounted = false; };
    }

    setLoading(true);
    setPreviewUrl(null);

    // Create the load promise
    const loadPromise = filePath
      ? invokeCommand(invoke, Commands.getLibraryCursorPreview, { file_path: filePath })
      : invokeCommand(invoke, Commands.getSystemCursorPreview, { cursor_name: cursor.name });

    // Wrap and register as pending to prevent duplicate requests
    const wrappedPromise = loadPromise
      .then((dataUrl: string) => {
        setCachedPreview(cacheKey, dataUrl);
        if (mounted) {
          setPreviewUrl(dataUrl);
          setLoading(false);
        }
        return dataUrl;
      })
      .catch(err => {
        logger.warn(`Failed to load cursor preview for ${cursor.name}:`, err);
        if (mounted) {
          setPreviewUrl(null);
          setLoading(false);
        }
        throw err;
      });

    setPendingRequest(cacheKey, wrappedPromise);

    return () => { mounted = false; };
  }, [cursor.image_path, cursor.name, cursor.display_name, invoke, resetKey, isAniFile, aniLoading]);

  const hasCustom = Boolean(cursor.image_path);
  const filename = cursor.image_path ? (cursor.image_path.split('\\').pop() || cursor.image_path.split('/').pop() || 'custom') : '';

  // Select Cursor Mode:
  // Card is both:
  // - a droppable target for library items (to replace this active cursor)
  // - a clickable trigger to pick this slot for replacement via other flows

  const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    // Don't show context menu if we are in target mode (selecting a slot for a library item)
    if (isTarget) return;

    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  const handleReset = useCallback(async () => {
    try {
      logger.debug('[ActiveCursor] Resetting cursor:', cursor.name);

      // Invalidate cache for this cursor
      if (cursor.image_path) {
        invalidatePreview(cursor.image_path);
      }
      invalidatePreview(`system:${cursor.name}`);

      // Clear the preview immediately for instant visual feedback
      setPreviewUrl(null);
      setLoading(true);

      await invokeCommand(invoke, Commands.resetCursorToDefault, { cursor_name: cursor.name });
      logger.debug('[ActiveCursor] Backend reset complete');

      // Reload cursors to get the updated cursor data (image_path will be null)
      if (loadAvailableCursors) {
        await loadAvailableCursors();
        logger.debug('[ActiveCursor] Cursors reloaded');
      }

      // After reset, directly load the system cursor preview
      // Don't wait for the cursor prop to update - load it now
      logger.debug('[ActiveCursor] Loading system cursor preview for:', cursor.name);
      try {
        const dataUrl = await invokeCommand(invoke, Commands.getSystemCursorPreview, { cursor_name: cursor.name });
        logger.debug('[ActiveCursor] System cursor preview result:', dataUrl ? dataUrl.substring(0, 100) + '...' : 'null');
        if (dataUrl) {
          setPreviewUrl(dataUrl);
        }
      } catch (previewErr) {
        logger.warn('[ActiveCursor] Failed to load system cursor preview:', previewErr);
      }
      setLoading(false);
      logger.debug('[ActiveCursor] Reset complete');

      // Show success toast notification
      toastService.success(`${cursor.display_name || cursor.name} has been reset to default!`);

    } catch (error) {
      logger.error('Failed to reset cursor:', error);
      setLoading(false);

      // Show error toast notification
      toastService.error(`Failed to reset ${cursor.display_name || cursor.name}`);
    }
  }, [cursor.name, cursor.display_name, invoke, loadAvailableCursors]);

  const handleAction = () => {
    onBrowse(cursor);
  };

  // Use the same animation hook as LibraryCursor for consistency
  const selectionMode = enablePulseAnimation && isTarget;

  const animationConfig = useLibraryAnimation({
    animationIndex,
    selectionMode,
    enablePulseAnimation,
    staggerInterval: 0, // Set to 0 for synchronized pulse animation
    isSelected: false, // Active cursors don't have selected state in this context
    isHighlighted
  });

  // Generate CSS custom properties for animation
  const animationCSSProperties = useAnimationCSSProperties(animationConfig);

  return (
    <>
      <div
        ref={setNodeRef}
        className={`cursor-card ${isOver ? 'drop-target' : ''} ${isSelected ? 'selected-for-browse select-cursor-mode-active' : ''} ${isTarget ? 'target-mode' : ''} ${isHighlighted ? 'library-highlighted' : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleAction}
        onContextMenu={handleContextMenu}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAction();
          }
        }}
        data-dnd-droppable-id={`slot-${cursor.name}`}
        data-dnd-droppable-type="slot"
        data-testid={`cursor-card-${cursor.name}`}
        style={{ cursor: 'pointer' }}
      >
        <div
          className={`cursor-preview ${hasCustom ? 'has-custom-cursor' : ''}`}
          style={animationCSSProperties}
        >
          {/* Show dragging library cursor preview when hovering over this active cursor */}
          {isOver && draggingLib?.preview ? (
            <img
              src={draggingLib.preview}
              alt={draggingLib.name}
              className="cursor-preview-img"
              style={{ display: 'block' }}
            />
          ) : loading ? (
            <LoaderCircle className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : isAniFile && aniData ? (
            <AniPreview
              data={aniData}
              alt={cursor.display_name}
              className="cursor-preview-img"
              style={{ display: 'block' }}
            />
          ) : previewUrl ? (
            <img
              key={resetKey}
              src={previewUrl}
              alt={cursor.display_name}
              className="cursor-preview-img"
              style={{ display: 'block' }}
            />
          ) : (
            <span className="cursor-preview-emoji" style={{ color: '#ffffff' }}>✓</span>
          )}
        </div>
        <div className="cursor-name">{cursor.display_name}</div>
      </div>

      <ActiveCursorContextMenu
        isOpen={contextMenuOpen}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        onClose={() => setContextMenuOpen(false)}
        onChange={handleAction}
        onReset={handleReset}
      />
    </>
  );
}