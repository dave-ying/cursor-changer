import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AniPreviewData } from '../../types/generated/AniPreviewData';
import { Commands, invokeCommand } from '../../tauri/commands';

// Re-export the type for convenience
export type { AniPreviewData };

interface AniPreviewProps {
  /** ANI preview data with frames and timing */
  data: AniPreviewData;
  /** Alt text for accessibility */
  alt?: string;
  /** CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Whether animation is paused */
  paused?: boolean;
}

/**
 * Efficient animated cursor preview component.
 * Uses requestAnimationFrame for smooth frame cycling.
 * More efficient than GIF: full RGBA, no 256 color limit.
 */
export function AniPreview({
  data,
  alt = 'Animated cursor',
  className = '',
  style,
  paused = false
}: AniPreviewProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameTimeRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const animate = useCallback((timestamp: number) => {
    if (paused || !data.frames.length) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastTimeRef.current;
    frameTimeRef.current += elapsed;
    lastTimeRef.current = timestamp;

    // Check if we should advance to next frame
    const currentDelay = data.delays[currentFrame] || 100;
    if (frameTimeRef.current >= currentDelay) {
      frameTimeRef.current = 0;
      setCurrentFrame(prev => (prev + 1) % data.frames.length);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [data.frames.length, data.delays, currentFrame, paused]);

  useEffect(() => {
    if (data.frames.length > 1) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, data.frames.length]);

  // Reset when data changes
  useEffect(() => {
    setCurrentFrame(0);
    frameTimeRef.current = 0;
    lastTimeRef.current = 0;
  }, [data]);

  if (!data.frames.length) {
    return null;
  }

  return (
    <img
      src={data.frames[currentFrame]}
      alt={alt}
      className={className}
      style={style}
    />
  );
}

import {
  getCachedAniPreview,
  setCachedAniPreview,
  hasPendingAniRequest,
  getPendingAniRequest,
  setPendingAniRequest
} from '../../services/cursorPreviewCache';

/**
 * Hook to fetch ANI preview data from backend with caching and request deduplication
 */
export function useAniPreview(
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>,
  filePath: string | null
) {
  const [data, setData] = useState<AniPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath || !filePath.toLowerCase().endsWith('.ani')) {
      setData(null);
      return;
    }

    // Check cache first for instant preview
    const cachedData = getCachedAniPreview(filePath);
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if there's already a pending request for this ANI file
    const pendingPromise = getPendingAniRequest(filePath);
    if (pendingPromise) {
      let mounted = true;
      setLoading(true);
      pendingPromise
        .then((aniData) => {
          if (mounted) {
            setData(aniData);
            setLoading(false);
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted) {
            // Try to get from cache in case another request succeeded
            const cached = getCachedAniPreview(filePath);
            if (cached) {
              setData(cached);
              setLoading(false);
              setError(null);
            } else {
              setError(String(err));
              setLoading(false);
            }
          }
        });
      return () => { mounted = false; };
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // Create and register the load promise
    const invokeAdapter = (cmd: string, args?: Record<string, unknown>) => invoke(cmd, args ?? {});
    const loadPromise = invokeCommand(invokeAdapter, Commands.getAniPreviewData, { file_path: filePath })
      .then((result) => {
        const aniData = result as AniPreviewData;
        // Cache the result for instant future access
        setCachedAniPreview(filePath, aniData);
        if (mounted) {
          setData(aniData);
          setLoading(false);
        }
        return aniData;
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err));
          setLoading(false);
        }
        throw err;
      });

    setPendingAniRequest(filePath, loadPromise);

    // Prevent unhandled rejection warnings if the initial request fails and no one awaits the pending promise.
    loadPromise.catch(() => {});

    return () => {
      mounted = false;
    };
  }, [invoke, filePath]);

  return { data, loading, error };
}
