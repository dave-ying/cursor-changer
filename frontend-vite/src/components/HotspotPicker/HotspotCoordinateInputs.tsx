import React from 'react';

import { Button } from '@/components/ui/button';

import type { HotspotControlsProps } from './types';
import { labelStyle, subLabelStyle, headlineStyle, nudgeButtonStyle } from './HotspotControls.styles';
import { clampToTargetSize } from './HotspotControls.utils';
import './HotspotCoordinateInputs.css';

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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <label htmlFor="hs-x" style={{...subLabelStyle, display: 'inline', marginBottom: 0}}>X</label>
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
            className="input coordinate-input"
          />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <label htmlFor="hs-y" style={{...subLabelStyle, display: 'inline', marginBottom: 0}}>Y</label>
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
            className="input coordinate-input"
          />
        </div>
      </div>
    </div>
  );
}
