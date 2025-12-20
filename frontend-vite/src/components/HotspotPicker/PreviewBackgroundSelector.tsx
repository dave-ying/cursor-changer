import React from 'react';

import { ColorPickerPopover } from '@/components/ui/ColorPickerPopover';

import type { HotspotControlsProps } from './types';
import { colorWheelButtonStyle, labelStyle } from './HotspotControls.styles';
import { CircleToggleButton } from './CircleToggleButton';

type PreviewBackgroundSelectorProps = {
  previewBg: HotspotControlsProps['previewBg'];
  setPreviewBg: HotspotControlsProps['setPreviewBg'];
  isCustomBg: boolean;
  isPickerOpen: boolean;
  setIsPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  localColor: string;
  setLocalColor: React.Dispatch<React.SetStateAction<string>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  onCustomColorPick: HotspotControlsProps['onCustomColorPick'];
};

export function PreviewBackgroundSelector({
  previewBg,
  setPreviewBg,
  isCustomBg,
  isPickerOpen,
  setIsPickerOpen,
  localColor,
  setLocalColor,
  triggerRef,
  onCustomColorPick
}: PreviewBackgroundSelectorProps) {
  return (
    <div>
      <label style={labelStyle}>Temporary Background</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Checkered Background */}
        <CircleToggleButton
          onClick={() => setPreviewBg('checkerboard')}
          selected={previewBg === 'checkerboard'}
          background="repeating-conic-gradient(#fff 0% 25%, #ddd 0% 50%) 50% / 8px 8px"
          border="1px solid #555"
          color="#333"
          title="Checkered Background"
          aria-label="Select checkered background"
        >
          {previewBg === 'checkerboard' && '✓'}
        </CircleToggleButton>
        {/* Yellow Background */}
        <CircleToggleButton
          onClick={() => setPreviewBg('yellow')}
          selected={previewBg === 'yellow'}
          backgroundColor="#fff800"
          border="1px solid #555"
          color="#333"
          title="Yellow Background"
          aria-label="Select yellow background"
        >
          {previewBg === 'yellow' && '✓'}
        </CircleToggleButton>
        {/* White Background */}
        <CircleToggleButton
          onClick={() => setPreviewBg('white')}
          selected={previewBg === 'white'}
          backgroundColor="#ffffff"
          border="1px solid #555"
          color="#333"
          title="White Background"
          aria-label="Select white background"
        >
          {previewBg === 'white' && '✓'}
        </CircleToggleButton>
        {/* Black Background */}
        <CircleToggleButton
          onClick={() => setPreviewBg('black')}
          selected={previewBg === 'black'}
          backgroundColor="#000000"
          border="1px solid #555"
          color="white"
          title="Black Background"
          aria-label="Select black background"
        >
          {previewBg === 'black' && '✓'}
        </CircleToggleButton>
        {/* Custom Color - show if selected */}
        {isCustomBg && (
          <CircleToggleButton
            onClick={() => setIsPickerOpen(true)}
            selected={true}
            backgroundColor={String(previewBg)}
            border="1px solid #555"
            color="#333"
            boxShadow="0 0 0 1.5px rgba(255, 255, 255, 0.5)"
            title="Custom Color"
            aria-label="Custom background color"
          >
            ✓
          </CircleToggleButton>
        )}
        {/* Color Picker Button */}
        <button
          ref={triggerRef}
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          style={colorWheelButtonStyle}
          title="Choose custom color"
          aria-label="Choose custom background color"
        >
          <img
            src="/color-wheel.svg"
            alt="Custom color picker"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
          />
        </button>
        {/* Color Picker Popover */}
        <ColorPickerPopover
          value={localColor}
          onChange={(color, options) => {
            setLocalColor(color);
            onCustomColorPick(color);
          }}
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          triggerRef={triggerRef}
        />
      </div>
    </div>
  );
}
