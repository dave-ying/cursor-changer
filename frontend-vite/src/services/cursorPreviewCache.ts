/**
 * Cursor Preview Cache Service
 *
 * Caches cursor preview data URLs to avoid redundant backend calls.
 * .CUR files should preview almost instantly after the first load.
 * .ANI files cache their frame data for smooth animations without reloading.
 * 
 * Optimizations:
 * - Persistent cache across cursor style switches (Windows <-> Mac)
 * - Batch preloading support for instant UI updates
 * - Separate tracking for in-flight requests to prevent duplicate calls
 */

import type { AniPreviewData } from '../types/generated/AniPreviewData';
import { Commands } from '../tauri/commands';
import { createTimedCache, type NowFn } from './cache/timedCache';
import { createPendingRequestTracker } from './cache/pendingRequests';
import { createCursorPreviewService, type CursorPreviewFetchers, type CursorPreloadInfo } from './cursorPreviewService';

type CursorPreviewCacheDeps = {
    now?: NowFn;
    cacheExpirationMs?: number;
    previewMaxSize?: number;
    aniMaxSize?: number;
};

function buildCaches(options: Required<CursorPreviewCacheDeps>) {
    const { now, cacheExpirationMs, previewMaxSize, aniMaxSize } = options;

    const previewCache = createTimedCache<string>({
        expirationMs: cacheExpirationMs,
        maxSize: previewMaxSize,
        now,
    });

    const aniPreviewCache = createTimedCache<AniPreviewData>({
        expirationMs: cacheExpirationMs,
        maxSize: aniMaxSize,
        now,
    });

    const pendingRequests = createPendingRequestTracker<string>();
    const pendingAniRequests = createPendingRequestTracker<AniPreviewData>();

    return { previewCache, aniPreviewCache, pendingRequests, pendingAniRequests };
}

export function createCursorPreviewCache(deps: CursorPreviewCacheDeps = {}) {
    // Defaults: 30 minutes, sizes tuned for both platforms
    const {
        now = () => Date.now(),
        cacheExpirationMs = 30 * 60 * 1000,
        previewMaxSize = 200,
        aniMaxSize = 100,
    } = deps;

    const { previewCache, aniPreviewCache, pendingRequests, pendingAniRequests } = buildCaches({
        now,
        cacheExpirationMs,
        previewMaxSize,
        aniMaxSize,
    });

    const cursorPreviewService = createCursorPreviewService({
        previewCache,
        aniPreviewCache,
        pendingPreviewRequests: pendingRequests,
        pendingAniRequests,
    });

    return {
        /**
         * Get a cached preview data URL for a cursor file
         */
        getCachedPreview(filePath: string): string | null {
            return previewCache.get(filePath);
        },

        /**
         * Cache a preview data URL for a cursor file
         */
        setCachedPreview(filePath: string, dataUrl: string): void {
            previewCache.set(filePath, dataUrl);
        },

        /**
         * Invalidate a specific cache entry (e.g., when cursor file is updated)
         */
        invalidatePreview(filePath: string): void {
            previewCache.delete(filePath);
        },

        /**
         * Clear the entire preview cache (both static and ANI)
         */
        clearPreviewCache(): void {
            previewCache.clear();
            aniPreviewCache.clear();
        },

        /**
         * Get cache statistics for debugging
         */
        getCacheStats(): {
            size: number;
            maxSize: number;
            aniSize: number;
            aniMaxSize: number;
        } {
            return {
                size: previewCache.size(),
                maxSize: previewMaxSize,
                aniSize: aniPreviewCache.size(),
                aniMaxSize: aniMaxSize,
            };
        },

        /**
         * Get cached ANI preview data for an animated cursor file
         */
        getCachedAniPreview(filePath: string): AniPreviewData | null {
            return aniPreviewCache.get(filePath);
        },

        /**
         * Cache ANI preview data for an animated cursor file
         */
        setCachedAniPreview(filePath: string, data: AniPreviewData): void {
            aniPreviewCache.set(filePath, data);
        },

        /**
         * Check if a preview request is already in flight
         */
        hasPendingRequest(cacheKey: string): boolean {
            return pendingRequests.has(cacheKey);
        },

        /**
         * Get a pending request promise if one exists
         */
        getPendingRequest(cacheKey: string): Promise<string> | null {
            return pendingRequests.get(cacheKey);
        },

        /**
         * Register a pending request to prevent duplicate backend calls
         */
        setPendingRequest(cacheKey: string, promise: Promise<string>): void {
            pendingRequests.set(cacheKey, promise);
        },

        /**
         * Check if an ANI preview request is already in flight
         */
        hasPendingAniRequest(filePath: string): boolean {
            return pendingAniRequests.has(filePath);
        },

        /**
         * Get a pending ANI request promise if one exists
         */
        getPendingAniRequest(filePath: string): Promise<AniPreviewData> | null {
            return pendingAniRequests.get(filePath);
        },

        /**
         * Register a pending ANI request to prevent duplicate backend calls
         */
        setPendingAniRequest(filePath: string, promise: Promise<AniPreviewData>): void {
            pendingAniRequests.set(filePath, promise);
        },

        /**
         * Batch preload cursor previews for a list of cursors.
         * This loads all previews in parallel and caches them for instant display.
         */
        async preloadCursorPreviews(
            cursors: CursorPreloadInfo[],
            invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
        ): Promise<void> {
            const fetchers: CursorPreviewFetchers = {
                fetchLibraryCursorPreview: async (filePath: string) => {
                    return (await invoke(Commands.getLibraryCursorPreview, { file_path: filePath })) as string;
                },
                fetchSystemCursorPreview: async (cursorName: string) => {
                    return (await invoke(Commands.getSystemCursorPreview, { cursor_name: cursorName })) as string;
                },
                fetchAniPreviewData: async (filePath: string) => {
                    return (await invoke(Commands.getAniPreviewData, { file_path: filePath })) as AniPreviewData;
                },
            };

            await cursorPreviewService.preloadCursorPreviews(cursors, fetchers);
        },

        /**
         * Get extended cache statistics for debugging
         */
        getExtendedCacheStats(): {
            size: number;
            maxSize: number;
            aniSize: number;
            aniMaxSize: number;
            pendingRequests: number;
            pendingAniRequests: number;
        } {
            return {
                size: previewCache.size(),
                maxSize: previewMaxSize,
                aniSize: aniPreviewCache.size(),
                aniMaxSize: aniMaxSize,
                pendingRequests: pendingRequests.size(),
                pendingAniRequests: pendingAniRequests.size(),
            };
        },
    };
}

export type CursorPreviewCache = ReturnType<typeof createCursorPreviewCache>;

// Default singleton instance for app runtime
const defaultCursorPreviewCache = createCursorPreviewCache();

export const {
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
    getExtendedCacheStats,
} = defaultCursorPreviewCache;
