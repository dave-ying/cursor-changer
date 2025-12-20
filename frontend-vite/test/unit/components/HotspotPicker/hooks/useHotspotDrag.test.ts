import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHotspotDrag } from '@/components/HotspotPicker/hooks/useHotspotDrag';

const createOverlayRef = () => {
  const overlay = document.createElement('div');
  overlay.getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => {}
  }));
  return { current: overlay } as React.MutableRefObject<HTMLDivElement | null>;
};

const mockMouseEvent = (x: number, y: number) =>
  ({
    clientX: x,
    clientY: y,
    preventDefault: vi.fn()
  }) as unknown as React.MouseEvent<HTMLDivElement>;

describe('useHotspotDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets hotspot on mouse down and clamps values within bounds', () => {
    const overlayRef = createOverlayRef();
    const onHotspotChange = vi.fn();
    const { result } = renderHook(() => useHotspotDrag(true, overlayRef, 256, onHotspotChange));

    act(() => {
      result.current.handlers.onMouseDown?.(mockMouseEvent(300, 200));
    });

    // width:200 => scale 1.28, 300 * 1.28 => clamp to 255
    expect(onHotspotChange).toHaveBeenCalledWith(255, 255);
  });

  it('updates hotspot based on document mousemove and stops after mouseup', async () => {
    const overlayRef = createOverlayRef();
    const onHotspotChange = vi.fn();
    const { result } = renderHook(() => useHotspotDrag(true, overlayRef, 256, onHotspotChange));

    act(() => {
      result.current.handlers.onMouseDown?.(mockMouseEvent(10, 10));
    });
    expect(onHotspotChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 20 }));
    });

    expect(onHotspotChange).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    onHotspotChange.mockClear();

    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
    });

    expect(onHotspotChange).not.toHaveBeenCalled();
  });

  it('ignores events when disabled and resumes when mouse re-enters with button down', () => {
    const overlayRef = createOverlayRef();
    const onHotspotChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }) => useHotspotDrag(enabled, overlayRef, 256, onHotspotChange),
      { initialProps: { enabled: false } }
    );

    act(() => {
      result.current.handlers.onMouseDown?.(mockMouseEvent(50, 50));
    });

    expect(onHotspotChange).not.toHaveBeenCalled();

    rerender({ enabled: true });

    act(() => {
      result.current.handlers.onMouseDown?.(mockMouseEvent(20, 20));
    });

    expect(onHotspotChange).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handlers.onMouseLeave?.();
    });

    act(() => {
      result.current.handlers.onMouseEnter?.(mockMouseEvent(30, 30));
    });

    expect(onHotspotChange).toHaveBeenCalledTimes(1);
  });
});
