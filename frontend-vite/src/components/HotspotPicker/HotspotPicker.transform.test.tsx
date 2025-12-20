import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotspotPicker } from './index';
import * as useHotspotLogicModule from './useHotspotLogic';
import * as AppContextModule from '../../context/AppContext';

const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQUBATAP7GwAAAAAElFTkSuQmCC';

describe('HotspotPicker transform behavior', () => {
    beforeEach(() => {
        vi.spyOn(AppContextModule, 'useApp').mockReturnValue({ cursorState: { accentColor: '#7c3aed' } } as any);
    });

    it('does not reset transform on tab switch', () => {
        const setImageTransform = vi.fn();

        const mockLogic = {
            objectUrl: imageDataUrl,
            targetSize: 256,
            hotspot: { x: 10, y: 10 },
            setHotspot: vi.fn(),
            busy: false,
            cursorInfo: null,
            previewBg: 'checkerboard',
            setPreviewBg: vi.fn(),
            hotspotMode: 'crosshair',
            setHotspotMode: vi.fn(),
            hotspotColor: 'red',
            setHotspotColor: vi.fn(),
            imageTransform: { scale: 1, offsetX: 15, offsetY: 25 },
            setImageTransform,
            filename: 'test.png',
            isRemovingBackground: false,
            imgRef: { current: null },
            overlayRef: { current: null },
            calculateFitScale: vi.fn(() => 1),
            handlePick: vi.fn(),
            handleConfirm: vi.fn(async () => { }),
            handleDelete: vi.fn(async () => { }),
            handleRemoveBackground: vi.fn(async () => { }),
            startHoldAction: vi.fn((action) => action()),
            stopHoldAction: vi.fn()
        };

        vi.spyOn(useHotspotLogicModule, 'useHotspotLogic').mockReturnValue(mockLogic as any);

        const { getByText, getByRole } = render(<HotspotPicker onCancel={vi.fn()} />);

        // Switch to resize tab (simulate user resizing/dragging)
        const resizeTab = getByText(/Resize & Reposition/);
        fireEvent.click(resizeTab);

        // Now switch back to hotspot (Click Point) tab
        const hotspotTab = getByRole('radio', { name: /Click Point/ });
        fireEvent.click(hotspotTab);

        // setImageTransform should NOT have been called by the tab switch
        expect(setImageTransform).not.toHaveBeenCalled();
    });
});
