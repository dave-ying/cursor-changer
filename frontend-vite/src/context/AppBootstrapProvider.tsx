import React, { useEffect, type ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';

export function AppBootstrapProvider({ children }: { children: ReactNode }) {
  const { isReady, operations } = useAppStore();

  useEffect(() => {
    if (!isReady) return;
    operations.loadStatus();
    operations.loadAvailableCursors();
    operations.loadLibraryCursors();
  }, [isReady, operations]);

  return <>{children}</>;
}
