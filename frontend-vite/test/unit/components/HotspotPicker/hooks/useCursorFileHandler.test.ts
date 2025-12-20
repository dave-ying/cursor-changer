import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCursorFileHandler } from '@/components/HotspotPicker/hooks/useCursorFileHandler';
import { Commands } from '@/tauri/commands';
import { removeImageBackground, isBackgroundRemovalSupported } from '@/lib/backgroundRemoval';

vi.mock('@/lib/backgroundRemoval', () => ({
  removeImageBackground: vi.fn(),
  isBackgroundRemovalSupported: vi.fn(),
}));

describe('HotspotPicker/hooks/useCursorFileHandler', () => {
  let invoke: ReturnType<typeof vi.fn>;
  let showMessage: ReturnType<typeof vi.fn>;
  let loadLibraryCursors: ReturnType<typeof vi.fn>;
  let setObjectUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invoke = vi.fn<(cmd: string, args?: any) => Promise<any>>().mockResolvedValue(undefined);
    showMessage = vi.fn<(message: string, type?: 'success' | 'error' | 'info') => void>();
    loadLibraryCursors = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    setObjectUrl = vi.fn<(url: string | null) => void>();

    vi.mocked(isBackgroundRemovalSupported).mockReturnValue(true);
    vi.mocked(removeImageBackground).mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handleConfirm (new file) normalizes offsets using overlay rect and calls backend add command', async () => {
    const fileBytes = new Uint8Array([9, 8, 7, 6]);
    const file = new File([fileBytes], 'img.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => fileBytes.buffer });

    const overlayRef = {
      current: {
        getBoundingClientRect: () => ({ width: 128, height: 64 }),
      },
    } as any;

    invoke.mockResolvedValueOnce({ id: 'x', name: 'My Image Cursor' });

    const { result } = renderHook(() =>
      useCursorFileHandler({
        file,
        filePath: null,
        itemId: null,
        filename: 'img.png',
        hotspot: { x: 10, y: 20 },
        targetSize: 256,
        imageTransform: { scale: 2, offsetX: 5, offsetY: -3 },
        overlayRef,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      })
    );

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(invoke).toHaveBeenCalledWith(Commands.addUploadedImageWithClickPointToLibrary, {
      filename: 'img.png',
      data: [9, 8, 7, 6],
      size: 256,
      click_point_x: 10,
      click_point_y: 20,
      scale: 2,
      offset_x: 10,
      offset_y: -12,
    });

    expect(showMessage).toHaveBeenCalledWith(
      'Added My Image Cursor to library with hotspot (10, 20)',
      'success'
    );
  });

  it('handleConfirm (existing filePath) shows error when itemId is missing', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useCursorFileHandler({
        file: null,
        filePath: 'C:\\x.cur',
        itemId: null,
        filename: 'x.cur',
        hotspot: { x: 1, y: 2 },
        targetSize: 32,
        imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
        overlayRef: { current: null } as any,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      })
    );

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(invoke).not.toHaveBeenCalledWith(Commands.updateLibraryCursorClickPoint, expect.anything());

    const calls = showMessage.mock.calls.filter((c) => c[1] === 'error');
    expect(calls.length).toBeGreaterThan(0);
    expect(String(calls[calls.length - 1][0])).toContain('Failed to update hotspot:');

    consoleErrorSpy.mockRestore();
  });

  it('handleDelete removes a library cursor and refreshes list', async () => {
    const { result } = renderHook(() =>
      useCursorFileHandler({
        file: null,
        filePath: 'C:\\x.cur',
        itemId: 'id_1',
        filename: 'x.cur',
        hotspot: { x: 1, y: 2 },
        targetSize: 32,
        imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
        overlayRef: { current: null } as any,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(invoke).toHaveBeenCalledWith(Commands.removeCursorFromLibrary, { id: 'id_1' });
    expect(loadLibraryCursors).toHaveBeenCalledTimes(1);
    expect(showMessage).toHaveBeenCalledWith('Deleted x.cur from library', 'success');
  });

  it('handleRemoveBackground shows error when unsupported', async () => {
    vi.mocked(isBackgroundRemovalSupported).mockReturnValue(false);

    const file = new File([new Uint8Array([1])], 'img.gif', { type: 'image/gif' });

    const { result } = renderHook(() =>
      useCursorFileHandler({
        file,
        filePath: null,
        itemId: null,
        filename: 'img.gif',
        hotspot: { x: 0, y: 0 },
        targetSize: 32,
        imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
        overlayRef: { current: null } as any,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      })
    );

    await act(async () => {
      await result.current.handleRemoveBackground();
    });

    expect(showMessage).toHaveBeenCalledWith('Background removal is not supported for this file type', 'error');
    expect(removeImageBackground).not.toHaveBeenCalled();
  });

  it('handleRemoveBackground processes image and updates object URL', async () => {
    const urlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:processed');

    const file = new File([new Uint8Array([1])], 'img.png', { type: 'image/png' });

    const { result } = renderHook(() =>
      useCursorFileHandler({
        file,
        filePath: null,
        itemId: null,
        filename: 'img.png',
        hotspot: { x: 0, y: 0 },
        targetSize: 32,
        imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
        overlayRef: { current: null } as any,
        invoke,
        showMessage,
        loadLibraryCursors,
        setObjectUrl,
      })
    );

    await act(async () => {
      await result.current.handleRemoveBackground();
    });

    await waitFor(() => {
      expect(setObjectUrl).toHaveBeenCalledWith('blob:processed');
    });

    expect(removeImageBackground).toHaveBeenCalledTimes(1);
    expect(urlSpy).toHaveBeenCalledTimes(1);
    expect(showMessage).toHaveBeenCalledWith('Background removed successfully!', 'success');

    urlSpy.mockRestore();
  });
});
