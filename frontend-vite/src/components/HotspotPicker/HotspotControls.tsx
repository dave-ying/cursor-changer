import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import type { HotspotControlsProps } from './types';
import { columnContainerStyle } from './HotspotControls.styles';
import { HotspotModeSelector } from './HotspotModeSelector';
import { HotspotColorSelector } from './HotspotColorSelector';
import { PreviewBackgroundSelector } from './PreviewBackgroundSelector';
import { HotspotCoordinateInputs } from './HotspotCoordinateInputs';
import { HotspotNudgePad } from './HotspotNudgePad';

/**
 * HotspotControls component - hotspot position controls including mode selector,
 * coordinate inputs, and directional adjustment buttons
 */
export function HotspotControls(props: HotspotControlsProps) {
  const {
    hotspot,
    setHotspot,
    targetSize,
    hotspotMode,
    setHotspotMode,
    hotspotColor,
    setHotspotColor,
    previewBg,
    setPreviewBg,
    onCustomColorPick,
    startHoldAction,
    stopHoldAction
  } = props;

  // Color picker popover state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [localColor, setLocalColor] = useState('#808080');
  const triggerRef = useRef<HTMLButtonElement>(null!);

  // Check if current background is a custom color (not one of the presets)
  const isCustomBg = !['checkerboard', 'black', 'yellow', 'white'].includes(previewBg);

  return (
    <>
      {/* Two-column layout with separator */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
        {/* Left Column: Display Mode and Color */}
        <div style={columnContainerStyle}>
          <Card className="display-controls-card p-4" aria-label="Click Point Display, Color, and Temporary Background controls card" style={{ height: '100%' }}>
            {/* Mode Selector */}
            <HotspotModeSelector hotspotMode={hotspotMode} setHotspotMode={setHotspotMode} />

            {/* Color Selector */}
            <HotspotColorSelector hotspotColor={hotspotColor} setHotspotColor={setHotspotColor} />

            {/* Temporary Background Selector */}
            <PreviewBackgroundSelector
              previewBg={previewBg}
              setPreviewBg={setPreviewBg}
              isCustomBg={isCustomBg}
              isPickerOpen={isPickerOpen}
              setIsPickerOpen={setIsPickerOpen}
              localColor={localColor}
              setLocalColor={setLocalColor}
              triggerRef={triggerRef}
              onCustomColorPick={onCustomColorPick}
            />
          </Card>
        </div>

        {/* Right Column: Coordinates and Directional Controls */}
        <div style={columnContainerStyle}>
          {/* Coordinate Inputs and Directional Controls */}
          <Card className="coordinates-card p-4" aria-label="Coordinates and directional controls card" style={{ height: '100%' }}>
            <div>
              <HotspotCoordinateInputs hotspot={hotspot} setHotspot={setHotspot} targetSize={targetSize} />
              {/* Directional buttons */}
              <HotspotNudgePad
                setHotspot={setHotspot}
                targetSize={targetSize}
                startHoldAction={startHoldAction}
                stopHoldAction={stopHoldAction}
              />
            </div>
          </Card>
        </div>
      </div>

    </>
  );
}