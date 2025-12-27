import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../hooks/useMessage';
import { useAppStore } from '../../store/useAppStore';
import { useSortable } from '@dnd-kit/sortable';

import { ContextMenu } from './ContextMenu';
import { useLibraryAnimation, useAnimationCSSProperties } from '../../hooks/useLibraryAnimation';
import { AniPreview, useAniPreview } from './AniPreview';
import { LoaderCircle } from 'lucide-react';

import { Commands } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import type { LibraryCursor as LibraryCursorItem } from '../../types/generated/LibraryCursor';
import type { DraggedLibraryCursor } from './types';
import { invokeWithFeedback } from '../../store/operations/invokeWithFeedback';
import type { CustomizationMode } from '@/types/generated/CustomizationMode';

import type { Message } from '../../store/slices/uiStateStore';

import { 
  getCachedPreview, 
  setCachedPreview,
  hasPendingRequest,
  getPendingRequest,
  setPendingRequest
} from '../../services/cursorPreviewCache';

/**
 * @typedef {Object} LibraryCursorProps
 * @property {any} item - TODO: Replace with proper CursorLibraryItem type
 * @property {() => void} [onSelect] - Callback when item is selected
 * @property {boolean} [suppressTestId=false] - Whether to suppress test ID
 * @property {boolean} [selectionMode=false] - Whether in selection mode
 * @property {boolean} [isSelected=false] - Whether item is selected
 * @property {boolean} [isHighlighted=false] - Whether item is highlighted
 * @property {(filePath: string, id: string) => void} [onClickPointEdit] - Callback for click point editing
 * @property {(item: any) => void} [onApply] - Callback when item is applied
 * @property {(item: any) => void} [onEdit] - Callback when item is edited
 * @property {(id: string) => void} [onDelete] - Callback when item is deleted
 * @property {number} [animationIndex=0] - For staggered pulse delays
 * @property {boolean} [enablePulseAnimation=true] - Whether to enable the pulse animation
 * @property {number} [staggerInterval=0.2] - Custom stagger interval between items
 * @property {number} [previewScale=1] - Preview scale
 */

interface LibraryCursorProps {
  item: LibraryCursorItem;
  displayOrderIds?: string[];
  onSelect?: () => void;
  suppressTestId?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  previewScale?: number;

  onClickPointEdit?: (filePath: string, id: string) => void;
  onApply?: (item: LibraryCursorItem) => void;
  onEdit?: (item: LibraryCursorItem) => void;
  onDelete?: (id: string) => void;

  animationIndex?: number;
  enablePulseAnimation?: boolean;
  staggerInterval?: number;
}

