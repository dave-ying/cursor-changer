import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImageCanvas } from './ImageCanvas';
import type { ImageTransform } from './types';

describe('ImageCanvas', () => {
    it('preserves imageTransform when switching to hotspot tab', () => {
        const setImageTransform = vi.fn();
        const setHotspot = vi.fn();
        const onPick = vi.fn();

        // Minimal refs - not attaching to DOM to keep test focused
        const overlayRef = React.createRef<HTMLDivElement>();
        const imgRef = React.createRef<HTMLImageElement>();

        const transform: ImageTransform = { scale: 1, offsetX: 20, offsetY: 30 };
        const objectUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQUBATAP7GwAAAAAElFTkSuQmCC';

        const { rerender, container } = render(
            <ImageCanvas
            objectUrl={objectUrl}
                filename="foo.png"
                overlayRef={overlayRef}
                imgRef={imgRef}
                previewBg="checkerboard"
                imageTransform={transform}
                hotspot={{ x: 10, y: 10 }}
                targetSize={256}
                hotspotMode={'crosshair'}
                hotspotColor={'red'}
                accentColorValue="#7c3aed"
                activeTab={'resize'}
                setImageTransform={setImageTransform}
                setHotspot={setHotspot}
                onPick={onPick}
            />
        );

        // Switch into hotspot tab
        rerender(
            <ImageCanvas
                objectUrl={objectUrl}
                filename="foo.png"
                overlayRef={overlayRef}
                imgRef={imgRef}
                previewBg="checkerboard"
                imageTransform={transform}
                hotspot={{ x: 10, y: 10 }}
                targetSize={256}
                hotspotMode={'crosshair'}
                hotspotColor={'red'}
                accentColorValue="#7c3aed"
                activeTab={'hotspot'}
                setImageTransform={setImageTransform}
                setHotspot={setHotspot}
                onPick={onPick}
            />
        );

        // Ensure we didn't reset to centered transform. setImageTransform should not be called by the tab switch
        expect(setImageTransform).not.toHaveBeenCalled();

        // Also ensure the rendered img transform did not change
        const img = container.querySelector('img') as HTMLImageElement | null;
        expect(img).toBeTruthy();
        expect(img!.style.transform).toContain('translate(20px, 30px)');
    });

    it('clips overflow in both hotspot and resize modes', () => {
        const setImageTransform = vi.fn();
        const setHotspot = vi.fn();
        const onPick = vi.fn();

        const overlayRef = React.createRef<HTMLDivElement>();
        const imgRef = React.createRef<HTMLImageElement>();
        const transform: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0 };
        const objectUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQUBATAP7GwAAAAAElFTkSuQmCC';

        const { rerender, getByTestId } = render(
            <ImageCanvas
                objectUrl={objectUrl}
                filename="foo.png"
                overlayRef={overlayRef}
                imgRef={imgRef}
                previewBg="checkerboard"
                imageTransform={transform}
                hotspot={{ x: 10, y: 10 }}
                targetSize={256}
                hotspotMode={'crosshair'}
                hotspotColor={'red'}
                accentColorValue="#7c3aed"
                activeTab={'resize'}
                setImageTransform={setImageTransform}
                setHotspot={setHotspot}
                onPick={onPick}
            />
        );

        // Overflow should always be hidden to prevent image from appearing outside container
        const overlay = getByTestId('image-overlay') as HTMLDivElement;
        expect(overlay.style.overflow).toBe('hidden');

        // Switch to hotspot mode
        rerender(
            <ImageCanvas
                objectUrl={objectUrl}
                filename="foo.png"
                overlayRef={overlayRef}
                imgRef={imgRef}
                previewBg="checkerboard"
                imageTransform={transform}
                hotspot={{ x: 10, y: 10 }}
                targetSize={256}
                hotspotMode={'crosshair'}
                hotspotColor={'red'}
                accentColorValue="#7c3aed"
                activeTab={'hotspot'}
                setImageTransform={setImageTransform}
                setHotspot={setHotspot}
                onPick={onPick}
            />
        );

        // In hotspot mode overflow should also be hidden
        const overlayAfter = getByTestId('image-overlay') as HTMLDivElement;
        expect(overlayAfter.style.overflow).toBe('hidden');
    });

    it('should have cursor-preview-canvas ID for easy reference', () => {
        const setImageTransform = vi.fn();
        const setHotspot = vi.fn();
        const onPick = vi.fn();

        const overlayRef = React.createRef<HTMLDivElement>();
        const imgRef = React.createRef<HTMLImageElement>();
        const transform: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0 };
        const objectUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AABQUBATAP7GwAAAAAElFTkSuQmCC';

        const { getByTestId } = render(
            <ImageCanvas
                objectUrl={objectUrl}
                filename="foo.png"
                overlayRef={overlayRef}
                imgRef={imgRef}
                previewBg="checkerboard"
                imageTransform={transform}
                hotspot={{ x: 10, y: 10 }}
                targetSize={256}
                hotspotMode={'crosshair'}
                hotspotColor={'red'}
                accentColorValue="#7c3aed"
                activeTab={'resize'}
                setImageTransform={setImageTransform}
                setHotspot={setHotspot}
                onPick={onPick}
            />
        );

        // Verify that the element with data-testid="image-overlay" also has the ID "cursor-preview-canvas"
        const overlay = getByTestId('image-overlay') as HTMLDivElement;
        expect(overlay.id).toBe('cursor-preview-canvas');
    });
});
