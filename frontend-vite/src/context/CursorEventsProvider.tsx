import React, { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { mapCursorStatePayload } from '../tauri/mappers';
import type { CursorStatePayload } from '../types/generated/CursorStatePayload';
import type { ThemeMode } from '../types/generated/ThemeMode';
import { Commands, invokeCommand } from '../tauri/commands';
import { Events, listenEvent } from '../tauri/events';
import { useTauriContext } from './TauriContext';
import { logger } from '../utils/logger';

export function CursorEventsProvider({ children }: { children: ReactNode }) {
  const isReady = useAppStore((s) => s.isReady);
  const updateCursorState = useAppStore((s) => s.updateCursorState);
  const showMessage = useAppStore((s) => s.showMessage);
  const { listen, invoke } = useTauriContext();

  useEffect(() => {
    if (!isReady) return;

    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      try {
        const unlistenCursorState = await listenEvent<Partial<CursorStatePayload>>(
          listen,
          Events.cursorState,
          (payload) => {
            updateCursorState(mapCursorStatePayload(payload));
          }
        );
        unlisteners.push(unlistenCursorState);
      } catch (error) {
        logger.error('Failed to listen to cursor-state:', error);
      }

      try {
        const unlistenError = await listenEvent<string>(listen, Events.cursorError, (payload) => {
          showMessage(payload || 'An error occurred', 'error');
        });
        unlisteners.push(unlistenError);
      } catch (error) {
        logger.error('Failed to listen to cursor-error:', error);
      }

      try {
        const unlistenTheme = await listenEvent<ThemeMode>(listen, Events.themeChanged, (payload) => {
          updateCursorState({ themeMode: payload });
        });
        unlisteners.push(unlistenTheme);
      } catch (error) {
        logger.error('Failed to listen to theme-changed:', error);
      }

      try {
        const unlistenReset = await listenEvent<void>(
          listen,
          Events.resetCursorsAfterSettings,
          async () => {
            try {
              await invokeCommand(invoke, Commands.resetCurrentModeCursors);
            } catch (error) {
              logger.error('[CursorEventsProvider] Failed to reset cursors after settings reset:', error);
              showMessage('Failed to reset cursors: ' + String(error), 'error');
            }
          }
        );
        unlisteners.push(unlistenReset);
      } catch (error) {
        logger.error('Failed to listen to reset-cursors-after-settings:', error);
      }
    };

    setup();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [isReady, listen, invoke, showMessage, updateCursorState]);

  return <>{children}</>;
}

export type { CursorStatePayload };
