import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDragPan } from '@/components/HotspotPicker/hooks/useDragPan';

describe('HotspotPicker/hooks/useDragPan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when disabled', () => {
    const onDrag = vi.fn();
    const { result } = renderHook(() => {
      return useDragPan(false, 2, onDrag);
    });

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 10,
        clientY: 10,
        preventDefault: vi.fn(),
      } as any);
    });

    expect(result.current.isDragging).toBe(false);
    expect(onDrag).not.toHaveBeenCalled();
  });

  it('calls onDrag with scaled deltas while dragging inside element', async () => {
    const onDrag = vi.fn();
    const { result } = renderHook(() => {
      return useDragPan(true, 2, onDrag);
    });

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 10,
        clientY: 10,
        preventDefault: vi.fn(),
      } as any);
    });

    await waitFor(() => {
      expect(result.current.isDragging).toBe(true);
    });

    act(() => {
      result.current.handlers.onMouseMove({
        clientX: 14,
        clientY: 18,
      } as any);
    });

    expect(onDrag).toHaveBeenCalledWith(2, 4);
  });

  it('continues tracking globally after mouse leaves until mouseup', async () => {
    const onDrag = vi.fn();
    const { result } = renderHook(() => {
      return useDragPan(true, 2, onDrag);
    });

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 10,
        clientY: 10,
        preventDefault: vi.fn(),
      } as any);
    });

    await waitFor(() => {
      expect(result.current.isDragging).toBe(true);
    });

    act(() => {
      result.current.handlers.onMouseLeave();
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 }));
    });

    expect(onDrag).toHaveBeenCalledWith(5, 5);

    act(() => {
      result.current.handlers.onMouseEnter({ clientX: 30, clientY: 30 } as any);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 40, clientY: 40 }));
    });

    expect(onDrag).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    await waitFor(() => {
      expect(result.current.isDragging).toBe(false);
    });
  });
});
