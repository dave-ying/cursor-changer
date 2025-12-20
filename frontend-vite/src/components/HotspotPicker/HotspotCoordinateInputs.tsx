import React from 'react';

import type { HotspotControlsProps } from './types';
import { coordinateInputStyle, labelStyle, subLabelStyle, headlineStyle } from './HotspotControls.styles';
import { clampToTargetSize } from './HotspotControls.utils';

type HotspotCoordinateInputsProps = {
  hotspot: HotspotControlsProps['hotspot'];
  setHotspot: HotspotControlsProps['setHotspot'];
  targetSize: number;
};

export function HotspotCoordinateInputs({ hotspot, setHotspot, targetSize }: HotspotCoordinateInputsProps) {
  return (
    <div>
      <div style={headlineStyle}>Click Point Position</div>
      <label style={labelStyle}>Coordinates</label>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="hs-x" style={subLabelStyle}>X</label>
          <input
            id="hs-x"
            type="number"
            value={hotspot.x}
            min={0}
            max={targetSize - 1}
            onChange={(e) =>
              setHotspot({
                ...hotspot,
                x: clampToTargetSize(parseInt(e.target.value || '0'), targetSize)
              })
            }
            className="input"
            style={coordinateInputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="hs-y" style={subLabelStyle}>Y</label>
          <input
            id="hs-y"
            type="number"
            value={hotspot.y}
            min={0}
            max={targetSize - 1}
            onChange={(e) =>
              setHotspot({
                ...hotspot,
                y: clampToTargetSize(parseInt(e.target.value || '0'), targetSize)
              })
            }
            className="input"
            style={coordinateInputStyle}
          />
        </div>
      </div>
    </div>
  );
}
