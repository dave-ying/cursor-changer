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

let now: NowFn = () => Date.now();

// Cache expiration time (30 minutes) - previews rarely change
const CACHE_EXPIRATION_MS = 30 * 60 * 1000;

// Maximum cache size to prevent memory issues
const MAX_CACHE_SIZE = 200; // Increased to hold both Windows and Mac cursors
const MAX_ANI_CACHE_SIZE = 100; // Increased for better coverage

// Cache with file path as key
const previewCache = createTimedCache<string>({
    expirationMs: CACHE_EXPIRATION_MS,
    maxSize: MAX_CACHE_SIZE,
    now: () => now(),
});

// Separate cache for ANI preview data (frames + timing)
const aniPreviewCache = createTimedCache<AniPreviewData>({
    expirationMs: CACHE_EXPIRATION_MS,
    maxSize: MAX_ANI_CACHE_SIZE,
    now: () => now(),
});

// Track in-flight requests to prevent duplicate backend calls
const pendingRequests = createPendingRequestTracker<string>();
const pendingAniRequests = createPendingRequestTracker<AniPreviewData>();

const cursorPreviewService = createCursorPreviewService({
    previewCache,
    aniPreviewCache,
    pendingPreviewRequests: pendingRequests,
    pendingAniRequests,
});

export function __setCursorPreviewCacheNowForTests(nextNow: NowFn): void {
    now = nextNow;
}

/**
 * Get a cached preview data URL for a cursor file
 * @param filePath The file path of the cursor
 * @returns The cached data URL or null if not cached/expired
 */
export function getCachedPreview(filePath: string): string | null {
    return previewCache.get(filePath);
}

/**
 * Cache a preview data URL for a cursor file
 * @param filePath The file path of the cursor
 * @param dataUrl The data URL to cache
 */
export function setCachedPreview(filePath: string, dataUrl: string): void {
    previewCache.set(filePath, dataUrl);
}

/**
 * Invalidate a specific cache entry (e.g., when cursor file is updated)
 * @param filePath The file path to invalidate
 */
export function invalidatePreview(filePath: string): void {
    previewCache.delete(filePath);
}

/**
 * Clear the entire preview cache (both static and ANI)
 */
export function clearPreviewCache(): void {
    previewCache.clear();
    aniPreviewCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): {
    size: number;
    maxSize: number;
    aniSize: number;
    aniMaxSize: number;
} {
    return {
        size: previewCache.size(),
        maxSize: MAX_CACHE_SIZE,
        aniSize: aniPreviewCache.size(),
        aniMaxSize: MAX_ANI_CACHE_SIZE
    };
}

/**
 * Get cached ANI preview data for an animated cursor file
 * @param filePath The file path of the ANI cursor
 * @returns The cached ANI preview data or null if not cached/expired
 */
export function getCachedAniPreview(filePath: string): AniPreviewData | null {
    return aniPreviewCache.get(filePath);
}

/**
 * Cache ANI preview data for an animated cursor file
 * @param filePath The file path of the ANI cursor
 * @param data The ANI preview data to cache
 */
export function setCachedAniPreview(
    filePath: string,
    data: AniPreviewData
): void {
    aniPreviewCache.set(filePath, data);
}

/**
 * Check if a preview request is already in flight
 */
export function hasPendingRequest(cacheKey: string): boolean {
    return pendingRequests.has(cacheKey);
}

/**
 * Get a pending request promise if one exists
 */
export function getPendingRequest(cacheKey: string): Promise<string> | null {
    return pendingRequests.get(cacheKey);
}

/**
 * Register a pending request to prevent duplicate backend calls
 */
export function setPendingRequest(cacheKey: string, promise: Promise<string>): void {
    pendingRequests.set(cacheKey, promise);
}

/**
 * Check if an ANI preview request is already in flight
 */
export function hasPendingAniRequest(filePath: string): boolean {
    return pendingAniRequests.has(filePath);
}

/**
 * Get a pending ANI request promise if one exists
 */
export function getPendingAniRequest(filePath: string): Promise<AniPreviewData> | null {
    return pendingAniRequests.get(filePath);
}

/**
 * Register a pending ANI request to prevent duplicate backend calls
 */
export function setPendingAniRequest(filePath: string, promise: Promise<AniPreviewData>): void {
    pendingAniRequests.set(filePath, promise);
}

/**
 * Cursor info for batch preloading
 */
/**
 * Batch preload cursor previews for a list of cursors.
 * This loads all previews in parallel and caches them for instant display.
 * 
 * @param cursors Array of cursor info objects
 * @param invoke Tauri invoke function
 * @returns Promise that resolves when all non-ANI previews are loaded
 */
export async function preloadCursorPreviews(
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
}

/**
 * Get extended cache statistics for debugging
 */
export function getExtendedCacheStats(): {
    size: number;
    maxSize: number;
    aniSize: number;
    aniMaxSize: number;
    pendingRequests: number;
    pendingAniRequests: number;
} {
    return {
        size: previewCache.size(),
        maxSize: MAX_CACHE_SIZE,
        aniSize: aniPreviewCache.size(),
        aniMaxSize: MAX_ANI_CACHE_SIZE,
        pendingRequests: pendingRequests.size(),
        pendingAniRequests: pendingAniRequests.size()
    };
}
