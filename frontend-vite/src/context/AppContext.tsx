import React, { createContext, useContext, ReactNode } from 'react';
import { TauriProvider, useTauriContext } from './TauriContext';

import { AppBootstrapProvider } from './AppBootstrapProvider';
import { CursorEventsProvider } from './CursorEventsProvider';
import { LibraryWatcherProvider } from './LibraryWatcherProvider';
import { MessageProvider } from './MessageContext';

interface AppContextValue {
  invoke: <T = any>(cmd: string, args?: Record<string, any>) => Promise<T>;
  listen: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
  getAppWindow: () => any;
  isReady: boolean;
  error: Error | null;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <TauriProvider>
      <MessageProvider>
        <AppBootstrapProvider>
          <CursorEventsProvider>
            <LibraryWatcherProvider>
              <AppContextBridge>{children}</AppContextBridge>
            </LibraryWatcherProvider>
          </CursorEventsProvider>
        </AppBootstrapProvider>
      </MessageProvider>
    </TauriProvider>
  );
}

function AppContextBridge({ children }: { children: ReactNode }) {
  const { invoke, listen, getAppWindow, isReady, error } = useTauriContext();

  const value: AppContextValue = {
    invoke,
    listen,
    getAppWindow,
    isReady,
    error
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}