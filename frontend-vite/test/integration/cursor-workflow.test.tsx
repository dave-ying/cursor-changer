/**
 * Integration tests for cursor workflow
 * Tests the full flow of selecting and applying cursors
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Mock invoke function with tracking
const mockInvoke = vi.fn((cmd: string, args?: any) => {
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
        default_cursor_style: 'windows'
      });
    case 'get_available_cursors':
      return Promise.resolve([
        { name: 'Normal', display_name: 'Normal Pointer', image_path: null },
        { name: 'IBeam', display_name: 'Text Select', image_path: null },
        { name: 'Hand', display_name: 'Link Select', image_path: null }
      ]);
    case 'get_library_cursors':
      return Promise.resolve([
        { id: 'lib_1', name: 'Custom Arrow', display_name: 'Custom Arrow', image_path: 'C:\\cursors\\arrow.cur' },
        { id: 'lib_2', name: 'Custom Hand', display_name: 'Custom Hand', image_path: 'C:\\cursors\\hand.cur' }
      ]);
    case 'get_library_cursor_preview':
    case 'get_system_cursor_preview':
      return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
    case 'apply_cursor':
      return Promise.resolve();
    case 'reset_cursor_to_default':
      return Promise.resolve();
    case 'reorder_library_cursors':
      return Promise.resolve();
    default:
      return Promise.resolve(undefined);
  }
});

// Mock appWindow
const mockAppWindow = {
  hide: () => Promise.resolve(),
  minimize: () => Promise.resolve(),
  maximize: () => Promise.resolve(),
  unmaximize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  isMaximized: () => Promise.resolve(false),
  isMinimized: () => Promise.resolve(false),
  isVisible: () => Promise.resolve(true),
  setTitle: () => Promise.resolve(),
  listen: vi.fn(() => Promise.resolve(() => { })),
  once: vi.fn(() => Promise.resolve(() => { })),
  emit: vi.fn(() => Promise.resolve()),
};

beforeEach(() => {
  mockInvoke.mockClear();

  const tauriMock = {
    invoke: mockInvoke,
    listen: vi.fn(() => Promise.resolve(() => { })),
    event: {
      listen: vi.fn(() => Promise.resolve(() => { })),
      emit: vi.fn(),
      once: vi.fn(() => Promise.resolve(() => { })),
    },
    window: {
      getCurrentWindow: () => mockAppWindow,
      getCurrent: () => mockAppWindow,
      appWindow: mockAppWindow,
    },
    appWindow: mockAppWindow,
    core: { invoke: mockInvoke },
    tauri: { invoke: mockInvoke, appWindow: mockAppWindow },
  };

  (window as any).__TAURI__ = tauriMock;
  (globalThis as any).__TAURI__ = tauriMock;
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

describe('Cursor Workflow Integration', () => {
  describe('Initial Load', () => {
    it('displays active cursors after loading', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
      });
    });

    it('displays library cursors after loading', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
      });
    });
  });

  describe('Cursor Selection Flow', () => {
    it('enters selection mode when clicking an active cursor', async () => {
      renderApp();

      await waitFor(() => {
        expect(document.querySelector('.cursor-card')).toBeTruthy();
      });

      const firstCard = document.querySelector('.cursor-card')!;
      fireEvent.click(firstCard);

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent?.classList.contains('cursor-selection-active')).toBe(true);
      });
    });

    it('exits selection mode when pressing Escape', async () => {
      renderApp();

      await waitFor(() => {
        expect(document.querySelector('.cursor-card')).toBeTruthy();
      });

      const firstCard = document.querySelector('.cursor-card')!;
      fireEvent.click(firstCard);

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent?.classList.contains('cursor-selection-active')).toBe(true);
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent?.classList.contains('cursor-selection-active')).toBe(false);
      });
    });

    it('exits selection mode when clicking outside', async () => {
      renderApp();

      await waitFor(() => {
        expect(document.querySelector('.cursor-card')).toBeTruthy();
      });

      const firstCard = document.querySelector('.cursor-card')!;
      fireEvent.click(firstCard);

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent?.classList.contains('cursor-selection-active')).toBe(true);
      });

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent?.classList.contains('cursor-selection-active')).toBe(false);
      });
    });
  });

  describe('Library Cursor Selection', () => {
    it('highlights library cursor when clicked', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
      });

      const libCard = screen.getByTestId('library-card-lib_1');
      fireEvent.click(libCard);

      await waitFor(() => {
        expect(libCard.classList.contains('selected-library-item')).toBe(true);
      });
    });

    it('clears library cursor selection when pressing Escape', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
      });

      const libCard = screen.getByTestId('library-card-lib_1');
      fireEvent.click(libCard);

      await waitFor(() => {
        expect(libCard.classList.contains('selected-library-item')).toBe(true);
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(libCard.classList.contains('selected-library-item')).toBe(false);
      });
    });
  });
});
