import React, { useEffect, useState } from 'react';

/**
 * Placeholder Info section
 * Mirrors the non-modal Settings layout styling for future content.
 */
export function InfoSection() {
  const [version, setVersion] = useState<string>('1.0.0');
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'up-to-date' | 'installing' | 'error' | 'unsupported'
  >('idle');
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const showInstall = updateStatus === 'available' || updateStatus === 'installing';

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const updaterEnabled = isTauri && import.meta.env['VITE_ENABLE_TAURI_UPDATER'] === '1';

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

  const handleCheckUpdate = async () => {
    if (!isTauri) {
      setUpdateStatus('unsupported');
      setUpdateMessage('Updater works in the packaged app.');
      return;
    }

    setUpdateStatus('checking');
    setUpdateMessage(null);

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update?.available) {
        setUpdateStatus('available');
        setUpdateMessage(`Update available: ${update.version ?? ''}`.trim());
      } else {
        setUpdateStatus('up-to-date');
        setUpdateMessage('You are on the latest version.');
      }
    } catch (error: any) {
      console.error('Update check failed', error);
      setUpdateStatus('error');
      setUpdateMessage(error?.message ?? 'Update check failed.');
    }
  };

  const handleInstallUpdate = async () => {
    if (!isTauri) return;
    setUpdateStatus('installing');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update?.available) {
        await update.downloadAndInstall();
        // Tauri will restart the app after install completes.
      } else {
        setUpdateStatus('up-to-date');
        setUpdateMessage('You are on the latest version.');
      }
    } catch (error: any) {
      console.error('Update install failed', error);
      setUpdateStatus('error');
      setUpdateMessage(error?.message ?? 'Update install failed.');
    }
  };

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1 border border-primary/30">
                  Version {version}
                </span>
                <span className="text-xs text-muted-foreground">Current release</span>
              </div>
              {updaterEnabled ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    disabled={updateStatus === 'checking' || updateStatus === 'installing'}
                  >
                    {updateStatus === 'checking' ? 'Checking…' : 'Check for updates'}
                  </button>
                  {showInstall && (
                    <button
                      type="button"
                      onClick={handleInstallUpdate}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary/10 disabled:opacity-60"
                      disabled={updateStatus === 'installing'}
                    >
                      {updateStatus === 'installing' ? 'Installing…' : 'Install update'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Updates are managed by the store build; manual checks are not needed here.
                </p>
              )}
            </div>
            {updaterEnabled && updateStatus !== 'idle' && (
              <p className="text-xs text-muted-foreground">
                {updateMessage ??
                  (updateStatus === 'installing'
                    ? 'Downloading and applying the update…'
                    : updateStatus === 'up-to-date'
                      ? 'You are on the latest version.'
                      : updateStatus === 'unsupported'
                        ? 'Updater is only available in the packaged app.'
                        : null)}
              </p>
            )}
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
