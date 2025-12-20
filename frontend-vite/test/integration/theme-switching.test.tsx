/**
 * Integration tests for theme switching
 * Tests theme mode changes and accent color application
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MessageProvider } from '@/context/MessageContext';

let currentTheme = 'dark';
let currentAccent = '#7c3aed';

const mockInvoke = vi.fn((cmd: string, args?: any) => {
  switch (cmd) {
    case 'get_status':
      return Promise.resolve({
        cursor_paths: {},
        theme_mode: currentTheme,
        accent_color: currentAccent,
        hidden: false,
        shortcut: 'Ctrl+Shift+X',
        shortcut_enabled: true,
        cursor_size: 32,
        minimize_to_tray: true,
        run_on_startup: false
      });
    case 'get_available_cursors':
      return Promise.resolve([
        { name: 'Normal', display_name: 'Normal Pointer', image_path: null }
      ]);
    case 'get_library_cursors':
      return Promise.resolve([
        { id: 'lib_1', name: 'Lib Cursor', display_name: 'Library Cursor', image_path: 'C:\\lib.cur' }
      ]);
    case 'get_library_cursor_preview':
    case 'get_system_cursor_preview':
      return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
    case 'set_theme_mode':
      currentTheme = args?.theme_mode;
      return Promise.resolve();
    case 'set_accent_color':
      currentAccent = args?.color;
      return Promise.resolve();
    default:
      return Promise.resolve(undefined);
  }
});

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
  listen: vi.fn(() => Promise.resolve(() => {})),
  once: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(() => Promise.resolve()),
};

beforeEach(() => {
  currentTheme = 'dark';
  currentAccent = '#7c3aed';
  mockInvoke.mockClear();
  
  (window as any).__TAURI__ = {
    invoke: mockInvoke,
    listen: vi.fn(() => Promise.resolve(() => {})),
    event: {
      listen: vi.fn(() => Promise.resolve(() => {})),
      emit: vi.fn(),
      once: vi.fn(() => Promise.resolve(() => {})),
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
});

afterEach(() => {
  cleanup();
});

function renderApp() {
  return render(
    <AppProvider>
      <ThemeProvider>
        <MessageProvider>
          <App />
        </MessageProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

describe('Theme Switching Integration', () => {
  describe('Theme Mode', () => {
    it('applies dark theme by default', async () => {
      renderApp();

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.body.classList.contains('dark')).toBe(true);
      });
    });

    it('applies light theme when configured', async () => {
      currentTheme = 'light';
      renderApp();

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.body.classList.contains('light')).toBe(true);
      });
    });

    it('removes old theme class when switching themes', async () => {
      currentTheme = 'dark';
      const { rerender } = renderApp();

      await waitFor(() => {
        expect(document.body.classList.contains('dark')).toBe(true);
      });

      // Simulate theme change
      currentTheme = 'light';
      cleanup();
      renderApp();

      await waitFor(() => {
        expect(document.body.classList.contains('light')).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(false);
      });
    });
  });

  describe('Accent Color', () => {
    it('applies default accent color', async () => {
      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#7c3aed');
      });
    });

    it('applies custom accent color', async () => {
      currentAccent = '#ff5500';
      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#ff5500');
      });
    });

    it('updates CSS variables when accent color changes', async () => {
      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#7c3aed');
      });

      // Simulate accent color change
      currentAccent = '#00ff00';
      cleanup();
      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#00ff00');
      });
    });
  });

  describe('Theme and Accent Combined', () => {
    it('applies both theme and accent color correctly', async () => {
      currentTheme = 'light';
      currentAccent = '#0066ff';
      renderApp();

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#0066ff');
      });
    });
  });
});
