import { RefObject } from 'react';

/**
 * Main HotspotPicker component props
 */
export interface HotspotPickerProps {
    /** File object for new uploads */
    file?: File;
    /** File path for existing library cursors */
    filePath?: string;
    /** Item ID for existing library cursors */
    itemId?: string;
    /** Callback when user cancels */
    onCancel: () => void;
    /** Callback when operation completes */
    onComplete?: (cursor?: any) => void;
    /** Default cursor size in pixels */
    defaultSize?: number;
}

/**
 * Hotspot coordinates
 */
export interface Hotspot {
    x: number;
    y: number;
}

/**
 * Image transformation state
 */
export interface ImageTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
}

/**
 * Cursor metadata
 */
export interface CursorInfo {
    width: number;
    height: number;
    hotspot_x: number;
    hotspot_y: number;
}

/**
 * Preview background type
 */
export type BackgroundType = 'checkerboard' | 'black' | 'yellow' | 'white' | string;

/**
 * Hotspot display mode
 */
export type HotspotMode = 'axis' | 'crosshair' | 'dot';

/**
 * Props for BackgroundSelector component
 */
export interface BackgroundSelectorProps {
    selectedBackground: BackgroundType;
    onBackgroundChange: (bg: BackgroundType) => void;
}

/**
 * Props for ImageControls component
 */
export interface ImageControlsProps {
    imageTransform: ImageTransform;
    setImageTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
    onReset: () => void;
    startHoldAction: (action: () => void) => void;
    stopHoldAction: () => void;
}

/**
 * Hotspot color options
 */
export type HotspotColor = 'red' | 'green' | 'blue' | 'accent' | 'black' | 'white';

/**
 * Props for HotspotControls component
 */
export interface HotspotControlsProps {
    hotspot: Hotspot;
    setHotspot: React.Dispatch<React.SetStateAction<Hotspot>>;
    targetSize: number;
    hotspotMode: HotspotMode;
    setHotspotMode: React.Dispatch<React.SetStateAction<HotspotMode>>;
    hotspotColor: HotspotColor;
    setHotspotColor: React.Dispatch<React.SetStateAction<HotspotColor>>;
    accentColorValue: string;
    previewBg: BackgroundType;
    setPreviewBg: React.Dispatch<React.SetStateAction<BackgroundType>>;
    onCustomColorPick: (color: string) => void;
    startHoldAction: (action: () => void) => void;
    stopHoldAction: () => void;
    onConfirm?: () => void;
    isBusy?: boolean;
    isEditMode?: boolean;
}

/**
 * Props for ImageCanvas component
 */
export interface ImageCanvasProps {
    objectUrl: string | null;
    filename: string;
    overlayRef: RefObject<HTMLDivElement | null>;
    imgRef: RefObject<HTMLImageElement | null>;
    previewBg: BackgroundType;
    imageTransform: ImageTransform;
    hotspot: Hotspot;
    targetSize: number;
    hotspotMode: HotspotMode;
    hotspotColor: HotspotColor;
    accentColorValue: string;
    activeTab: 'hotspot' | 'resize';
    setImageTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
    setHotspot: React.Dispatch<React.SetStateAction<Hotspot>>;
    onPick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Props for HotspotMarker component
 */
export interface HotspotMarkerProps {
    overlayRef: RefObject<HTMLDivElement | null>;
    hotspot: Hotspot;
    size: number;
    mode: HotspotMode;
    color: HotspotColor;
    accentColorValue: string;
}

/**
 * Props for ResizeHandle component
 */
export interface ResizeHandleProps {
    corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>, corner: string) => void;
}

/**
 * Return type for useHotspotLogic hook
 */
export interface UseHotspotLogicReturn {
    // State
    objectUrl: string | null;
    targetSize: number;
    setTargetSize: React.Dispatch<React.SetStateAction<number>>;
    hotspot: Hotspot;
    setHotspot: React.Dispatch<React.SetStateAction<Hotspot>>;
    busy: boolean;
    cursorInfo: CursorInfo | null;
    previewBg: BackgroundType;
    setPreviewBg: React.Dispatch<React.SetStateAction<BackgroundType>>;
    hotspotMode: HotspotMode;
    setHotspotMode: React.Dispatch<React.SetStateAction<HotspotMode>>;
    hotspotColor: HotspotColor;
    setHotspotColor: React.Dispatch<React.SetStateAction<HotspotColor>>;
    imageTransform: ImageTransform;
    setImageTransform: React.Dispatch<React.SetStateAction<ImageTransform>>;
    filename: string;
    isRemovingBackground: boolean;

    // Refs
    imgRef: RefObject<HTMLImageElement | null>;
    overlayRef: RefObject<HTMLDivElement | null>;

    // Functions
    calculateFitScale: () => number;
    handlePick: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleConfirm: () => Promise<void>;
    handleDelete: () => Promise<void>;
    handleRemoveBackground: () => Promise<void>;
    startHoldAction: (action: () => void) => void;
    stopHoldAction: () => void;
}
