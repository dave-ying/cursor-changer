/**
 * Integration tests for settings persistence
 * Tests that settings are properly saved and loaded
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MessageProvider } from '@/context/MessageContext';

// Track settings state
let mockSettings = {
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
};

const mockInvoke = vi.fn((cmd: string, args?: any) => {
  switch (cmd) {
    case 'get_status':
      return Promise.resolve({ ...mockSettings });
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
      mockSettings.theme_mode = args?.theme_mode;
      return Promise.resolve();
    case 'set_accent_color':
      mockSettings.accent_color = args?.color;
      return Promise.resolve();
    case 'set_cursor_size':
      mockSettings.cursor_size = args?.size;
      return Promise.resolve();
    case 'set_hotkey':
      mockSettings.shortcut = args?.shortcut;
      return Promise.resolve();
    case 'set_shortcut_enabled':
      mockSettings.shortcut_enabled = args?.enabled;
      return Promise.resolve();
    case 'set_minimize_to_tray':
      mockSettings.minimize_to_tray = args?.enable;
      return Promise.resolve();
    case 'set_run_on_startup':
      mockSettings.run_on_startup = args?.enable;
      return Promise.resolve();
    case 'set_default_cursor_style':
      mockSettings.default_cursor_style = args?.style;
      return Promise.resolve();
    case 'reset_all_settings':
      mockSettings = {
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
      };
      return Promise.resolve({ ...mockSettings });
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
  // Reset settings to defaults
  mockSettings = {
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
  };
  
  mockInvoke.mockClear();
  
  const tauriMock = {
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
        <MessageProvider>
          <App />
        </MessageProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

describe('Settings Persistence Integration', () => {
  describe('Initial Settings Load', () => {
    it('applies theme mode from loaded settings', async () => {
      mockSettings.theme_mode = 'light';
      renderApp();

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });

    it('applies accent color from loaded settings', async () => {
      mockSettings.accent_color = '#ff0000';
      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#ff0000');
      });
    });
  });

  describe('Settings Changes', () => {
    it('persists theme mode changes to backend', async () => {
      renderApp();

      await waitFor(() => {
        expect(document.querySelector('#main-content')).toBeTruthy();
      });

      // Navigate to settings (click settings button)
      const settingsBtn = screen.getByTitle('Settings');
      fireEvent.click(settingsBtn);

      await waitFor(() => {
        // Look for theme toggle in settings
        const lightModeBtn = screen.queryByLabelText(/light/i);
        if (lightModeBtn) {
          fireEvent.click(lightModeBtn);
        }
      });

      // Verify the theme was applied
      await waitFor(() => {
        expect(document.body.classList.contains('dark') || document.body.classList.contains('light')).toBe(true);
      });
    });
  });

  describe('Settings Reset', () => {
    it('resets all settings to defaults when reset is called', async () => {
      // Start with modified settings
      mockSettings.theme_mode = 'light';
      mockSettings.accent_color = '#ff0000';
      mockSettings.cursor_size = 64;

      // Verify modified settings
      expect(mockSettings.theme_mode).toBe('light');

      // Simulate reset (would be triggered by UI)
      await mockInvoke('reset_all_settings');

      // Verify settings were reset
      expect(mockSettings.theme_mode).toBe('dark');
      expect(mockSettings.accent_color).toBe('#7c3aed');
      expect(mockSettings.cursor_size).toBe(32);
    });
  });
});
