import React, { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Commands, invokeCommand } from '../tauri/commands';
import { Events, listenEvent } from '../tauri/events';
import { useTauriContext } from './TauriContext';
import { logger } from '../utils/logger';

export function LibraryWatcherProvider({ children }: { children: ReactNode }) {
  const isReady = useAppStore((s) => s.isReady);
  const loadLibraryCursors = useAppStore((s) => s.operations.loadLibraryCursors);
  const { invoke, listen } = useTauriContext();

  useEffect(() => {
    if (!isReady) return;

    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      try {
        await invokeCommand(invoke, Commands.startLibraryFolderWatcher);
        await invokeCommand(invoke, Commands.syncLibraryWithFolder);

        const unlistenAdd = await listenEvent<unknown>(listen, Events.libraryFileAdded, async () => {
          try {
            await invokeCommand(invoke, Commands.syncLibraryWithFolder);
            await loadLibraryCursors();
          } catch (error) {
            logger.error('[LibraryWatcherProvider] Failed to sync after file add:', error);
          }
        });
        unlisteners.push(unlistenAdd);

        const unlistenRemove = await listenEvent<unknown>(listen, Events.libraryFileRemoved, async () => {
          try {
            await invokeCommand(invoke, Commands.syncLibraryWithFolder);
            await loadLibraryCursors();
          } catch (error) {
            logger.error('[LibraryWatcherProvider] Failed to sync after file remove:', error);
          }
        });
        unlisteners.push(unlistenRemove);
      } catch (error) {
        logger.error('[LibraryWatcherProvider] Failed to setup library folder watcher:', error);
      }
    };

    setup();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
      invokeCommand(invoke, Commands.stopLibraryFolderWatcher).catch(() => {});
    };
  }, [isReady, invoke, listen, loadLibraryCursors]);

  return <>{children}</>;
}
