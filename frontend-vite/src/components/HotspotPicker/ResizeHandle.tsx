import React from 'react';
import type { ResizeHandleProps } from './types';

/**
 * ResizeHandle component - renders corner resize handles
 * Note: Currently unused in the implementation but preserved for future use
 */
export function ResizeHandle({ corner, onMouseDown }: ResizeHandleProps) {
    const positions = {
        'top-left': { top: -6, left: -6, cursor: 'nwse-resize' },
        'top-right': { top: -6, right: -6, cursor: 'nesw-resize' },
        'bottom-left': { bottom: -6, left: -6, cursor: 'nesw-resize' },
        'bottom-right': { bottom: -6, right: -6, cursor: 'nwse-resize' }
    };

    const pos = positions[corner];

    return (
        <div
            onMouseDown={(e) => onMouseDown(e, corner)}
            style={{
                position: 'absolute',
                ...pos,
                width: 12,
                height: 12,
                background: 'rgba(124,58,237,1)',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: pos.cursor,
                zIndex: 10,
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s ease-out'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
        />
    );
}
