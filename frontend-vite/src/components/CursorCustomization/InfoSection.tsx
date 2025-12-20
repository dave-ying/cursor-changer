import React from 'react';

/**
 * Placeholder Info section
 * Mirrors the non-modal Settings layout styling for future content.
 */
export function InfoSection() {
  return (
    <div
      id="section-info"
      className="flex flex-col flex-1 min-h-0 w-full bg-card rounded-lg border text-card-foreground shadow-sm"
    >
      <div className="px-6 pt-4 pb-3 border-b border-border/50">
        <h1 className="text-2xl font-bold">Info</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learn about cursor packs, version notes, and upcoming improvements.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 pb-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-muted-foreground">
              Placeholder for release notes, FAQs, or quick start tips.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-muted-foreground">
              Placeholder for attribution, links, or support information.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <p className="text-muted-foreground">
              Placeholder for roadmap teasers or community highlights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