export function LibraryCursor({
  item,
  displayOrderIds,
  onSelect,
  suppressTestId = false,
  selectionMode = false,
  isSelected = false,
  isHighlighted = false,

  onClickPointEdit,
  onApply,
  onEdit,
  onDelete: onDeleteProp,
  animationIndex = 0,
  enablePulseAnimation = true,
  staggerInterval = 0.2,
  previewScale = 1
}: LibraryCursorProps) {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const { showMessage } = useMessage();
  const showMessageTyped = React.useCallback(
    (text: string, type?: Message['type']) => {
      const normalized: Message['type'] | undefined = type === '' || type === undefined ? undefined : type;
      showMessage(text, normalized);
    },
    [showMessage]
  );

  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isPack = Boolean(item.is_pack || item.pack_metadata);
  const packItems = item.pack_metadata?.items ?? [];
  const packPreviews = item.pack_metadata?.previews;

  const packMode = item.pack_metadata?.mode;
  const packModeLabel = packMode ? `${packMode === 'simple' ? 'Simple' : 'Advanced'} mode` : null;
  const packCountLabel = packItems.length > 0 ? `${packItems.length} cursor${packItems.length === 1 ? '' : 's'}` : 'Cursor pack';
  const packItemLabels = packItems
    .map((packItem) => packItem.display_name || packItem.cursor_name || packItem.file_name)
    .filter(Boolean)
    .slice(0, 3);

  // Check if this is an ANI file for optimized animated preview
  const isAniFile = !isPack && item.file_path?.toLowerCase().endsWith('.ani');
  const { data: aniData, loading: aniLoading } = useAniPreview(
    invoke,
    isAniFile ? item.file_path : null
  );

  // useSortable provides drag behavior and sorting metadata
  const draggedItem: DraggedLibraryCursor = { ...item, preview };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'library', lib: draggedItem, displayOrderIds }
  });

  // For non-ANI files, load static preview
  useEffect(() => {
    if (isPack) {
      setPreview(null);
      setLoading(false);
      return;
    }

    // Skip if ANI file (handled by useAniPreview hook)
    if (isAniFile) {
      setLoading(aniLoading);
      return;
    }

    const filePath = item.file_path;
    if (!filePath) {
      setPreview(null);
      setLoading(false);
      return;
    }

    // Check cache first for instant preview
    const cachedUrl = getCachedPreview(filePath);
    if (cachedUrl) {
      setPreview(cachedUrl);
      setLoading(false);
      return;
    }

    // Check if there's already a pending request for this file
    const pendingPromise = getPendingRequest(filePath);
    if (pendingPromise) {
      setLoading(true);
      let mounted = true;
      pendingPromise
        .then(() => {
          if (mounted) {
            const url = getCachedPreview(filePath);
            setPreview(url);
            setLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setLoading(false);
        });
      return () => { mounted = false; };
    }

    let mounted = true;
    setLoading(true);

    // Create the load promise - try read_cursor_file_as_data_url first, fallback to get_library_cursor_preview
    const loadPromise = (async () => {
      const primary = await invokeWithFeedback(invoke, Commands.readCursorFileAsDataUrl, {
        args: { file_path: filePath },
        logLabel: '[LibraryCursor] Failed to load preview via readCursorFileAsDataUrl:',
        shouldHandleError: () => false
      });

      if (primary.status === 'success') {
        const url = primary.value as string;
        setCachedPreview(filePath, url);
        if (mounted) {
          setPreview(url);
          setLoading(false);
        }
        return url;
      }

      logger.warn('Preview failed for', filePath, primary.status === 'error' ? primary.error : 'skipped');
      const fallback = await invokeWithFeedback(invoke, Commands.getLibraryCursorPreview, {
        args: { file_path: filePath },
        logLabel: '[LibraryCursor] Failed to load preview via getLibraryCursorPreview:'
      });
      if (fallback.status === 'success') {
        const url = fallback.value as string;
        setCachedPreview(filePath, url);
        if (mounted) {
          setPreview(url);
          setLoading(false);
        }
        return url;
      }

      throw new Error('Failed to load library cursor preview');
    })();

    // Register as pending to prevent duplicate requests
    setPendingRequest(filePath, loadPromise);

    return () => { mounted = false; };
  }, [invoke, item.file_path, isAniFile, aniLoading, isPack]);

  const findPackPreview = React.useCallback(
    (fileName?: string | null) => {
      if (!packPreviews || !fileName) return null;

      const direct = packPreviews[fileName];
      if (direct) return direct;

      const matchKey = Object.keys(packPreviews).find(
        (key) => key.toLowerCase() === fileName.toLowerCase()
      );

      return matchKey ? packPreviews[matchKey] : null;
    },
    [packPreviews]
  );

  // Deterministic fallback: try common cursor names in order, then first alphabetically
  const getDeterministicPreview = React.useCallback(
    (previews: Record<string, string>) => {
      // Priority order for fallback cursors
      const priorityCursors = ['normal-select', 'link-select', 'text-select', 'busy', 'help-select'];
      
      for (const cursorName of priorityCursors) {
        const preview = previews[cursorName];
        if (preview) return preview;
      }
      
      // Fallback to first alphabetically sorted filename
      const sortedKeys = Object.keys(previews).sort();
      return sortedKeys.length > 0 ? previews[sortedKeys[0]!] : null;
    },
    []
  );

  const normalSelectItem = packItems.find(
    (packItem) => packItem.cursor_name?.toLowerCase() === 'normal-select'
  );

  const packPreviewUrl =
    findPackPreview(normalSelectItem?.file_name) ||
    (packPreviews ? getDeterministicPreview(packPreviews) : null);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    // Don't show context menu when in selection mode
    if (selectionMode) return;

    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  // Use custom hook for animation logic - use staggerInterval: 0 for synchronized pulse
  const animationConfig = useLibraryAnimation({
    animationIndex,
    selectionMode,
    enablePulseAnimation,
    staggerInterval: 0, // Set to 0 for synchronized pulse animation
    isSelected,
    isHighlighted
  });

  // Generate CSS custom properties for animation
  const animationCSSProperties = useAnimationCSSProperties(animationConfig);

  // Match the card sizing logic used in LibrarySection gridStyle so items and grid stay aligned.
  const scaleMin = 0.6;
  const scaleMax = 3;
  const normalizedScale = Math.min(1, Math.max(0, (previewScale - scaleMin) / (scaleMax - scaleMin))); // 0 at min, 1 at max
  const cardSize = Math.round(80 + normalizedScale * 110); // 80px at min, 190px at max (matches grid)
  const padding = Math.max(6, Math.round(cardSize * 0.06));

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: selectionMode ? 'pointer' : 'pointer !important',
    width: `${cardSize}px`,
    height: `${cardSize}px`,
    // When in flexible layout, allow self-centering within stretched grid cells
    margin: 'auto',
    ...animationCSSProperties
  };

  const previewScaleClamped = Math.min(scaleMax, Math.max(scaleMin, previewScale));

  const availableSize = cardSize - padding * 2; // aligns with --library-item-size and --library-item-padding

  const baseSize = 60; // minimum visible preview
  const maxSize = availableSize; // fill the padded area at max scale
  const previewSize = Math.round(
    Math.max(baseSize, Math.min(maxSize, baseSize + (previewScaleClamped - scaleMin) * ((maxSize - baseSize) / (scaleMax - scaleMin))))
  );

  const previewStyle: React.CSSProperties = {
    width: `${previewSize}px`,
    height: `${previewSize}px`,
    maxWidth: `${availableSize}px`,
    maxHeight: `${availableSize}px`
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...(selectionMode ? {} : listeners)}
        className={`library-item ${selectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected-library-item' : ''} ${isHighlighted ? 'active-highlighted' : ''}`}
        {...(!suppressTestId ? { ['data-testid']: `library-card-${item.id}` } : {})}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        style={style}
      >
        <div
          className={`cursor-preview has-custom-cursor ${isPack ? 'relative overflow-hidden rounded-xl' : ''}`}
          style={previewStyle}
        >
          {isPack ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-muted/70 p-3 text-muted-foreground">
              {packPreviewUrl ? (
                <img
                  src={packPreviewUrl}
                  alt={`${item.name} normal-select preview`}
                  className="h-4/5 w-4/5 object-contain drop-shadow-sm"
                  loading="lazy"
                />
              ) : (
                <>
                  <span className="text-sm font-semibold text-foreground line-clamp-2 text-center">
                    {item.name || 'Cursor Pack'}
                  </span>
                  <span className="text-xs mt-1">{packCountLabel}</span>
                  {packModeLabel ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80 mt-1">
                      {packModeLabel}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          ) : loading ? (
            <LoaderCircle className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : isAniFile && aniData ? (
            <AniPreview
              data={aniData}
              alt={item.name}
              className="cursor-preview-img"
              style={{ display: 'block' }}
            />
          ) : preview ? (
            <img src={preview} alt={item.name} className="cursor-preview-img" style={{ display: 'block' }} />
          ) : (
            <span className="cursor-preview-emoji" style={{ color: '#ffffff' }}>✓</span>
          )}
        </div>
      </div>

      <ContextMenu
        isOpen={contextMenuOpen}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        onClose={() => setContextMenuOpen(false)}
        onApply={() => {
          logger.debug('[LibraryCursor] onApply called for item:', item);
          logger.debug('[LibraryCursor] onApply prop exists?', Boolean(onApply));
          onApply?.(item);
        }}
        onClickPointEdit={() => {
          onClickPointEdit?.(item.file_path, item.id);
        }}
        onEdit={isPack ? undefined : () => {
          onEdit?.(item);
        }}
        onDelete={async () => {
          logger.debug('[LibraryCursor] onDelete called for item:', item);
          // If a parent provided an onDelete prop, call it and allow it to handle deletion
          if (onDeleteProp) {
            await Promise.resolve(onDeleteProp(item.id));
            return;
          }

          const result = await invokeWithFeedback(invoke, Commands.removeCursorFromLibrary, {
            args: { id: item.id },
            showMessage: showMessageTyped,
            successMessage: `Removed ${item.name} from library`,
            successType: 'success',
            logLabel: '[LibraryCursor] Failed to delete:',
            errorMessage: (err) => 'Failed to delete cursor: ' + String(err),
            errorType: 'error'
          });
          if (result.status === 'success') {
            await loadLibraryCursors();
          }
        }}
      />
    </>
  );
}