import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useTauri } from '../hooks/useTauri';
import { useAppStore } from '../store/useAppStore';

export interface TauriContextValue {
  invoke: <T = any>(command: string, args?: Record<string, any>) => Promise<T>;
  listen: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
  getAppWindow: () => any;
  isReady: boolean;
  error: Error | null;
}

const TauriContext = createContext<TauriContextValue | null>(null);

export function TauriProvider({ children }: { children: ReactNode }) {
  const { invoke, listen, getAppWindow, isReady, error } = useTauri();
  const { setTauriFunctions, setTauriReady } = useAppStore();

  useEffect(() => {
    if (!isReady) return;
    setTauriFunctions({ invoke, listen, getAppWindow });
  }, [isReady, invoke, listen, getAppWindow, setTauriFunctions]);

  useEffect(() => {
    setTauriReady(isReady);
  }, [isReady, setTauriReady]);

  return (
    <TauriContext.Provider value={{ invoke, listen, getAppWindow, isReady, error }}>
      {children}
    </TauriContext.Provider>
  );
}

export function useTauriContext() {
  const context = useContext(TauriContext);
  if (!context) {
    throw new Error('useTauriContext must be used within TauriProvider');
  }
  return context;
}
