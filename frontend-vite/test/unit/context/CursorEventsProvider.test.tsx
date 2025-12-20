import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { CursorEventsProvider } from '@/context/CursorEventsProvider';
import { useAppStore } from '@/store/useAppStore';
import { Events } from '@/tauri/events';

let mockListen: any;
let mockInvoke: any;

vi.mock('@/context/TauriContext', () => ({
  useTauriContext: () => ({
    listen: mockListen,
    invoke: mockInvoke
  })
}));

describe('CursorEventsProvider', () => {
  let handlers: Record<string, (e: { payload: any }) => any>;
  let unlisteners: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    handlers = {};
    unlisteners = {};

    mockInvoke = vi.fn().mockResolvedValue(undefined);

    mockListen = vi.fn(async (event: string, handler: (e: { payload: any }) => void) => {
      handlers[event] = handler;
      const unlisten = vi.fn();
      unlisteners[event] = unlisten;
      return unlisten;
    });

    // Ensure store is ready and install spies.
    useAppStore.setState({
      isReady: true,
      updateCursorState: vi.fn(),
      showMessage: vi.fn()
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('registers listeners for cursor-state, cursor-error, theme-changed, and reset-cursors-after-settings', async () => {
    render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith(Events.cursorState, expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith(Events.cursorError, expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith(Events.themeChanged, expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith(Events.resetCursorsAfterSettings, expect.any(Function));
    });
  });

  it('updates store state on cursor-state and theme-changed events', async () => {
    render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.cursorState]).toBeDefined();
      expect(handlers[Events.themeChanged]).toBeDefined();
    });

    const updateCursorState = useAppStore.getState().updateCursorState as unknown as ReturnType<typeof vi.fn>;

    handlers[Events.cursorState]!({ payload: { hidden: true } });
    expect(updateCursorState).toHaveBeenCalledWith({ hidden: true });

    handlers[Events.themeChanged]!({ payload: 'light' });
    expect(updateCursorState).toHaveBeenCalledWith({ themeMode: 'light' });
  });

  it('shows an error message on cursor-error events', async () => {
    render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.cursorError]).toBeDefined();
    });

    const showMessage = useAppStore.getState().showMessage as unknown as ReturnType<typeof vi.fn>;

    handlers[Events.cursorError]!({ payload: 'boom' });
    expect(showMessage).toHaveBeenCalledWith('boom', 'error');

    handlers[Events.cursorError]!({ payload: '' });
    expect(showMessage).toHaveBeenCalledWith('An error occurred', 'error');
  });

  it('invokes reset_current_mode_cursors on reset-cursors-after-settings event', async () => {
    render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.resetCursorsAfterSettings]).toBeDefined();
    });

    await handlers[Events.resetCursorsAfterSettings]!({ payload: undefined });

    expect(mockInvoke).toHaveBeenCalledWith('reset_current_mode_cursors');
  });

  it('calls unlisten functions on unmount', async () => {
    const { unmount } = render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(Object.keys(unlisteners).length).toBeGreaterThanOrEqual(3);
    });

    unmount();

    // Unlisteners should be called synchronously during cleanup once setup finished.
    for (const unlisten of Object.values(unlisteners)) {
      expect(unlisten).toHaveBeenCalledTimes(1);
    }
  });

  it('surfaces reset failure via showMessage (and does not crash)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke = vi.fn((cmd: string) => {
      if (cmd === 'reset_current_mode_cursors') {
        return Promise.reject(new Error('Reset failed'));
      }
      return Promise.resolve(undefined);
    });

    render(
      <CursorEventsProvider>
        <div>child</div>
      </CursorEventsProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.resetCursorsAfterSettings]).toBeDefined();
    });

    const showMessage = useAppStore.getState().showMessage as unknown as ReturnType<typeof vi.fn>;

    await handlers[Events.resetCursorsAfterSettings]!({ payload: undefined });

    expect(showMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to reset cursors:'),
      'error'
    );

    consoleErrorSpy.mockRestore();
  });
});
