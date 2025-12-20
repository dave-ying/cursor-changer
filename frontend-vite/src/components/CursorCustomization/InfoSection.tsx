import React from 'react';

/**
 * Placeholder Info section
 * Mirrors the non-modal Settings layout styling for future content.
 */
export function InfoSection() {
  const openLink = async (url: string) => {
    // Web-safe default; Tauri will also handle this with the app browser
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="section-info"
      className="flex flex-col flex-1 min-h-0 w-full bg-card rounded-lg border text-card-foreground shadow-sm"
    >
      <div className="px-6 pt-4 pb-3 border-b border-border/50">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learn more about Cursor Changer and how to support this project.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 pb-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1 border border-primary/30">
                Version 1.0.0
              </span>
              <span className="text-xs text-muted-foreground">Current release</span>
            </div>
            <p className="text-muted-foreground">
              Refer to the{' '}
              <a
                className="text-primary underline underline-offset-2"
                href="https://github.com/dave-ying/cursor-changer/blob/main/README.md"
                target="_blank"
                rel="noreferrer"
              >
                README
              </a>{' '}
              on GitHub to view the changelog.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-card-foreground">Support this project</p>
              <p className="text-sm text-muted-foreground">
                If you find Cursor Changer helpful, you can support it or star the repo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 items-stretch">
              <div className="flex h-full flex-col items-center justify-center text-center gap-3 rounded-md border border-border/60 bg-card/60 px-4 py-9">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-card-foreground">Buy me a coffee</p>
                  <p className="text-sm text-muted-foreground">
                    If you enjoy Cursor Changer, you can{' '}
                    <a
                      href="https://buymeacoffee.com/daveying"
                      className="text-primary underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={async (e) => {
                        e.preventDefault();
                        await openLink('https://buymeacoffee.com/daveying');
                      }}
                    >
                      support this project
                    </a>
                    <br />
                    and buy me a coffee.
                  </p>
                </div>
                <a
                  href="https://buymeacoffee.com/daveying"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-block"
                  onClick={async (e) => {
                    e.preventDefault();
                    await openLink('https://buymeacoffee.com/daveying');
                  }}
                >
                  <img
                    src="/bmc-button.svg"
                    alt="Buy Me a Coffee"
                    className="h-14 w-auto"
                    loading="lazy"
                  />
                </a>
              </div>

              <div className="flex h-full flex-col items-center justify-center text-center gap-3 rounded-md border border-border/60 bg-card/60 px-4 py-9">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-card-foreground">Star on GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    Cursor Changer is free and open-source.
                    <br />
                    To show your support, you can star this project on{' '}
                    <a
                      href="https://github.com/dave-ying/cursor-changer"
                      className="text-primary underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={async (e) => {
                        e.preventDefault();
                        await openLink('https://github.com/dave-ying/cursor-changer');
                      }}
                    >
                      GitHub
                    </a>.
                  </p>
                </div>
                <a
                  href="https://github.com/dave-ying/cursor-changer"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex"
                  onClick={async (e) => {
                    e.preventDefault();
                    await openLink('https://github.com/dave-ying/cursor-changer');
                  }}
                >
                  <img
                    src="/GitHub_Lockup_Dark.png"
                    alt="GitHub repository"
                    className="h-12 w-auto dark:hidden"
                    loading="lazy"
                  />
                  <img
                    src="/GitHub_Lockup_Light.png"
                    alt="GitHub repository"
                    className="h-12 w-auto hidden dark:block"
                    loading="lazy"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
