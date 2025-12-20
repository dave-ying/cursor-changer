import React from 'react';

import { Button } from '@/components/ui/button';

import type { HotspotControlsProps } from './types';
import { nudgeButtonStyle, nudgeCenterButtonStyle } from './HotspotControls.styles';
import { clampToTargetSize } from './HotspotControls.utils';

type HotspotNudgePadProps = {
  setHotspot: HotspotControlsProps['setHotspot'];
  targetSize: number;
  startHoldAction: HotspotControlsProps['startHoldAction'];
  stopHoldAction: HotspotControlsProps['stopHoldAction'];
};

export function HotspotNudgePad({ setHotspot, targetSize, startHoldAction, stopHoldAction }: HotspotNudgePadProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', width: '100px', margin: '0 auto' }}>
      <div></div>
      <Button
        onMouseDown={() =>
          startHoldAction(() =>
            setHotspot(prev => ({ ...prev, y: clampToTargetSize(prev.y - 1, targetSize) }))
          )
        }
        onMouseUp={stopHoldAction}
        onMouseLeave={stopHoldAction}
        variant="outline"
        size="sm"
        style={nudgeButtonStyle}
      >
        ▲
      </Button>
      <div></div>
      <Button
        onMouseDown={() =>
          startHoldAction(() =>
            setHotspot(prev => ({ ...prev, x: clampToTargetSize(prev.x - 1, targetSize) }))
          )
        }
        onMouseUp={stopHoldAction}
        onMouseLeave={stopHoldAction}
        variant="outline"
        size="sm"
        style={nudgeButtonStyle}
      >
        ◀
      </Button>
      <Button
        onClick={() => setHotspot({ x: Math.floor(targetSize / 2), y: Math.floor(targetSize / 2) })}
        variant="outline"
        size="sm"
        style={nudgeCenterButtonStyle}
        title="Center hotspot"
      >
        ●
      </Button>
      <Button
        onMouseDown={() =>
          startHoldAction(() =>
            setHotspot(prev => ({ ...prev, x: clampToTargetSize(prev.x + 1, targetSize) }))
          )
        }
        onMouseUp={stopHoldAction}
        onMouseLeave={stopHoldAction}
        variant="outline"
        size="sm"
        style={nudgeButtonStyle}
      >
        ▶
      </Button>
      <div></div>
      <Button
        onMouseDown={() =>
          startHoldAction(() =>
            setHotspot(prev => ({ ...prev, y: clampToTargetSize(prev.y + 1, targetSize) }))
          )
        }
        onMouseUp={stopHoldAction}
        onMouseLeave={stopHoldAction}
        variant="outline"
        size="sm"
        style={nudgeButtonStyle}
      >
        ▼
      </Button>
      <div></div>
    </div>
  );
}
