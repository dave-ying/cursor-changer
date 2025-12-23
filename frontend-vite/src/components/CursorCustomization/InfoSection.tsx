import React, { useEffect, useState } from 'react';

/**
 * Placeholder Info section
 * Mirrors the non-modal Settings layout styling for future content.
 */
export function InfoSection() {
  const [version, setVersion] = useState<string>('1.0.0');
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  useEffect(() => {
    if (!isTauri) return;
    (async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app');
        const v = await getVersion();
        setVersion(v);
      } catch (error) {
        console.error('Failed to load app version', error);
      }
    })();
  }, [isTauri]);

  const openLink = async (url: string) => {
    // Web-safe default; Tauri will also handle this with the app browser
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="section-info"
      className="flex flex-col flex-1 min-h-0 w-full bg-card rounded-lg border text-card-foreground shadow-sm"
    >
      <div className="px-6 pt-4 pb-3 border-b border-border/50 bg-muted/60 rounded-t-lg">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learn more about Cursor Changer and how to support this project.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 pb-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-card-foreground">Support this project</p>
              <p className="text-sm text-muted-foreground">
                If you find Cursor Changer helpful, you can support it or star the repo.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 items-stretch">
              <div className="flex h-full flex-col items-center justify-between text-center gap-3 rounded-md border border-border/60 bg-card/60 px-4 py-9">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-card-foreground">Buy me a coffee</p>
                  <p className="text-sm text-muted-foreground">
                    If you enjoy Cursor Changer,
                    <br />
                    you can{' '}
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
                  className="mt-2 inline-flex items-center justify-center transition hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={async (e) => {
                    e.preventDefault();
                    await openLink('https://buymeacoffee.com/daveying');
                  }}
                >
                  <img
                    src="/bmc-button.svg"
                    alt="Buy Me a Coffee"
                    className="block h-20 w-auto transition hover:drop-shadow-md"
                    loading="lazy"
                  />
                </a>
              </div>

              <div className="flex h-full flex-col items-center justify-between text-center gap-3 rounded-md border border-border/60 bg-card/60 px-4 py-9">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-card-foreground">Star on GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    Cursor Changer is free and open-source.
                    <br />
                    To show your support,
                    <br />
                    you can star this project on{' '}
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
                  className="mt-2 inline-flex items-center justify-center rounded-full border border-border/70 bg-background/80 px-6 py-4 shadow-sm transition hover:-translate-y-[1px] hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

          <div className="text-center text-sm text-muted-foreground">
            Version {version}
          </div>
        </div>
      </div>
    </div>
  );
}
