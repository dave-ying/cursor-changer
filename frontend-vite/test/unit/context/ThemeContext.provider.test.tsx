import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';

const storeStateRef = { current: null as any };

const useAppStoreMock = vi.fn((selector?: (state: any) => any) => {
  const state = storeStateRef.current;
  if (typeof selector === 'function') {
    return selector(state);
  }
  return state;
});

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector?: (state: any) => any) => useAppStoreMock(selector)
}));

function createStoreState(overrides: any = {}) {
  return {
    cursorState: {
      themeMode: 'dark',
      accentColor: '#7c3aed',
      ...overrides.cursorState
    },
    operations: {
      setThemeMode: vi.fn(),
      setAccentColor: vi.fn(),
      ...overrides.operations
    }
  };
}

function ThemeConsumer() {
  const { themeMode, accentColor, setThemeMode, setAccentColor, updateThemeClasses } = useTheme();
  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="accent-color">{accentColor}</span>
      <button onClick={() => setThemeMode('light')}>toggle-mode</button>
      <button onClick={() => setAccentColor('#ff5500')}>set-accent</button>
      <button onClick={updateThemeClasses}>update-classes</button>
    </div>
  );
}

const matchMediaObject = {
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

beforeEach(() => {
  storeStateRef.current = createStoreState();
  useAppStoreMock.mockClear();
  matchMediaObject.matches = false;
  matchMediaObject.addEventListener.mockClear();
  matchMediaObject.removeEventListener.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => matchMediaObject)
  });
  document.documentElement.removeAttribute('data-theme');
  document.body.className = '';
  document.documentElement.style.removeProperty('--brand-primary');
  document.documentElement.style.removeProperty('--brand-secondary');
});

afterEach(() => {
  cleanup();
});

describe('ThemeProvider store bridge', () => {
  it('exposes cursor state and delegates operations', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-mode').textContent).toBe('dark');
    expect(screen.getByTestId('accent-color').textContent).toBe('#7c3aed');

    fireEvent.click(screen.getByText('toggle-mode'));
    fireEvent.click(screen.getByText('set-accent'));

    expect(storeStateRef.current.operations.setThemeMode).toHaveBeenCalledWith('light');
    expect(storeStateRef.current.operations.setAccentColor).toHaveBeenCalledWith('#ff5500');
  });

  it('updates DOM classes/variables via updateThemeClasses', () => {
    storeStateRef.current = createStoreState({
      cursorState: { themeMode: 'light', accentColor: '#123456' }
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('update-classes'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.body.classList.contains('light')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#123456');
  });

  it('falls back to default accent color when none is set', () => {
    storeStateRef.current = createStoreState({
      cursorState: { themeMode: 'dark', accentColor: '' }
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('update-classes'));

    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#7c3aed');
  });

  it('subscribes to system theme changes and applies mode when in system mode', () => {
    storeStateRef.current = createStoreState({
      cursorState: { themeMode: 'system', accentColor: '#abcdef' }
    });

    const { unmount } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(matchMediaObject.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    const handler = matchMediaObject.addEventListener.mock.calls[0][1];
    matchMediaObject.matches = true;

    handler({ matches: true });

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    unmount();
    expect(matchMediaObject.removeEventListener).toHaveBeenCalledWith('change', handler);
  });
});
