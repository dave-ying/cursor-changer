import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { TauriProvider, useTauriContext } from '@/context/TauriContext';
import { useAppStore } from '@/store/useAppStore';

let mockUseTauriReturn: any;

vi.mock('@/hooks/useTauri', () => ({
  useTauri: () => mockUseTauriReturn
}));

function Consumer() {
  const { isReady, error } = useTauriContext();
  return (
    <div>
      <div data-testid="ready">{String(isReady)}</div>
      <div data-testid="error">{error ? error.message : ''}</div>
    </div>
  );
}

describe('TauriContext / TauriProvider', () => {
  beforeEach(() => {
    mockUseTauriReturn = {
      invoke: vi.fn(),
      listen: vi.fn(async () => () => {}),
      getAppWindow: vi.fn(() => ({ hide: vi.fn() })),
      isReady: true,
      error: null
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('throws when useTauriContext is used outside provider', () => {
    // React will log an error for hook throw; suppress it.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow('useTauriContext must be used within TauriProvider');

    consoleSpy.mockRestore();
  });

  it('provides context value and updates store tauri functions when ready', async () => {
    const setTauriFunctions = vi.fn();
    const setTauriReady = vi.fn();

    useAppStore.setState({ setTauriFunctions, setTauriReady } as any);

    render(
      <TauriProvider>
        <Consumer />
      </TauriProvider>
    );

    expect(screen.getByTestId('ready')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('');

    await waitFor(() => {
      expect(setTauriFunctions).toHaveBeenCalledWith({
        invoke: mockUseTauriReturn.invoke,
        listen: mockUseTauriReturn.listen,
        getAppWindow: mockUseTauriReturn.getAppWindow
      });
      expect(setTauriReady).toHaveBeenCalledWith(true);
    });
  });
});
