import React from 'react';

import { Button } from '@/components/ui/button';

import type { HotspotControlsProps } from './types';
import { labelStyle, modeButtonStyle, headlineStyle } from './HotspotControls.styles';

type HotspotModeSelectorProps = {
  hotspotMode: HotspotControlsProps['hotspotMode'];
  setHotspotMode: HotspotControlsProps['setHotspotMode'];
};

export function HotspotModeSelector({ hotspotMode, setHotspotMode }: HotspotModeSelectorProps) {
  return (
    <div>
      <div style={headlineStyle}>Click Point Display</div>
      <label style={labelStyle}>Indicator Type</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.375rem' }}>
        <Button
          onClick={() => setHotspotMode('crosshair')}
          variant={hotspotMode === 'crosshair' ? 'default' : 'outline'}
          size="sm"
          style={modeButtonStyle}
        >
          Crosshair
        </Button>
        <Button
          onClick={() => setHotspotMode('axis')}
          variant={hotspotMode === 'axis' ? 'default' : 'outline'}
          size="sm"
          style={modeButtonStyle}
        >
          Axis
        </Button>
        <Button
          onClick={() => setHotspotMode('dot')}
          variant={hotspotMode === 'dot' ? 'default' : 'outline'}
          size="sm"
          style={modeButtonStyle}
        >
          Dot
        </Button>
      </div>
    </div>
  );
}
