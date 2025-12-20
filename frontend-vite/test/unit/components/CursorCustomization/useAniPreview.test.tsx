import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setCachedAniPreview, clearPreviewCache, setPendingAniRequest } from '@/services/cursorPreviewCache';

describe('CursorCustomization/AniPreview useAniPreview', () => {
  beforeEach(() => {
    clearPreviewCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearPreviewCache();
    vi.restoreAllMocks();
  });

  it('returns null data when filePath is null or not .ani', async () => {
    const { useAniPreview } = await import('@/components/CursorCustomization/AniPreview');
    const invoke = vi.fn();

    const { result, rerender } = renderHook(({ p }) => useAniPreview(invoke, p), {
      initialProps: { p: null as any },
    });

    expect(result.current.data).toBeNull();

    rerender({ p: 'C:\\x.cur' });
    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('uses cached ANI preview without invoking backend', async () => {
    const { useAniPreview } = await import('@/components/CursorCustomization/AniPreview');
    const invoke = vi.fn();

    setCachedAniPreview('C:\\x.ani', { frames: ['a'], delays: [50] } as any);

    const { result } = renderHook(() => useAniPreview(invoke, 'C:\\x.ani'));

    await waitFor(() => {
      expect(result.current.data).toEqual({ frames: ['a'], delays: [50] });
    });

    expect(invoke).not.toHaveBeenCalled();
  });

  it('awaits a pending request when one exists', async () => {
    const { useAniPreview } = await import('@/components/CursorCustomization/AniPreview');
    const invoke = vi.fn();

    let resolve!: (v: any) => void;
    const p = new Promise<any>((r) => (resolve = r));
    setPendingAniRequest('C:\\pending.ani', p);

    const { result } = renderHook(() => useAniPreview(invoke, 'C:\\pending.ani'));

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    resolve({ frames: ['x'], delays: [10] });

    await waitFor(() => {
      expect(result.current.data).toEqual({ frames: ['x'], delays: [10] });
      expect(result.current.loading).toBe(false);
    });
  });

  it('invokes backend and caches result when not cached or pending', async () => {
    const { useAniPreview } = await import('@/components/CursorCustomization/AniPreview');

    const invoke = vi.fn().mockResolvedValue({ frames: ['x', 'y'], delays: [1, 1] });

    const { result } = renderHook(() => useAniPreview(invoke, 'C:\\load.ani'));

    await waitFor(() => {
      expect(result.current.data).toEqual({ frames: ['x', 'y'], delays: [1, 1] });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(invoke).toHaveBeenCalledWith('get_ani_preview_data', { file_path: 'C:\\load.ani' });

    const { getCachedAniPreview } = await import('@/services/cursorPreviewCache');
    expect(getCachedAniPreview('C:\\load.ani')).toEqual({ frames: ['x', 'y'], delays: [1, 1] });
  });

  it('sets error when backend fails', async () => {
    const { useAniPreview } = await import('@/components/CursorCustomization/AniPreview');

    const invoke = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useAniPreview(invoke, 'C:\\err.ani'));

    await waitFor(() => {
      expect(result.current.error).toContain('fail');
      expect(result.current.loading).toBe(false);
    });
  });
});
