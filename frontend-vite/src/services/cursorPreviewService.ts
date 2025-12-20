import type { AniPreviewData } from '../types/generated/AniPreviewData';
import { logger } from '../utils/logger';

type TimedCache<T> = {
  get: (key: string) => T | null;
  set: (key: string, value: T) => void;
};

type PendingTracker<T> = {
  has: (key: string) => boolean;
  set: (key: string, promise: Promise<T>) => void;
};

export interface CursorPreloadInfo {
  name: string;
  image_path: string | null;
}

export interface CursorPreviewFetchers {
  fetchLibraryCursorPreview: (filePath: string) => Promise<string>;
  fetchSystemCursorPreview: (cursorName: string) => Promise<string>;
  fetchAniPreviewData: (filePath: string) => Promise<AniPreviewData>;
}

export function createCursorPreviewService(deps: {
  previewCache: TimedCache<string>;
  aniPreviewCache: TimedCache<AniPreviewData>;
  pendingPreviewRequests: PendingTracker<string>;
  pendingAniRequests: PendingTracker<AniPreviewData>;
}) {
  async function preloadAniPreview(filePath: string, fetchers: CursorPreviewFetchers): Promise<void> {
    if (deps.aniPreviewCache.get(filePath)) return;
    if (deps.pendingAniRequests.has(filePath)) return;

    const promise = (async () => {
      const data = await fetchers.fetchAniPreviewData(filePath);
      deps.aniPreviewCache.set(filePath, data);
      return data;
    })();

    deps.pendingAniRequests.set(filePath, promise);
  }

  async function preloadCursorPreviews(
    cursors: CursorPreloadInfo[],
    fetchers: CursorPreviewFetchers
  ): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    for (const cursor of cursors) {
      const filePath = cursor.image_path;
      const isAniFile = filePath?.toLowerCase().endsWith('.ani');

      if (isAniFile && filePath) {
        preloadAniPreview(filePath, fetchers).catch(() => {
          // Errors are non-fatal for background preloads.
        });
        continue;
      }

      if (filePath) {
        const cacheKey = filePath;

        if (deps.previewCache.get(cacheKey)) continue;
        if (deps.pendingPreviewRequests.has(cacheKey)) continue;

        const promise = (async () => {
          try {
            const dataUrl = await fetchers.fetchLibraryCursorPreview(filePath);
            deps.previewCache.set(cacheKey, dataUrl);
          } catch (err) {
            logger.warn(`[PreloadCache] Failed to preload cursor preview for ${cursor.name}:`, err);
          }
        })();

        deps.pendingPreviewRequests.set(cacheKey, promise.then(() => ''));
        loadPromises.push(promise);
        continue;
      }

      const systemCacheKey = `system:${cursor.name}`;

      if (deps.previewCache.get(systemCacheKey)) continue;
      if (deps.pendingPreviewRequests.has(systemCacheKey)) continue;

      const promise = (async () => {
        try {
          const dataUrl = await fetchers.fetchSystemCursorPreview(cursor.name);
          deps.previewCache.set(systemCacheKey, dataUrl);
        } catch (err) {
          logger.warn(`[PreloadCache] Failed to preload system cursor preview for ${cursor.name}:`, err);
        }
      })();

      deps.pendingPreviewRequests.set(systemCacheKey, promise.then(() => ''));
      loadPromises.push(promise);
    }

    await Promise.all(loadPromises);
  }

  return {
    preloadCursorPreviews,
    preloadAniPreview,
  };
}
