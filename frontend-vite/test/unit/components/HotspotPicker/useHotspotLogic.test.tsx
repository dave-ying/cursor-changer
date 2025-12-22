import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';

const mockInvoke = vi.fn();
const mockLoadLibraryCursors = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke,
  }),
}));

vi.mock('@/hooks/useMessage', () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
    addToast: vi.fn(),
    message: { text: '', type: '' }
  }),
}));

const mockSetImageTransform = vi.fn();
const mockCalculateFitScale = vi.fn(() => 1);

vi.mock('@/components/HotspotPicker/hooks/useImageScaler', () => ({
  useImageScaler: () => ({
    imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    setImageTransform: mockSetImageTransform,
    calculateFitScale: mockCalculateFitScale,
  }),
}));

const mockHandleConfirm = vi.fn(async () => {});
const mockHandleDelete = vi.fn(async () => {});
const mockHandleRemoveBackground = vi.fn(async () => {});

vi.mock('@/components/HotspotPicker/hooks/useCursorFileHandler', () => ({
  useCursorFileHandler: () => ({
    busy: false,
    isRemovingBackground: false,
    handleConfirm: mockHandleConfirm,
    handleDelete: mockHandleDelete,
    handleRemoveBackground: mockHandleRemoveBackground,
  }),
}));

describe('HotspotPicker/useHotspotLogic', () => {
  let initialStoreState: ReturnType<typeof useAppStore.getState>;

  beforeEach(() => {
    vi.clearAllMocks();
    initialStoreState = useAppStore.getState();
    useAppStore.setState(
      (state) => ({
        ...state,
        operations: {
          ...state.operations,
          loadLibraryCursors: mockLoadLibraryCursors,
        }
      }),
      true
    );
  });

  afterEach(() => {
    useAppStore.setState(initialStoreState, true);
    vi.restoreAllMocks();
  });

  it('creates and revokes object URL for uploaded file', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:abc');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const file = new File([new Uint8Array([1])], 'x.png', { type: 'image/png' });

    const { result, unmount } = renderHook(() => useHotspotLogic({ file, onCancel: vi.fn() } as any));

    await waitFor(() => {
      expect(result.current.objectUrl).toBe('blob:abc');
    });

    expect(createSpy).toHaveBeenCalledWith(file);

    unmount();
    expect(revokeSpy).toHaveBeenCalledWith('blob:abc');
  });

  it('loads cursor info when editing existing cursor (filePath) and sets hotspot + target size', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    mockInvoke.mockResolvedValueOnce({
      data_url: 'data:image/png;base64,abc',
      width: 64,
      height: 64,
      click_point_x: 3,
      click_point_y: 4,
    });

    const filePath = 'C:\\cursors\\x.cur';

    const { result } = renderHook(() => useHotspotLogic({ filePath, onCancel: vi.fn() } as any));

    await waitFor(() => {
      expect(result.current.objectUrl).toBe('data:image/png;base64,abc');
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_cursor_with_click_point', { file_path: filePath });
    expect(result.current.cursorInfo).toEqual({ width: 64, height: 64, hotspot_x: 3, hotspot_y: 4 });
    expect(result.current.hotspot).toEqual({ x: 3, y: 4 });
    expect(result.current.targetSize).toBe(64);
  });

  it('surfaces error via showMessage when loading cursor info fails', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockInvoke.mockRejectedValueOnce(new Error('fail'));

    renderHook(() => useHotspotLogic({ filePath: 'C:\\x.cur', onCancel: vi.fn() } as any));

    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load cursor info', 'error');
    });

    consoleErrorSpy.mockRestore();
  });

  it('resets hotspot to (0,0) when targetSize changes in create mode', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const { result } = renderHook(() => useHotspotLogic({ onCancel: vi.fn() } as any));

    act(() => {
      result.current.setHotspot({ x: 10, y: 20 });
    });

    expect(result.current.hotspot).toEqual({ x: 10, y: 20 });

    act(() => {
      result.current.setTargetSize(128);
    });

    await waitFor(() => {
      expect(result.current.hotspot).toEqual({ x: 0, y: 0 });
    });
  });

  it('updates hotspot with arrow keys when not busy and clamps to bounds', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const { result } = renderHook(() => useHotspotLogic({ onCancel: vi.fn() } as any));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    // Clamp at 0
    expect(result.current.hotspot.x).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    await waitFor(() => {
      expect(result.current.hotspot.x).toBe(1);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    await waitFor(() => {
      expect(result.current.hotspot).toEqual({ x: 1, y: 1 });
    });

  });

  it('handlePick maps click position into hotspot coordinates', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const { result } = renderHook(() => useHotspotLogic({ onCancel: vi.fn() } as any));

    const overlay = {
      getBoundingClientRect: () => ({
        width: 100,
        height: 100,
        left: 0,
        top: 0,
      }),
    } as any;

    act(() => {
      result.current.overlayRef.current = overlay;
    });

    act(() => {
      result.current.handlePick({ clientX: 50, clientY: 25 } as any);
    });

    // 50% of 256 => 128; 25% => 64
    expect(result.current.hotspot).toEqual({ x: 128, y: 64 });
  });

  it('startHoldAction executes immediately and stopHoldAction cancels animation frame', async () => {
    const { useHotspotLogic } = await import('@/components/HotspotPicker/useHotspotLogic');

    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      // do not execute cb; just return id
      return 123;
    });
    const cancelSpy = vi.fn();

    (globalThis as any).requestAnimationFrame = rafSpy;
    (globalThis as any).cancelAnimationFrame = cancelSpy;

    const action = vi.fn();

    const { result, unmount } = renderHook(() => useHotspotLogic({ onCancel: vi.fn() } as any));

    act(() => {
      result.current.startHoldAction(action);
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(rafSpy).toHaveBeenCalled();

    act(() => {
      result.current.stopHoldAction();
    });

    expect(cancelSpy).toHaveBeenCalledWith(123);

    // Ensure cleanup does not throw
    unmount();
  });
});
