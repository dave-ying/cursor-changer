import * as React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { AppProvider, useApp } from '@/context/AppContext';

type MockTauriValue = {
  invoke: ReturnType<typeof vi.fn>;
  listen: ReturnType<typeof vi.fn>;
  getAppWindow: ReturnType<typeof vi.fn>;
  isReady: boolean;
  error: Error | null;
};

const tauriValueRef = vi.hoisted(() => ({ current: null as MockTauriValue | null }));

vi.mock('@/context/TauriContext', () => ({
  TauriProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTauriContext: () => {
    if (!tauriValueRef.current) {
      throw new Error('Mock Tauri context value missing');
    }
    return tauriValueRef.current;
  }
}));

vi.mock('@/context/AppBootstrapProvider', () => ({
  AppBootstrapProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/context/CursorEventsProvider', () => ({
  CursorEventsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/context/LibraryWatcherProvider', () => ({
  LibraryWatcherProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>{children}</AppProvider>
);

let baseMockValue: MockTauriValue;

beforeEach(() => {
  baseMockValue = {
    invoke: vi.fn().mockResolvedValue('ok'),
    listen: vi.fn().mockResolvedValue(() => {}),
    getAppWindow: vi.fn(() => ({ label: 'mock-window' })),
    isReady: true,
    error: null
  };
  tauriValueRef.current = baseMockValue;
});

describe('AppProvider bridge', () => {
  it('exposes tauri bridge functions/flags through useApp', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.invoke).toBe(baseMockValue.invoke);
    expect(result.current.listen).toBe(baseMockValue.listen);
    expect(result.current.getAppWindow).toBe(baseMockValue.getAppWindow);
    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reacts when the underlying tauri context value changes', () => {
    const { result, rerender } = renderHook(() => useApp(), { wrapper });
    expect(result.current.isReady).toBe(true);

    const newValue: MockTauriValue = {
      invoke: vi.fn().mockResolvedValue('next'),
      listen: vi.fn().mockResolvedValue(() => {}),
      getAppWindow: vi.fn(() => ({ label: 'secondary' })),
      isReady: false,
      error: new Error('tauri broke')
    };

    tauriValueRef.current = newValue;
    rerender();

    expect(result.current.invoke).toBe(newValue.invoke);
    expect(result.current.listen).toBe(newValue.listen);
    expect(result.current.getAppWindow).toBe(newValue.getAppWindow);
    expect(result.current.isReady).toBe(false);
    expect(result.current.error).toBe(newValue.error);
  });

  it('throws a descriptive error when useApp is called outside the provider', () => {
    expect(() => renderHook(() => useApp())).toThrowError('useApp must be used within AppProvider');
  });
});
