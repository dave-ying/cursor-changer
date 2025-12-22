import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import { act } from 'react';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Events } from '@/tauri/events';

describe('Close confirmation flow (show-close-confirmation)', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockListen: ReturnType<typeof vi.fn>;
  let mockAppWindow: any;
  let showCloseHandler: (() => void) | null;

  beforeEach(() => {
    showCloseHandler = null;

    mockAppWindow = {
      hide: vi.fn(() => Promise.resolve()),
      minimize: vi.fn(() => Promise.resolve()),
      maximize: vi.fn(() => Promise.resolve()),
      unmaximize: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
      isMaximized: vi.fn(() => Promise.resolve(false)),
      isMinimized: vi.fn(() => Promise.resolve(false)),
      isVisible: vi.fn(() => Promise.resolve(true)),
      setTitle: vi.fn(() => Promise.resolve()),
      listen: vi.fn(() => Promise.resolve(() => {})),
      once: vi.fn(() => Promise.resolve(() => {})),
      emit: vi.fn(() => Promise.resolve())
    };

    mockInvoke = vi.fn((cmd: string) => {
      switch (cmd) {
        case 'get_status':
          return Promise.resolve({
            cursor_paths: {},
            theme_mode: 'dark',
            accent_color: '#7c3aed',
            hidden: false,
            shortcut: 'Ctrl+Shift+X',
            shortcut_enabled: true,
            cursor_size: 32,
            minimize_to_tray: true,
            run_on_startup: false,
            last_loaded_cursor_path: null,
            default_cursor_style: 'windows'
          });
        case 'get_available_cursors':
          return Promise.resolve([
            { name: 'Normal', display_name: 'Normal Pointer', image_path: null },
            { name: 'Hand', display_name: 'Link Select', image_path: null }
          ]);
        case 'get_library_cursors':
          return Promise.resolve([]);
        case 'start_library_folder_watcher':
        case 'stop_library_folder_watcher':
        case 'sync_library_with_folder':
        case 'reset_current_mode_cursors':
          return Promise.resolve(undefined);
        case 'get_library_cursor_preview':
        case 'get_system_cursor_preview':
        case 'read_cursor_file_as_data_url':
          return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
        case 'quit_app':
          return Promise.resolve(undefined);
        default:
          return Promise.resolve(undefined);
      }
    });

    mockListen = vi.fn((event: string, handler: any) => {
      if (event === Events.showCloseConfirmation) {
        showCloseHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    (window as any).__TAURI__ = {
      core: { invoke: mockInvoke },
      event: { listen: mockListen, emit: vi.fn(), once: vi.fn(() => Promise.resolve(() => {})) },
      listen: mockListen,
      window: { getCurrentWindow: () => mockAppWindow },
      appWindow: mockAppWindow
    };

    (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
  });

  afterEach(() => {
    cleanup();
  });

  function renderApp() {
    return render(
      <AppProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AppProvider>
    );
  }

  it('opens CloseDialog when backend emits show-close-confirmation', async () => {
    renderApp();

    await waitFor(() => {
      expect(showCloseHandler).toBeTruthy();
    });

    await act(async () => {
      showCloseHandler!();
    });

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to close this app?')).toBeInTheDocument();
    });
  });

  it('minimizes (hides window) and closes dialog when clicking Minimize', async () => {
    renderApp();

    await waitFor(() => {
      expect(showCloseHandler).toBeTruthy();
    });

    await act(async () => {
      showCloseHandler!();
    });

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to close this app?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));

    await waitFor(() => {
      expect(mockAppWindow.hide).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to close this app?')).not.toBeInTheDocument();
    });
  });

  it('invokes quit_app and closes dialog when clicking Close', async () => {
    renderApp();

    await waitFor(() => {
      expect(showCloseHandler).toBeTruthy();
    });

    await act(async () => {
      showCloseHandler!();
    });

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to close this app?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => {
      expect(mockInvoke.mock.calls.some((c) => c[0] === 'quit_app')).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to close this app?')).not.toBeInTheDocument();
    });
  });

  it('closes dialog when clicking Cancel', async () => {
    renderApp();

    await waitFor(() => {
      expect(showCloseHandler).toBeTruthy();
    });

    await act(async () => {
      showCloseHandler!();
    });

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to close this app?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Are you sure you want to close this app?')).not.toBeInTheDocument();
    });
  });
});
