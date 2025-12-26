import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LibraryCursor } from '@/types/generated/LibraryCursor';
import { Loader2, Package } from 'lucide-react';

interface PackDetailsModalProps {
  isOpen: boolean;
  pack: LibraryCursor | null;
  loading?: boolean;
  isApplying?: boolean;
  onApply: (pack: LibraryCursor) => void;
  onClose: () => void;
}

export function PackDetailsModal({
  isOpen,
  pack,
  loading = false,
  isApplying = false,
  onApply,
  onClose
}: PackDetailsModalProps) {
  const packItems = pack?.pack_metadata?.items ?? [];
  const modeLabel = pack?.pack_metadata?.mode === 'simple' ? 'Simple Mode' : 'Advanced Mode';

  const uniqueGroups = useMemo(() => {
    return packItems.reduce<Record<string, string[]>>((acc, item) => {
      const key = item.cursor_name || 'custom';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.display_name || item.cursor_name || item.file_name);
      return acc;
    }, {});
  }, [packItems]);

  if (!isOpen || !pack) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-details-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border/50 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cursor Pack</p>
            <h2 id="pack-details-title" className="text-2xl font-semibold tracking-tight">
              {pack.name || 'Cursor Pack'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {modeLabel ? `Optimized for ${modeLabel}` : 'Contains multiple cursor files'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Close pack details"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pack ID</p>
              <p className="text-base font-medium">{pack.id}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="mb-2 text-sm font-semibold text-muted-foreground">
            Included Cursors {packItems.length ? `(${packItems.length})` : ''}
          </p>

          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border/60">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading pack manifest…</p>
              </div>
            </div>
          ) : packItems.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-border/60">
              <p className="max-w-sm text-center text-sm text-muted-foreground">
                No manifest information detected. This pack may be missing metadata. You can still apply it to load cursors.
              </p>
            </div>
          ) : (
            <div className="grid max-h-72 grid-cols-1 gap-3 overflow-y-auto rounded-xl border border-border/50 bg-muted/30 p-4 sm:grid-cols-2">
              {Object.entries(uniqueGroups).map(([cursorName, labels]) => (
                <div key={cursorName} className="rounded-lg bg-background/70 p-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {cursorName === 'custom' ? 'Custom Cursor' : cursorName}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {labels.map((label, index) => (
                      <li key={`${cursorName}-${index}`} className="text-sm text-card-foreground">
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Applying this pack replaces the current {pack?.pack_metadata?.mode === 'simple' ? 'Simple mode' : 'Advanced mode'} cursors with these files.
          </p>
          <Button
            onClick={() => pack && onApply(pack)}
            disabled={isApplying || loading || !pack}
            className={cn('min-w-[180px]', isApplying && 'cursor-wait')}
          >
            {isApplying ? 'Applying…' : 'Apply Cursor Pack'}
          </Button>
        </div>
      </div>
    </div>
  );
}
