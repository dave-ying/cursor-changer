import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MessageProvider } from '@/context/MessageContext';
import { CursorCustomization } from '@/components/CursorCustomization';

// Note: We intentionally test the real CursorCustomization module (not a mock component).

describe('CursorCustomization (real) integration', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockListen: ReturnType<typeof vi.fn>;
  let mockAppWindow: any;

  beforeEach(() => {
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

    const status = {
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
    };

    const availableCursors = [
      { name: 'Normal', display_name: 'Normal Pointer', image_path: null },
      { name: 'Hand', display_name: 'Link Select', image_path: null }
    ];

    const library = [
      {
        id: 'lib_1',
        name: 'Lib Cursor',
        file_path: 'C:\\lib.cur',
        click_point_x: 0,
        click_point_y: 0,
        created_at: new Date().toISOString()
      }
    ];

    mockInvoke = vi.fn((cmd: string, args?: any) => {
      switch (cmd) {
        case 'get_status':
          return Promise.resolve({ ...status });
        case 'get_available_cursors':
          return Promise.resolve([...availableCursors]);
        case 'get_library_cursors':
          return Promise.resolve([...library]);
        case 'get_library_cursor_preview':
        case 'get_system_cursor_preview':
        case 'read_cursor_file_as_data_url':
          return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
        case 'set_single_cursor_with_size':
          return Promise.resolve({
            name: args?.cursor_name,
            display_name: args?.cursor_name,
            image_path: args?.image_path
          });
        case 'switch_customization_mode':
          return Promise.resolve(args?.mode);
        case 'start_library_folder_watcher':
        case 'stop_library_folder_watcher':
        case 'sync_library_with_folder':
        case 'reorder_library_cursors':
          return Promise.resolve(undefined);
        default:
          return Promise.resolve(undefined);
      }
    });

    mockListen = vi.fn(() => Promise.resolve(() => {}));

    const tauriMock = {
      invoke: mockInvoke,
      listen: mockListen,
      event: { listen: mockListen, emit: vi.fn(), once: vi.fn(() => Promise.resolve(() => {})) },
      window: {
        getCurrentWindow: () => mockAppWindow,
        getCurrent: () => mockAppWindow,
        appWindow: mockAppWindow
      },
      appWindow: mockAppWindow,
      core: { invoke: mockInvoke },
      tauri: { invoke: mockInvoke, appWindow: mockAppWindow }
    };

    (window as any).__TAURI__ = tauriMock;
    (globalThis as any).__TAURI__ = tauriMock;
    (window as any).__TAURI_INTERNALS__ = { invoke: mockInvoke };
  });

  afterEach(() => {
    cleanup();
  });

  function renderUI() {
    return render(
      <AppProvider>
        <ThemeProvider>
          <MessageProvider>
            <CursorCustomization />
          </MessageProvider>
        </ThemeProvider>
      </AppProvider>
    );
  }

  it('supports reverse selection: click library cursor then click active cursor to apply', async () => {
    renderUI();

    await waitFor(() => {
      expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    const libCard = screen.getByTestId('library-card-lib_1');
    fireEvent.click(libCard);

    await waitFor(() => {
      expect(libCard.classList.contains('selected-library-item')).toBe(true);
      const main = document.getElementById('main-content');
      expect(main?.classList.contains('selecting-library-cursor')).toBe(true);
    });

    fireEvent.click(screen.getByTestId('cursor-card-Normal'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'set_single_cursor_with_size',
        expect.objectContaining({
          cursor_name: 'Normal',
          image_path: 'C:\\lib.cur',
          size: 32
        })
      );
    });

    await waitFor(() => {
      const main = document.getElementById('main-content');
      expect(main?.classList.contains('selecting-library-cursor')).toBe(false);
    });
  });

  it('supports selection mode: click active cursor then click library cursor to apply', async () => {
    renderUI();

    await waitFor(() => {
      expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('cursor-card-Normal'));

    await waitFor(() => {
      const main = document.getElementById('main-content');
      expect(main?.classList.contains('selecting-from-library')).toBe(true);
    });

    fireEvent.click(screen.getByTestId('library-card-lib_1'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'set_single_cursor_with_size',
        expect.objectContaining({
          cursor_name: 'Normal',
          image_path: 'C:\\lib.cur',
          size: 32
        })
      );
    });

    await waitFor(() => {
      const main = document.getElementById('main-content');
      expect(main?.classList.contains('cursor-selection-active')).toBe(false);
    });
  });

  it('switches customization mode via ModeToggle and invokes backend command', async () => {
    renderUI();

    await waitFor(() => {
      expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    const callsBefore = mockInvoke.mock.calls.filter((c) => c[0] === 'switch_customization_mode').length;

    fireEvent.click(screen.getByText('Advanced'));

    await waitFor(() => {
      const callsAfter = mockInvoke.mock.calls.filter((c) => c[0] === 'switch_customization_mode').length;
      expect(callsAfter).toBeGreaterThan(callsBefore);

      expect(mockInvoke).toHaveBeenCalledWith('switch_customization_mode', { mode: 'advanced' });
    });
  });
});
