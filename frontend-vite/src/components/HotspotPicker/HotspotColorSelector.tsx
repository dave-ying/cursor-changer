import React from 'react';

import type { HotspotControlsProps } from './types';
import { labelStyle } from './HotspotControls.styles';
import { CircleToggleButton } from './CircleToggleButton';

type HotspotColorSelectorProps = {
  hotspotColor: HotspotControlsProps['hotspotColor'];
  setHotspotColor: HotspotControlsProps['setHotspotColor'];
};

export function HotspotColorSelector({ hotspotColor, setHotspotColor }: HotspotColorSelectorProps) {
  return (
    <div>
      <label style={labelStyle}>Color</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <CircleToggleButton
          onClick={() => setHotspotColor('red')}
          selected={hotspotColor === 'red'}
          backgroundColor="rgba(255, 0, 0, 0.9)"
          color="white"
          title="Red"
          aria-label="Select red color"
        >
          {hotspotColor === 'red' && '✓'}
        </CircleToggleButton>
        <CircleToggleButton
          onClick={() => setHotspotColor('green')}
          selected={hotspotColor === 'green'}
          backgroundColor="rgba(0, 255, 0, 0.9)"
          color="black"
          title="Green"
          aria-label="Select green color"
        >
          {hotspotColor === 'green' && '✓'}
        </CircleToggleButton>
        <CircleToggleButton
          onClick={() => setHotspotColor('blue')}
          selected={hotspotColor === 'blue'}
          backgroundColor="rgba(0, 0, 255, 0.9)"
          color="white"
          title="Blue"
          aria-label="Select blue color"
        >
          {hotspotColor === 'blue' && '✓'}
        </CircleToggleButton>
        <CircleToggleButton
          onClick={() => setHotspotColor('black')}
          selected={hotspotColor === 'black'}
          backgroundColor="rgba(0, 0, 0, 0.9)"
          border="1px solid #555"
          color="white"
          title="Black"
          aria-label="Select black color"
        >
          {hotspotColor === 'black' && '✓'}
        </CircleToggleButton>
        <CircleToggleButton
          onClick={() => setHotspotColor('white')}
          selected={hotspotColor === 'white'}
          backgroundColor="rgba(255, 255, 255, 0.9)"
          border="1px solid #555"
          color="black"
          title="White"
          aria-label="Select white color"
        >
          {hotspotColor === 'white' && '✓'}
        </CircleToggleButton>
      </div>
    </div>
  );
}
