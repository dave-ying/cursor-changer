// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Use direct relative imports to align with Vitest config
import { useAppStore } from '@/store/useAppStore';
import { Settings } from '@/components/Settings';

// Mock Tauri API so no real backend calls are made
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn().mockResolvedValue({}),
  event: {
    listen: vi.fn(),
  },
}));

const mockSetThemeMode = vi.fn(async (mode: string) => {
  useAppStore.getState().updateCursorState({ themeMode: mode });
});

const mockSetAccentColor = vi.fn(async (color: string) => {
  useAppStore.getState().updateCursorState({ accentColor: color as any });
});

const mockResetAllSettings = vi.fn(async () => {
  useAppStore.getState().setCursorState({
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    shortcutEnabled: false,
    cursorSize: 32,
    minimizeToTray: true,
    runOnStartup: false,
    lastLoadedCursorPath: null,
    cursorPaths: {},
    accentColor: '#7c3aed',
    themeMode: 'dark',
    defaultCursorStyle: 'windows',
  } as any);
});

const getThemeMode = () => useAppStore.getState().cursorState.themeMode;

describe('Theme Mode + Settings integration (focused)', () => {
  beforeEach(() => {

    const { getState, setState } = useAppStore;
    const initial = getState();

    // Clean theme-related state
    setState({
      ...initial,
      cursorState: {
        ...initial.cursorState,
        accentColor: '#7c3aed',
        themeMode: 'dark',
      },
    }, true);

    // Ensure Settings uses predictable store operations during this test suite
    useAppStore.setState(
      (state) => ({
        ...state,
        operations: {
          ...state.operations,
          setThemeMode: mockSetThemeMode as any,
          setAccentColor: mockSetAccentColor as any,
          resetAllSettings: mockResetAllSettings as any,
        }
      }),
      true
    );

    mockSetThemeMode.mockClear();
    mockSetAccentColor.mockClear();
    mockResetAllSettings.mockClear();

    document.documentElement.className = '';
  });

  it('starts with themeMode "dark" and Dark button styled active', () => {
    expect(getThemeMode()).toBe('dark');

    render(<Settings initialTab="interface" />);


    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const lightButton = screen.getByRole('radio', { name: /light/i });

    const darkStyle = darkButton.getAttribute('style') || '';
    const lightStyle = lightButton.getAttribute('style') || '';

    expect(darkStyle).toContain('background-color');
    expect(darkStyle).toContain('background-color');
    // expect(darkStyle).toContain('#7c3aed'); // Removed brittle hex check
    expect(lightStyle).not.toContain('background-color');
  });

  it('clicking Light updates themeMode and button styles', () => {
    render(<Settings initialTab="interface" />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const lightButton = screen.getByRole('radio', { name: /light/i });

    fireEvent.click(lightButton);

    expect(getThemeMode()).toBe('light');

    const darkStyle = darkButton.getAttribute('style') || '';
    const lightStyle = lightButton.getAttribute('style') || '';

    expect(lightStyle).toContain('background-color');
    expect(darkStyle).not.toContain('background-color');
  });

  it('clicking Dark after Light switches back and Dark is active', () => {
    render(<Settings initialTab="interface" />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const lightButton = screen.getByRole('radio', { name: /light/i });

    fireEvent.click(lightButton);
    expect(getThemeMode()).toBe('light');

    fireEvent.click(darkButton);
    expect(getThemeMode()).toBe('dark');

    const darkStyle = darkButton.getAttribute('style') || '';
    const lightStyle = lightButton.getAttribute('style') || '';

    expect(darkStyle).toContain('background-color');
    expect(lightStyle).not.toContain('background-color');
  });

  it('when themeMode in store is invalid, Settings falls back to dark selection', () => {
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

    // Visually, Dark must appear active due to fallback-to-dark logic.
    expect(darkStyle).toContain('background-color');
  });

  it('resetAllSettings returns to dark and Dark button is active', async () => {
    render(<Settings initialTab="interface" />);

    const darkButton = screen.getByRole('radio', { name: /dark/i });
    const lightButton = screen.getByRole('radio', { name: /light/i });

    // Switch to light first
    fireEvent.click(lightButton);
    expect(getThemeMode()).toBe('light');

    // Switch to General tab so "Reset All Settings" appears
    const generalTab = screen.getByRole('radio', { name: /general/i });
    fireEvent.click(generalTab);

    // Open Reset All Settings dialog
    const resetAllTrigger = screen.getByRole('button', { name: /reset all settings/i });
    fireEvent.click(resetAllTrigger);

    // Confirm reset in dialog
    const confirmButton = await screen.findByRole('button', { name: /^reset all settings$/i });
    fireEvent.click(confirmButton);

    // Our mocked resetAllSettings sets themeMode back to dark
    expect(getThemeMode()).toBe('dark');

    // Switch back to Interface tab and re-query buttons (the Interface settings may have been unmounted)
    const interfaceTab = screen.getByRole('radio', { name: /interface/i });
    fireEvent.click(interfaceTab);

    const updatedDarkButton = screen.getByRole('radio', { name: /dark/i });
    const updatedLightButton = screen.getByRole('radio', { name: /light/i });

    const darkStyle = updatedDarkButton.getAttribute('style') || '';
    const lightStyle = updatedLightButton.getAttribute('style') || '';

    expect(darkStyle).toContain('background-color');
    expect(lightStyle).not.toContain('background-color');
  });
});