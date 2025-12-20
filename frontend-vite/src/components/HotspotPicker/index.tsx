import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoCardIcon } from './InfoCardIcon';
import { WandSparkles, LoaderCircle } from 'lucide-react';
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

    // Track mouse down position to detect drags vs clicks
    const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleConfirmAndClose = async () => {
        await logic.handleConfirm();
        if (onComplete) onComplete();
    };

    /**
     * Handle backdrop mouse down - record position to detect drags
     */
    const handleBackdropMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    /**
     * Handle backdrop click - only close if it was a true click (not a drag)
     * A drag is detected if the mouse moved more than DRAG_THRESHOLD pixels
     */
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
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
    }, [onCancel]);

    return (
        <div
            id="cursor-modal"
            data-testid="hotspot-picker"
            className="modal-backdrop"
            onMouseDown={handleBackdropMouseDown}
            onClick={handleBackdropClick}
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
                    <div className="tab-content">
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