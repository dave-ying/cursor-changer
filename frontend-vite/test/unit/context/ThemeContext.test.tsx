/**
 * Unit tests for ThemeContext
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import * as React from 'react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AppProvider } from '@/context/AppContext';

// Test component that uses the theme context
function ThemeConsumer() {
  const { themeMode, accentColor, updateThemeClasses } = useTheme();
  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="accent-color">{accentColor}</span>
      <button onClick={updateThemeClasses}>Update Classes</button>
    </div>
  );
}

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
        run_on_startup: false
      });
    case 'get_available_cursors':
      return Promise.resolve([]);
    case 'get_library_cursors':
      return Promise.resolve([]);
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
  mockInvoke.mockClear();
  
  // Reset DOM state
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--brand-primary');
  document.documentElement.style.removeProperty('--brand-secondary');
  document.body.classList.remove('light', 'dark');
  
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AppProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </AppProvider>
  );
}

describe('ThemeContext', () => {
  describe('ThemeProvider', () => {
    it('provides theme context to children', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-mode')).toBeInTheDocument();
        expect(screen.getByTestId('accent-color')).toBeInTheDocument();
      });
    });

    it('provides default theme mode', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        const themeMode = screen.getByTestId('theme-mode');
        expect(themeMode.textContent).toBe('dark');
      });
    });

    it('provides default accent color', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        const accentColor = screen.getByTestId('accent-color');
        expect(accentColor.textContent).toBe('#7c3aed');
      });
    });
  });

  describe('DOM Updates', () => {
    it('sets data-theme attribute on document element', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('adds theme class to body', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(document.body.classList.contains('dark')).toBe(true);
      });
    });

    it('sets CSS custom properties for accent color', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#7c3aed');
        expect(root.style.getPropertyValue('--brand-secondary')).toBe('#7c3aed');
      });
    });
  });

  describe('Light Theme', () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_status') {
          return Promise.resolve({
            cursor_paths: {},
            theme_mode: 'light',
            accent_color: '#7c3aed',
            hidden: false,
            shortcut: 'Ctrl+Shift+X',
            shortcut_enabled: true,
            cursor_size: 32,
            minimize_to_tray: true,
            run_on_startup: false
          });
        }
        return Promise.resolve(undefined);
      });
    });

    it('applies light theme correctly', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.body.classList.contains('light')).toBe(true);
        expect(document.body.classList.contains('dark')).toBe(false);
      });
    });
  });

  describe('Custom Accent Color', () => {
    beforeEach(() => {
      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === 'get_status') {
          return Promise.resolve({
            cursor_paths: {},
            theme_mode: 'dark',
            accent_color: '#ff5500',
            hidden: false,
            shortcut: 'Ctrl+Shift+X',
            shortcut_enabled: true,
            cursor_size: 32,
            minimize_to_tray: true,
            run_on_startup: false
          });
        }
        return Promise.resolve(undefined);
      });
    });

    it('applies custom accent color', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.style.getPropertyValue('--brand-primary')).toBe('#ff5500');
      });
    });
  });

  describe('useTheme Hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('provides updateThemeClasses function', async () => {
      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update classes/i })).toBeInTheDocument();
      });
    });
  });

  describe('System Theme', () => {
    it('listens for system theme changes', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'matchMedia');

      renderWithProviders(<ThemeConsumer />);

      await waitFor(() => {
        expect(addEventListenerSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      });

      addEventListenerSpy.mockRestore();
    });
  });
});
