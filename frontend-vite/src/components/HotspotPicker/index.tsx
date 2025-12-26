import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CURSOR_NAME_MAX_LENGTH, INVALID_FILENAME_CHARS, sanitizeCursorName } from '../../utils/fileNameUtils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoCardIcon } from './InfoCardIcon';
import { WandSparkles, LoaderCircle, SquarePen, Check, X } from 'lucide-react';

import { ModalButtonGroup } from '@/components/ui/ModalButtonGroup';
// Separator is used inside HotspotControls, not needed in index
import { ImageCanvas } from './ImageCanvas';
import { ImageControls } from './ImageControls';
import { HotspotControls } from './HotspotControls';
import { useHotspotLogic } from './useHotspotLogic';
import { useAppStore } from '../../store/useAppStore';
import type { HotspotPickerProps } from './types';
import './HotspotPicker.css';

// Threshold in pixels - if mouse moves more than this, it's considered a drag
const DRAG_THRESHOLD = 5;

/**
 * HotspotPicker - Main component for setting cursor hotspot
 * Supports both new file uploads and editing existing library cursors
 * Refactored from a 859-line monolithic component into modular, typed subcomponents
 * Flattened structure with CSS Grid layout for better performance and maintainability
 */
export function HotspotPicker(props: HotspotPickerProps) {
    const { onCancel, onComplete } = props;
    const logic = useHotspotLogic(props);
    const cursorState = useAppStore((s) => s.cursorState);
    const [activeTab, setActiveTab] = useState<'hotspot' | 'resize'>('hotspot');
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [nameSnapshot, setNameSnapshot] = useState('');
    const [rawNameInput, setRawNameInput] = useState(logic.editableCursorName); // Track original input for sanitization feedback
    const nameInputRef = useRef<HTMLInputElement>(null);
    const tabContentRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<'hotspot' | 'resize'>(activeTab);
    const tabHeightsRef = useRef<Record<'hotspot' | 'resize', number>>({
        hotspot: 0,
        resize: 0
    });
    const [maxTabHeight, setMaxTabHeight] = useState(0);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    const updateMaxTabHeight = useCallback((height: number) => {
        const currentTab = activeTabRef.current;
        const next = { ...tabHeightsRef.current, [currentTab]: height };
        tabHeightsRef.current = next;
        const computedMax = Math.max(next.hotspot, next.resize);
        setMaxTabHeight((prev) => (Math.abs(prev - computedMax) > 0.5 ? computedMax : prev));
    }, []);

    useEffect(() => {
        const node = tabContentRef.current;
        if (!node) return;

        updateMaxTabHeight(node.scrollHeight);

        if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined') {
            const observer = new window.ResizeObserver((entries) => {
                entries.forEach((entry) => updateMaxTabHeight(entry.contentRect.height));
            });

            observer.observe(node);
            return () => observer.disconnect();
        }

        if (typeof window !== 'undefined') {
            const handleResize = () => updateMaxTabHeight(node.scrollHeight);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [updateMaxTabHeight]);

    useEffect(() => {
        const node = tabContentRef.current;
        if (node) {
            updateMaxTabHeight(node.scrollHeight);
        }
    }, [activeTab, updateMaxTabHeight]);

    // Reset name editing mode when the source cursor changes (new file or different library item)
    // Don't reset when only the editableCursorName changes due to user typing
    useEffect(() => {
        setIsNameEditing(false);
        setNameSnapshot('');

        setRawNameInput(logic.editableCursorName);
    }, [props.filePath, props.file?.name, props.itemId]);

    // Keep raw input aligned with latest editable name when not actively editing
    // Only update when the source cursor changes, not during user typing
    useEffect(() => {
        if (!isNameEditing) {
            setRawNameInput(logic.editableCursorName);
        }
    }, [props.filePath, props.file?.name, props.itemId, isNameEditing]);

    // Track mouse down position to detect drags vs clicks
    const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleConfirmAndClose = async () => {
        await logic.handleConfirm();
        if (onComplete) onComplete();
    };

    /**
     * Handle click outside cursor name field - shake animation if changes made, exit if no changes
     */
    const handleCursorNameClickOutside = useCallback((e: MouseEvent) => {
        if (!isNameEditing) return;

        // Check if click is inside the cursor name field or its buttons
        const cursorNameField = document.querySelector('.cursor-filename') as HTMLElement | null;
        if (cursorNameField?.contains(e.target as Node)) return;

        const originalName = nameSnapshot || logic.cursorDisplayName;
        const hasChanges = logic.editableCursorName !== originalName;

        setIsNameEditing(false);

        if (hasChanges && props.filePath) {
            void logic.handleConfirm();
        }
    }, [isNameEditing, logic.cursorDisplayName, logic.editableCursorName, logic.handleConfirm, nameSnapshot, props.filePath]);

    // Add event listener for click outside detection
    useEffect(() => {
        if (isNameEditing) {
            document.addEventListener('mousedown', handleCursorNameClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleCursorNameClickOutside);
        };
    }, [isNameEditing, handleCursorNameClickOutside]);

    // Helper to avoid stateful RegExp.test on a global pattern
    const hasInvalidFilenameChars = useCallback((value: string) => {
        INVALID_FILENAME_CHARS.lastIndex = 0;
        return INVALID_FILENAME_CHARS.test(value);
    }, []);

    const handleCancelNameEdit = useCallback(() => {
        if (!isNameEditing) return;
        const originalName = nameSnapshot || logic.cursorDisplayName;
        logic.setEditableCursorName(originalName);
        setRawNameInput(originalName);
        setIsNameEditing(false);
    }, [isNameEditing, logic, logic.cursorDisplayName, nameSnapshot]);

    const sanitizedRawName = sanitizeCursorName(rawNameInput);
    const showSanitizationHint =
        isNameEditing && rawNameInput && sanitizedRawName !== rawNameInput && hasInvalidFilenameChars(rawNameInput);
    const activeNameLength = (isNameEditing ? rawNameInput?.length : logic.editableCursorName?.length) ?? 0;
    const cursorNameInputSize = Math.min(
        Math.max(activeNameLength + 2, 12),
        CURSOR_NAME_MAX_LENGTH + 2
    );

    return (
        <div
            id="cursor-modal"
            data-testid="hotspot-picker"
            className="modal-backdrop"
            onMouseDown={(e) => {
                mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
            }}
            onClick={(e) => {
                // If we don't have a recorded mousedown position, ignore (shouldn't happen)
                if (!mouseDownPosRef.current) {
                    return;
                }

                const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
                const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);

                // Reset the tracked position
                mouseDownPosRef.current = null;

                // Only close if it wasn't a drag (mouse didn't move significantly)
                if (dx <= DRAG_THRESHOLD && dy <= DRAG_THRESHOLD) {
                    onCancel();
                }
                // If it was a drag that ended on the backdrop, do nothing - don't close
            }}
            style={{ zIndex: 20000 }}
        >
            <div className="modal-panel scroll-area hotspot-picker-grid" onClick={(e) => e.stopPropagation()}>
                {/* Close button - using fixed positioning within grid */}
                <Button
                    onClick={onCancel}
                    aria-label="Close"
                    variant="ghost"
                    size="icon"
                    className="close-button"
                >
                    <span className="text-lg">✕</span>
                </Button>

                <div className="cursor-name-top-row">
                    <div className="cursor-name-block">
                        <label className="cursor-name-label" htmlFor="cursor-name-input">
                            Cursor Name:
                        </label>
                        <div className={`cursor-filename ${isNameEditing ? 'is-editing' : ''}`} aria-label="cursor filename">
                            <input
                                type="text"
                                ref={nameInputRef}
                                id="cursor-name-input"
                                size={cursorNameInputSize}
                                style={{ width: `${cursorNameInputSize}ch` }}
                                value={logic.editableCursorName}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                onChange={(e) => {
                                    const rawInput = e.target.value.slice(0, CURSOR_NAME_MAX_LENGTH);
                                    setRawNameInput(rawInput);
                                    logic.setEditableCursorName(rawInput);
                                }}

                                onKeyDown={(e) => {
                                    if (e.key === 'Escape' && isNameEditing) {
                                        e.preventDefault();
                                        handleCancelNameEdit();
                                        return;
                                    }

                                    if (e.key === 'Enter' && isNameEditing) {
                                        e.preventDefault();
                                        setIsNameEditing(false);
                                        // Persist rename immediately for existing cursors
                                        if (props.filePath) {
                                            logic.handleConfirm();
                                        }
                                        return;
                                    }

                                    // Explicitly allow spaces - they are valid in Windows filenames
                                    if (e.key === ' ') {
                                        // Spaces are allowed, don't prevent default
                                        return;
                                    }

                                    // Block Windows-invalid filename characters
                                    INVALID_FILENAME_CHARS.lastIndex = 0;
                                    if (e.key.length === 1 && INVALID_FILENAME_CHARS.test(e.key)) {
                                        e.preventDefault();
                                    }

                                    // Don't automatically exit edit mode on single character input
                                    // Only exit on Enter or when clicking the save button
                                }}
                                onPaste={(e) => {
                                    // Sanitize pasted content instead of allowing invalid characters
                                    e.preventDefault();
                                    const pasted = e.clipboardData.getData('text');
                                    const sanitized = sanitizeCursorName(pasted).slice(0, CURSOR_NAME_MAX_LENGTH);

                                    const input = e.currentTarget;
                                    const start = input.selectionStart ?? input.value.length;
                                    const end = input.selectionEnd ?? start;
                                    const nextValue = input.value.slice(0, start) + sanitized + input.value.slice(end);
                                    setRawNameInput(nextValue);
                                    logic.setEditableCursorName(nextValue);
                                }}
                                readOnly={!isNameEditing}
                                aria-label="cursor name input"
                                className="cursor-name-input"
                            />

                            {/* Show sanitization feedback when input differs from sanitized version */}
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
                                    className={`cursor-name-icon cursor-name-save ${isNameEditing ? '' : 'is-hidden'}`}
                                    aria-label="Save cursor name"
                                    onClick={async () => {
                                        if (!isNameEditing) return;
                                        setIsNameEditing(false);
                                        // Persist rename immediately for existing cursors
                                        if (props.filePath) {
                                            await logic.handleConfirm();
                                        }
                                    }}
                                    disabled={!isNameEditing}
                                >
                                    <Check aria-hidden="true" strokeWidth={2.5} />

                                </button>
                                <button
                                    type="button"
                                    className={`cursor-name-icon ${isNameEditing ? 'cursor-name-cancel' : 'cursor-name-edit'}`}
                                    aria-label={isNameEditing ? 'Cancel cursor name edit' : 'Edit cursor name'}
                                    onClick={() => {
                                        if (isNameEditing) {
                                            handleCancelNameEdit();
                                        } else {
                                            setNameSnapshot(logic.editableCursorName);
                                            setIsNameEditing(true);
                                            queueMicrotask(() => nameInputRef.current?.focus());
                                        }
                                    }}
                                >
                                    {isNameEditing ? (
                                        <X aria-hidden="true" strokeWidth={2.5} />
                                    ) : (
                                        <SquarePen aria-hidden="true" strokeWidth={2} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Column */}
                <div className="preview-column">

                <h3 className="preview-title">Cursor Preview</h3>

                <ImageCanvas
                    objectUrl={logic.objectUrl}
                    filename={logic.filename}
                    overlayRef={logic.overlayRef}
                    imgRef={logic.imgRef}
                    previewBg={logic.previewBg}
                    imageTransform={logic.imageTransform}
                    hotspot={logic.hotspot}
                    targetSize={logic.targetSize}
                    hotspotMode={logic.hotspotMode}
                    hotspotColor={logic.hotspotColor}
                    accentColorValue={cursorState.accentColor || '#7c3aed'}
                    activeTab={activeTab}
                    setImageTransform={logic.setImageTransform}
                    setHotspot={logic.setHotspot}
                    onPick={logic.handlePick}
                />

                {/* Background Removal Button - Only for new uploads */}
                {!props.filePath && (
                    <Button
                        onClick={logic.handleRemoveBackground}
                        disabled={logic.isRemovingBackground || logic.busy}
                        variant="outline"
                        size="default"
                        className="bg-removal-button"
                    >
                        {logic.isRemovingBackground ? (
                            <>
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                                Removing Background...
                            </>
                        ) : (
                            <>
                                <WandSparkles className="w-4 h-4" />
                                Remove Background
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Controls Column */}
            <div className="controls-column">
                {/* Tabs */}
                <ModalButtonGroup
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    accentColor={cursorState.accentColor}
                    showResizeTab={!props.filePath}
                />

                {/* Tab Content */}
                <div
                    className="tab-content"
                    ref={tabContentRef}
                    style={maxTabHeight ? { minHeight: `${Math.ceil(maxTabHeight)}px` } : undefined}
                >
                    {activeTab === 'hotspot' ? (
                        <>
                            {/* First Row: Info card + HotspotControls */}
                            <div id="cursor-modal-controls-section-row1" className="controls-section-row">
                                <Card className="info-card" aria-label="Hotspot instructions card">
                                    <div className="info-card-icon">
                                        <InfoCardIcon size="sm" />
                                    </div>
                                    <div className="info-card-content">
                                        <div className="instruction-text">
                                            Click anywhere on the 'Cursor Preview' on the left,
                                        </div>
                                        <div className="instruction-text">
                                            to choose the point where your cursor actually clicks.
                                        </div>
                                        <div className="instruction-hint">Use arrow keys (↑, ↓, ←, →) to fine tune</div>
                                    </div>
                                </Card>

                                <HotspotControls
                                    hotspot={logic.hotspot}
                                    setHotspot={logic.setHotspot}
                                    targetSize={logic.targetSize}
                                    hotspotMode={logic.hotspotMode}
                                    setHotspotMode={logic.setHotspotMode}
                                    hotspotColor={logic.hotspotColor}
                                    setHotspotColor={logic.setHotspotColor}
                                    accentColorValue={cursorState.accentColor || '#7c3aed'}
                                    previewBg={logic.previewBg}
                                    setPreviewBg={logic.setPreviewBg}
                                    onCustomColorPick={(color) => logic.setPreviewBg(color)}
                                    startHoldAction={logic.startHoldAction}
                                    stopHoldAction={logic.stopHoldAction}
                                    onConfirm={handleConfirmAndClose}
                                    isBusy={logic.busy}
                                    isEditMode={Boolean(props.filePath)}
                                />
                            </div>

                            {/* Second Row: Create Cursor/Save Click Position Button */}
                            <div id="cursor-modal-controls-section-row2" className="controls-section-row">
                                {/* Create Cursor Button - Only for new uploads */}
                                {!props.filePath && (
                                    <Button
                                        onClick={handleConfirmAndClose}
                                        disabled={logic.busy || logic.isRemovingBackground}
                                        size="lg"
                                        className="create-button"
                                    >
                                        {logic.busy ? 'Adding…' : 'Create Cursor'}
                                    </Button>
                                )}

                                {/* Save Click Position Button - Only for editing existing cursors */}
                                {props.filePath && (
                                    <Button
                                        onClick={handleConfirmAndClose}
                                        disabled={logic.busy}
                                        size="lg"
                                        className="create-button"
                                    >
                                        {logic.busy ? 'Saving…' : 'Save Click Point'}
                                    </Button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* First Row: Image Controls Card */}
                            <div id="cursor-modal-controls-section-row1" className="controls-section-row">
                                <Card className="image-controls-card">
                                    <ImageControls
                                        imageTransform={logic.imageTransform}
                                        setImageTransform={logic.setImageTransform}
                                        onReset={() => {
                                            // Reset to 100% scale (1.0) and center position
                                            logic.setImageTransform({ scale: 1.0, offsetX: 0, offsetY: 0 });
                                        }}
                                        startHoldAction={logic.startHoldAction}
                                        stopHoldAction={logic.stopHoldAction}
                                    />
                                </Card>
                            </div>

                            {/* Second Row: Create Cursor Button */}
                            <div id="cursor-modal-controls-section-row2" className="controls-section-row">
                                {/* Create Cursor Button - Only for new uploads */}
                                {!props.filePath && (
                                    <Button
                                        onClick={handleConfirmAndClose}
                                        disabled={logic.busy || logic.isRemovingBackground}
                                        size="lg"
                                        className="create-button"
                                    >
                                        {logic.busy ? 'Adding…' : 'Create Cursor'}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
);
}