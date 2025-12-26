import React, { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { CursorInfo } from '@/types/generated/CursorInfo';
import { useApp } from '@/context/AppContext';
import { useAniPreview, AniPreview } from './AniPreview';
import {
  getCachedPreview,
  setCachedPreview,
  getPendingRequest,
  setPendingRequest
} from '@/services/cursorPreviewCache';
import { invokeWithFeedback } from '@/store/operations/invokeWithFeedback';
import { Commands } from '@/tauri/commands';
import { logger } from '@/utils/logger';

interface ActiveCursorPreviewCardProps {
  cursor: CursorInfo;
}

export function ActiveCursorPreviewCard({ cursor }: ActiveCursorPreviewCardProps) {
  const { invoke } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const isAniFile = useMemo(
    () => Boolean(cursor.image_path?.toLowerCase().endsWith('.ani')),
    [cursor.image_path]
  );

  const { data: aniData, loading: aniLoading } = useAniPreview(
    invoke,
    isAniFile ? cursor.image_path ?? null : null
  );

  useEffect(() => {
    let mounted = true;

    if (isAniFile) {
      setLoading(aniLoading);
      return () => {
        mounted = false;
      };
    }

    const filePath = cursor.image_path;
    const cacheKey = filePath || `system:${cursor.name}`;

    const cachedPreview = getCachedPreview(cacheKey);
    if (cachedPreview) {
      setPreviewUrl(cachedPreview);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const pendingPromise = getPendingRequest(cacheKey);
    if (pendingPromise) {
      setLoading(true);
      pendingPromise
        .then(() => {
          if (!mounted) return;
          const url = getCachedPreview(cacheKey);
          setPreviewUrl(url);
          setLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          setPreviewUrl(null);
          setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setPreviewUrl(null);

    const loadPromise = (async () => {
      const command = filePath ? Commands.getLibraryCursorPreview : Commands.getSystemCursorPreview;
      const args = filePath
        ? { file_path: filePath }
        : ({ cursor_name: cursor.name, cursorName: cursor.name } as any);

      const result = await invokeWithFeedback(invoke, command, {
        args,
        logLabel: `[ActiveCursorPreviewCard] Failed to load preview for ${cursor.name}:`
      });

      if (result.status === 'success') {
        return result.value as string;
      }
      throw new Error('Preview load failed');
    })();

    const wrappedPromise = loadPromise
      .then((dataUrl) => {
        setCachedPreview(cacheKey, dataUrl);
        if (mounted) {
          setPreviewUrl(dataUrl);
          setLoading(false);
        }
        return dataUrl;
      })
      .catch((err) => {
        logger.warn(`[ActiveCursorPreviewCard] Failed to load preview for ${cursor.name}:`, err);
        if (mounted) {
          setPreviewUrl(null);
          setLoading(false);
        }
        throw err;
      });

    setPendingRequest(cacheKey, wrappedPromise);

    return () => {
      mounted = false;
    };
  }, [cursor.image_path, cursor.name, invoke, isAniFile, aniLoading]);

  const displayName = cursor.display_name ?? cursor.name;

  return (
    <div className="flex flex-col items-center p-3 border rounded-lg bg-card">
      <div className="w-12 h-12 mb-2 flex items-center justify-center bg-muted rounded">
        {isAniFile && aniData ? (
          <AniPreview
            data={aniData}
            alt={displayName}
            className="w-10 h-10 object-contain"
          />
        ) : loading ? (
          <LoaderCircle className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={displayName}
            className="w-10 h-10 object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">System</span>
        )}
      </div>
      <div className="text-center w-full">
        <p className="text-sm font-semibold truncate">{displayName}</p>
      </div>
    </div>
  );
}
