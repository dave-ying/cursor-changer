import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../context/MessageContext';
import { useAppStore } from '../../store/useAppStore';
import { useSortable } from '@dnd-kit/sortable';
import { ContextMenu } from './ContextMenu';
import { useLibraryAnimation, useAnimationCSSProperties } from '../../hooks/useLibraryAnimation';
import { AniPreview, useAniPreview } from './AniPreview';
import { LoaderCircle } from 'lucide-react';
import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';
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
 */

interface LibraryCursorProps {
  item: any;
  onSelect?: () => void;
  suppressTestId?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClickPointEdit?: (filePath: string, id: string) => void;
  onApply?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
  animationIndex?: number;
  enablePulseAnimation?: boolean;
  staggerInterval?: number;
}

export function LibraryCursor({
  item,
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
  staggerInterval = 0.2
}: LibraryCursorProps) {
  const { invoke } = useApp();
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const { showMessage } = useMessage();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Check if this is an ANI file for optimized animated preview
  const isAniFile = item.file_path?.toLowerCase().endsWith('.ani');
  const { data: aniData, loading: aniLoading, error: aniError } = useAniPreview(
    invoke,
    isAniFile ? item.file_path : null
  );

  // useSortable provides drag behavior and sorting metadata
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: 'library', lib: { ...item, preview } },
    options: {
      // Disable accessibility features that create DndDescribedBy and DndLiveRegion elements
      accessibility: {
        announcements: null,
        container: null
      }
    }
  } as any);

  // For non-ANI files, load static preview
  useEffect(() => {
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
      try {
        const url = await invokeCommand(invoke, Commands.readCursorFileAsDataUrl, { file_path: filePath });
        setCachedPreview(filePath, url);
        if (mounted) {
          setPreview(url);
          setLoading(false);
        }
        return url;
      } catch (e) {
        logger.warn('Preview failed for', filePath, e);
        const url = await invokeCommand(invoke, Commands.getLibraryCursorPreview, { file_path: filePath });
        setCachedPreview(filePath, url);
        if (mounted) {
          setPreview(url);
          setLoading(false);
        }
        return url;
      }
    })();

    // Register as pending to prevent duplicate requests
    setPendingRequest(filePath, loadPromise);

    return () => { mounted = false; };
  }, [invoke, item.file_path, isAniFile, aniLoading]);

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

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: selectionMode ? 'pointer' : 'pointer !important',
    ...animationCSSProperties
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
        <div className="cursor-preview has-custom-cursor">
          {loading ? (
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
        onClickPointEdit={() => { onClickPointEdit?.(item.file_path, item.id); }}
        onEdit={() => { onEdit?.(item); }}
        onDelete={async () => {
          logger.debug('[LibraryCursor] onDelete called for item:', item);
          // Use direct invoke instead of prop to avoid prop drilling issues
          try {
            // If a parent provided an onDelete prop, call it and allow it to handle deletion
            if (onDeleteProp) {
              await Promise.resolve(onDeleteProp(item.id));
            } else {
              await invokeCommand(invoke, Commands.removeCursorFromLibrary, { id: item.id });
            }
            showMessage(`Removed ${item.name} from library`, 'success');
            await loadLibraryCursors();
          } catch (err) {
            logger.error('[LibraryCursor] Failed to delete:', err);
            showMessage('Failed to delete cursor: ' + err, 'error');
          }
        }}
      />
    </>
  );
}