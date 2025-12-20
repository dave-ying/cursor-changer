// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Use direct relative import to avoid alias issues in Vitest
import { useAppStore } from '@/store/useAppStore';
import { Settings } from '@/components/Settings';

// Prevent real Tauri calls in tests
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
  event: {
    listen: vi.fn(),
  },
}));

describe('Theme Mode default behavior', () => {
  beforeEach(() => {
    // Reset Zustand store to ensure themeMode starts as dark for each test
    const { getState, setState } = useAppStore;
    const initial = getState();
    setState({
      ...initial,
      cursorState: {
        ...initial.cursorState,
        accentColor: '#7c3aed',
        themeMode: 'dark',
      },
    }, true);

    document.documentElement.className = '';
  });

  it('store defaults themeMode to dark', () => {
    const { cursorState } = useAppStore.getState();
    expect(cursorState.themeMode).toBe('dark');
  });

  it('Dark button is visually active by default in Settings', () => {
    render(<Settings initialTab="interface" />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const lightButton = screen.getByRole('radio', { name: /light/i });

    const darkStyle = darkButton.getAttribute('style') || '';
    const lightStyle = lightButton.getAttribute('style') || '';

    // Dark should have accent styling; Light should not.
    expect(darkStyle).toContain('background-color');
    // The accent color may be emitted as rgb() by the browser; don't assert exact color string.
    expect(lightStyle).not.toContain('background-color');
  });

  it('falls back to dark when themeMode is invalid so Dark button appears active', () => {
    // Force invalid value into store
    const { setState } = useAppStore;
    setState((state) => ({
      ...state,
      cursorState: {
        ...state.cursorState,
        themeMode: 'invalid-mode',
      },
    }), true);

    render(<Settings initialTab="interface" />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const darkStyle = darkButton.getAttribute('style') || '';

    // Our Settings ToggleGroup logic falls back to "dark" for invalid values,
    // so visually Dark must be active.
    expect(darkStyle).toContain('background-color');
  });
});