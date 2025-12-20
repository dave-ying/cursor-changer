import React, { useEffect, useRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCursorFileHandler } from './useCursorFileHandler';
import { Commands } from '../../../tauri/commands';

describe('useCursorFileHandler', () => {
  it('invokes addUploadedImageWithClickPointToLibrary with normalized offsets and hotspot', async () => {
    const fileBytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([fileBytes], 'test.png', { type: 'image/png' });

    // JSDOM's File/Blob implementations can behave inconsistently across versions.
    // Force a deterministic byte payload so this test validates our integration.
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => fileBytes.buffer,
    });

    const overlayRect = {
      width: 128,
      height: 128,
      left: 0,
      top: 0,
      right: 128,
      bottom: 128,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    const invoke = vi.fn().mockResolvedValue({ id: '1', name: 'Cursor', file_path: 'C:\\cursor.cur' });
    const showMessage = vi.fn();
    const loadLibraryCursors = vi.fn().mockResolvedValue(undefined);
    const setObjectUrl = vi.fn();

    function Test() {
      const overlayRef = useRef<HTMLDivElement | null>(null);

      useEffect(() => {
        if (!overlayRef.current) return;
        overlayRef.current.getBoundingClientRect = () => overlayRect;
      }, []);

      const { handleConfirm } = useCursorFileHandler({
        file,
        filePath: null,
        itemId: null,
        filename: 'test.png',
        hotspot: { x: 10, y: 20 },
        targetSize: 256,
        imageTransform: { scale: 1.25, offsetX: 10, offsetY: -20 },
        overlayRef,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      });

      return (
        <div>
          <div data-testid="overlay" ref={overlayRef} />
          <button data-testid="go" onClick={() => handleConfirm()}>
            go
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<Test />);

    fireEvent.click(getByTestId('go'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalled();
    });

    const call = invoke.mock.calls.find((c) => c[0] === Commands.addUploadedImageWithClickPointToLibrary);
    expect(call).toBeTruthy();

    const args = call![1] as any;

    // Offsets normalized from overlay CSS size (128) to target size (256) => scale factor 2
    expect(args.offset_x).toBe(20);
    expect(args.offset_y).toBe(-40);

    expect(args.click_point_x).toBe(10);
    expect(args.click_point_y).toBe(20);

    expect(args.size).toBe(256);
    expect(args.scale).toBe(1.25);

    // Data should be a number[] matching file bytes
    expect(args.data).toEqual(Array.from(fileBytes));

    expect(showMessage).toHaveBeenCalledWith(
      expect.stringContaining('Added'),
      'success'
    );
  });
});
