import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { LibraryWatcherProvider } from '@/context/LibraryWatcherProvider';
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

describe('LibraryWatcherProvider', () => {
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

    const prevOps = useAppStore.getState().operations as any;
    useAppStore.setState({
      isReady: true,
      operations: {
        ...prevOps,
        loadLibraryCursors: vi.fn().mockResolvedValue(undefined)
      }
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('starts watcher and syncs library on mount', async () => {
    render(
      <LibraryWatcherProvider>
        <div>child</div>
      </LibraryWatcherProvider>
    );

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('start_library_folder_watcher');
      expect(mockInvoke).toHaveBeenCalledWith('sync_library_with_folder');
      expect(mockListen).toHaveBeenCalledWith(Events.libraryFileAdded, expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith(Events.libraryFileRemoved, expect.any(Function));
    });
  });

  it('syncs and reloads library cursors when library:file-added event fires', async () => {
    render(
      <LibraryWatcherProvider>
        <div>child</div>
      </LibraryWatcherProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.libraryFileAdded]).toBeDefined();
    });

    const loadLibraryCursors = useAppStore.getState().operations.loadLibraryCursors as unknown as ReturnType<typeof vi.fn>;

    await handlers[Events.libraryFileAdded]!({ payload: undefined });

    expect(mockInvoke).toHaveBeenCalledWith('sync_library_with_folder');
    expect(loadLibraryCursors).toHaveBeenCalled();
  });

  it('syncs and reloads library cursors when library:file-removed event fires', async () => {
    render(
      <LibraryWatcherProvider>
        <div>child</div>
      </LibraryWatcherProvider>
    );

    await waitFor(() => {
      expect(handlers[Events.libraryFileRemoved]).toBeDefined();
    });

    const loadLibraryCursors = useAppStore.getState().operations.loadLibraryCursors as unknown as ReturnType<typeof vi.fn>;

    await handlers[Events.libraryFileRemoved]!({ payload: undefined });

    expect(mockInvoke).toHaveBeenCalledWith('sync_library_with_folder');
    expect(loadLibraryCursors).toHaveBeenCalled();
  });

  it('calls unlisten functions and stops watcher on unmount', async () => {
    const { unmount } = render(
      <LibraryWatcherProvider>
        <div>child</div>
      </LibraryWatcherProvider>
    );

    await waitFor(() => {
      expect(Object.keys(unlisteners).length).toBe(2);
    });

    unmount();

    // unlisten called for all listeners
    for (const unlisten of Object.values(unlisteners)) {
      expect(unlisten).toHaveBeenCalledTimes(1);
    }

    // stop watcher is called (not awaited in provider cleanup)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('stop_library_folder_watcher');
    });
  });

  it('does not crash if setup fails (logs error)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke = vi.fn((cmd: string) => {
      if (cmd === 'start_library_folder_watcher') return Promise.reject(new Error('fail'));
      return Promise.resolve(undefined);
    });

    render(
      <LibraryWatcherProvider>
        <div>child</div>
      </LibraryWatcherProvider>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
