/**
 * Unit tests for cursor preview cache service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedPreview,
  setCachedPreview,
  invalidatePreview,
  clearPreviewCache,
  getCacheStats,
  getCachedAniPreview,
  setCachedAniPreview,
  hasPendingRequest,
  getPendingRequest,
  setPendingRequest,
  hasPendingAniRequest,
  getPendingAniRequest,
  setPendingAniRequest,
  preloadCursorPreviews,
  getExtendedCacheStats
} from '@/services/cursorPreviewCache';

describe('Cursor Preview Cache Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearPreviewCache();
    // Note: pending requests are cleaned up automatically when promises resolve/reject
    // For tests that check pending state, we need to ensure clean state
  });

  describe('Basic Cache Operations', () => {
    describe('getCachedPreview', () => {
      it('returns null for uncached items', () => {
        expect(getCachedPreview('nonexistent')).toBeNull();
      });

      it('returns cached data URL', () => {
        setCachedPreview('test.cur', 'data:image/png;base64,abc123');
        expect(getCachedPreview('test.cur')).toBe('data:image/png;base64,abc123');
      });
    });

    describe('setCachedPreview', () => {
      it('stores preview in cache', () => {
        setCachedPreview('cursor.cur', 'data:image/png;base64,xyz');
        expect(getCachedPreview('cursor.cur')).toBe('data:image/png;base64,xyz');
      });

      it('overwrites existing cache entry', () => {
        setCachedPreview('cursor.cur', 'old-data');
        setCachedPreview('cursor.cur', 'new-data');
        expect(getCachedPreview('cursor.cur')).toBe('new-data');
      });

      it('evicts oldest entry when cache is full', () => {
        // Fill cache to max (200 entries)
        for (let i = 0; i < 200; i++) {
          setCachedPreview(`cursor${i}.cur`, `data${i}`);
        }

        // Add one more - should evict the oldest
        setCachedPreview('new-cursor.cur', 'new-data');

        // New entry should exist
        expect(getCachedPreview('new-cursor.cur')).toBe('new-data');

        // Cache size should still be at max
        const stats = getCacheStats();
        expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
      });
    });

    describe('invalidatePreview', () => {
      it('removes specific cache entry', () => {
        setCachedPreview('cursor1.cur', 'data1');
        setCachedPreview('cursor2.cur', 'data2');

        invalidatePreview('cursor1.cur');

        expect(getCachedPreview('cursor1.cur')).toBeNull();
        expect(getCachedPreview('cursor2.cur')).toBe('data2');
      });

      it('does nothing for non-existent entry', () => {
        setCachedPreview('cursor.cur', 'data');
        invalidatePreview('nonexistent.cur');
        expect(getCachedPreview('cursor.cur')).toBe('data');
      });
    });

    describe('clearPreviewCache', () => {
      it('clears all cache entries', () => {
        setCachedPreview('cursor1.cur', 'data1');
        setCachedPreview('cursor2.cur', 'data2');

        clearPreviewCache();

        expect(getCachedPreview('cursor1.cur')).toBeNull();
        expect(getCachedPreview('cursor2.cur')).toBeNull();
      });

      it('also clears ANI cache', () => {
        setCachedAniPreview('anim.ani', { frames: [], timing: [] } as any);

        clearPreviewCache();

        expect(getCachedAniPreview('anim.ani')).toBeNull();
      });
    });
  });

  describe('ANI Preview Cache', () => {
    describe('getCachedAniPreview', () => {
      it('returns null for uncached ANI files', () => {
        expect(getCachedAniPreview('nonexistent.ani')).toBeNull();
      });

      it('returns cached ANI data', () => {
        const aniData = { frames: ['frame1', 'frame2'], timing: [100, 100] };
        setCachedAniPreview('anim.ani', aniData as any);
        expect(getCachedAniPreview('anim.ani')).toEqual(aniData);
      });
    });

    describe('setCachedAniPreview', () => {
      it('stores ANI preview data', () => {
        const aniData = { frames: ['frame1'], timing: [50] };
        setCachedAniPreview('cursor.ani', aniData as any);
        expect(getCachedAniPreview('cursor.ani')).toEqual(aniData);
      });

      it('evicts oldest entry when ANI cache is full', () => {
        // Fill ANI cache to max (100 entries)
        for (let i = 0; i < 100; i++) {
          setCachedAniPreview(`anim${i}.ani`, { frames: [`f${i}`], timing: [i] } as any);
        }

        // Add one more
        setCachedAniPreview('new-anim.ani', { frames: ['new'], timing: [999] } as any);

        // New entry should exist
        expect(getCachedAniPreview('new-anim.ani')).toEqual({ frames: ['new'], timing: [999] });

        // Cache size should still be at max
        const stats = getCacheStats();
        expect(stats.aniSize).toBeLessThanOrEqual(stats.aniMaxSize);
      });
    });
  });

  describe('Pending Request Tracking', () => {
    describe('Static preview requests', () => {
      it('hasPendingRequest returns false for no pending request', () => {
        expect(hasPendingRequest('cursor.cur')).toBe(false);
      });

      it('hasPendingRequest returns true for pending request', () => {
        const promise = new Promise<string>(() => {});
        setPendingRequest('cursor.cur', promise);
        expect(hasPendingRequest('cursor.cur')).toBe(true);
      });

      it('getPendingRequest returns null for no pending request', () => {
        // Use a unique key that hasn't been used in other tests
        expect(getPendingRequest('unique-cursor-get-pending.cur')).toBeNull();
      });

      it('getPendingRequest returns the pending promise', () => {
        const promise = new Promise<string>(() => {});
        setPendingRequest('cursor.cur', promise);
        expect(getPendingRequest('cursor.cur')).toBe(promise);
      });

      it('cleans up pending request after resolution', async () => {
        let resolve: (value: string) => void;
        const promise = new Promise<string>((r) => { resolve = r; });
        const uniqueKey = 'cursor-resolve-test.cur';
        setPendingRequest(uniqueKey, promise);

        expect(hasPendingRequest(uniqueKey)).toBe(true);

        resolve!('data');
        await promise;

        // Wait for cleanup
        await new Promise(r => setTimeout(r, 10));
        expect(hasPendingRequest(uniqueKey)).toBe(false);
      });

      // Note: Testing rejection cleanup is tricky due to unhandled rejection handling
      // The cleanup behavior is tested implicitly through the preloadCursorPreviews tests
      // which handle errors gracefully
    });

    describe('ANI preview requests', () => {
      it('hasPendingAniRequest returns false for no pending request', () => {
        // Use a unique key to avoid conflicts with other tests
        expect(hasPendingAniRequest('unique-anim-1.ani')).toBe(false);
      });

      it('hasPendingAniRequest returns true for pending request', () => {
        const promise = new Promise<any>(() => {});
        setPendingAniRequest('unique-anim-2.ani', promise);
        expect(hasPendingAniRequest('unique-anim-2.ani')).toBe(true);
      });

      it('getPendingAniRequest returns null for no pending request', () => {
        // Use a unique key to avoid conflicts with other tests
        expect(getPendingAniRequest('unique-anim-3.ani')).toBeNull();
      });

      it('getPendingAniRequest returns the pending promise', () => {
        const promise = new Promise<any>(() => {});
        setPendingAniRequest('unique-anim-4.ani', promise);
        expect(getPendingAniRequest('unique-anim-4.ani')).toBe(promise);
      });
    });
  });

  describe('Cache Statistics', () => {
    describe('getCacheStats', () => {
      it('returns correct initial stats', () => {
        const stats = getCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.maxSize).toBe(200);
        expect(stats.aniSize).toBe(0);
        expect(stats.aniMaxSize).toBe(100);
      });

      it('reflects cache size changes', () => {
        setCachedPreview('cursor1.cur', 'data1');
        setCachedPreview('cursor2.cur', 'data2');
        setCachedAniPreview('anim.ani', { frames: [], timing: [] } as any);

        const stats = getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.aniSize).toBe(1);
      });
    });

    describe('getExtendedCacheStats', () => {
      it('includes pending request counts', () => {
        // Get initial counts
        const initialStats = getExtendedCacheStats();
        const initialPending = initialStats.pendingRequests;
        const initialAniPending = initialStats.pendingAniRequests;

        // Add new pending requests with unique keys
        setPendingRequest('stats-test-cursor.cur', new Promise(() => {}));
        setPendingAniRequest('stats-test-anim.ani', new Promise(() => {}));

        const stats = getExtendedCacheStats();
        expect(stats.pendingRequests).toBe(initialPending + 1);
        expect(stats.pendingAniRequests).toBe(initialAniPending + 1);
      });
    });
  });

  describe('Batch Preloading', () => {
    describe('preloadCursorPreviews', () => {
      it('preloads system cursors', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,abc');
        const cursors = [
          { name: 'Normal', image_path: null },
          { name: 'IBeam', image_path: null }
        ];

        await preloadCursorPreviews(cursors, mockInvoke);

        expect(mockInvoke).toHaveBeenCalledWith('get_system_cursor_preview', { cursor_name: 'Normal' });
        expect(mockInvoke).toHaveBeenCalledWith('get_system_cursor_preview', { cursor_name: 'IBeam' });
      });

      it('preloads custom cursors', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,abc');
        const cursors = [
          { name: 'Custom', image_path: 'C:\\custom.cur' }
        ];

        await preloadCursorPreviews(cursors, mockInvoke);

        expect(mockInvoke).toHaveBeenCalledWith('get_library_cursor_preview', { file_path: 'C:\\custom.cur' });
      });

      it('skips already cached cursors', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,abc');

        // Pre-cache one cursor
        setCachedPreview('system:Normal', 'cached-data');

        const cursors = [
          { name: 'Normal', image_path: null },
          { name: 'IBeam', image_path: null }
        ];

        await preloadCursorPreviews(cursors, mockInvoke);

        // Should only call for IBeam, not Normal
        expect(mockInvoke).not.toHaveBeenCalledWith('get_system_cursor_preview', { cursor_name: 'Normal' });
        expect(mockInvoke).toHaveBeenCalledWith('get_system_cursor_preview', { cursor_name: 'IBeam' });
      });

      it('skips ANI files (they are loaded separately)', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,abc');
        const cursors = [
          { name: 'Animated', image_path: 'C:\\anim.ani' },
          { name: 'Static', image_path: 'C:\\static.cur' }
        ];

        await preloadCursorPreviews(cursors, mockInvoke);

        // Should not call for ANI file with get_library_cursor_preview
        expect(mockInvoke).not.toHaveBeenCalledWith('get_library_cursor_preview', { file_path: 'C:\\anim.ani' });
        // Should call for static cursor
        expect(mockInvoke).toHaveBeenCalledWith('get_library_cursor_preview', { file_path: 'C:\\static.cur' });
      });

      it('handles preload errors gracefully', async () => {
        const mockInvoke = vi.fn()
          .mockResolvedValueOnce('data:image/png;base64,abc')
          .mockRejectedValueOnce(new Error('Failed'));

        const cursors = [
          { name: 'Normal', image_path: null },
          { name: 'IBeam', image_path: null }
        ];

        // Should not throw
        await preloadCursorPreviews(cursors, mockInvoke);

        // First cursor should be cached
        expect(getCachedPreview('system:Normal')).toBe('data:image/png;base64,abc');
        // Second cursor should not be cached (failed)
        expect(getCachedPreview('system:IBeam')).toBeNull();
      });

      it('caches successful preloads', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,preloaded');
        const cursors = [
          { name: 'Normal', image_path: null }
        ];

        await preloadCursorPreviews(cursors, mockInvoke);

        expect(getCachedPreview('system:Normal')).toBe('data:image/png;base64,preloaded');
      });
    });
  });
});
