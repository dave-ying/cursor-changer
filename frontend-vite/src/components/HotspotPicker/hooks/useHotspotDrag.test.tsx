import React, { useRef, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHotspotDrag } from './useHotspotDrag';

function TestComponent({ targetSize = 256 }: { targetSize?: number }) {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const [hotspot, setHotspot] = useState({ x: 0, y: 0 });
    const { isDragging, handlers } = useHotspotDrag(true, overlayRef, targetSize, (x, y) => setHotspot({ x, y }));

    return (
        <div>
            <div
                data-testid="overlay"
                ref={overlayRef}
                {...handlers}
                style={{ width: 256, height: 256 }}
            />
            <div data-testid="hotspot">{hotspot.x},{hotspot.y}</div>
            <div data-testid="dragging">{String(isDragging)}</div>
        </div>
    );
}

describe('useHotspotDrag', () => {
    it('continues updating hotspot while dragging outside overlay and clamps values to bounds, and stops updating after mouseup', async () => {
        render(<TestComponent />);

        const overlay = screen.getByTestId('overlay');

        // Stub bounding rect for overlay so tests behave deterministically
        overlay.getBoundingClientRect = () => ({
            width: 256,
            height: 256,
            left: 100,
            top: 100,
            right: 356,
            bottom: 356,
            x: 100,
            y: 100,
            toJSON: () => ({})
        } as DOMRect);

        // Start drag inside overlay
        fireEvent.mouseDown(overlay, { clientX: 200, clientY: 200 });

        await waitFor(() => {
            expect(screen.getByTestId('hotspot').textContent).toBe('100,100');
            expect(screen.getByTestId('dragging').textContent).toBe('true');
        });

        // Move outside overlay - far to the right - hotspot should clamp to 255
        fireEvent.mouseMove(document, { clientX: 500, clientY: 200 });

        await waitFor(() => {
            expect(screen.getByTestId('hotspot').textContent).toBe('255,100');
            expect(screen.getByTestId('dragging').textContent).toBe('true');
        });

        // Release mouse outside overlay - should end drag
        fireEvent.mouseUp(document);

        await waitFor(() => {
            expect(screen.getByTestId('dragging').textContent).toBe('false');
        });

        // Subsequent mouse moves should not update hotspot
        fireEvent.mouseMove(document, { clientX: 600, clientY: 200 });
        await new Promise((r) => setTimeout(r, 30));
        expect(screen.getByTestId('hotspot').textContent).toBe('255,100');
    });
});
