import { describe, it, expect } from 'vitest';
import { defaultCursorState } from '@/store/slices/cursorStateStore';
import { mapCursorStatePayload, mapCursorStatePayloadWithDefaults, normalizeCursorPaths } from '@/tauri/mappers';

describe('tauri/mappers', () => {
  describe('normalizeCursorPaths', () => {
    it('filters out non-string values', () => {
      const normalized = normalizeCursorPaths({
        Normal: 'C:/a.cur',
        IBeam: undefined as any,
        Hand: 123 as any,
        Wait: null as any
      });

      expect(normalized).toEqual({ Normal: 'C:/a.cur' });
    });

    it('returns empty object for null/undefined', () => {
      expect(normalizeCursorPaths(undefined)).toEqual({});
      expect(normalizeCursorPaths(null)).toEqual({});
    });
  });

  describe('mapCursorStatePayload', () => {
    it('maps snake_case payload fields to store shape', () => {
      const updates = mapCursorStatePayload({
        hidden: true,
        shortcut: 'Ctrl+Alt+X',
        shortcut_enabled: false,
        cursor_size: 64,
        minimize_to_tray: false,
        run_on_startup: true,
        last_loaded_cursor_path: 'C:/last.cur',
        cursor_paths: { Normal: 'C:/n.cur' },
        accent_color: '#ff0000',
        theme_mode: 'light',
        default_cursor_style: 'mac'
      });

      expect(updates).toEqual({
        hidden: true,
        shortcut: 'Ctrl+Alt+X',
        shortcutEnabled: false,
        cursorSize: 64,
        minimizeToTray: false,
        runOnStartup: true,
        lastLoadedCursorPath: 'C:/last.cur',
        cursorPaths: { Normal: 'C:/n.cur' },
        accentColor: '#ff0000',
        themeMode: 'light',
        defaultCursorStyle: 'mac'
      });
    });

    it('uses defaults for missing fields when defaults are provided', () => {
      const updates = mapCursorStatePayload(
        {
          // only provide one field
          theme_mode: 'light'
        },
        defaultCursorState
      );

      expect(updates).toEqual({
        hidden: defaultCursorState.hidden,
        shortcut: defaultCursorState.shortcut,
        shortcutEnabled: defaultCursorState.shortcutEnabled,
        cursorSize: defaultCursorState.cursorSize,
        minimizeToTray: defaultCursorState.minimizeToTray,
        runOnStartup: defaultCursorState.runOnStartup,
        lastLoadedCursorPath: defaultCursorState.lastLoadedCursorPath,
        cursorPaths: { ...defaultCursorState.cursorPaths },
        accentColor: defaultCursorState.accentColor,
        themeMode: 'light',
        defaultCursorStyle: defaultCursorState.defaultCursorStyle
      });
    });

    it('returns cloned cursorPaths when payload is null and defaults are provided', () => {
      const defaults = { ...defaultCursorState, cursorPaths: { Normal: 'C:/x.cur' } };
      const updates = mapCursorStatePayload(null, defaults);

      expect(updates.cursorPaths).toEqual({ Normal: 'C:/x.cur' });
      expect(updates.cursorPaths).not.toBe(defaults.cursorPaths);
    });
  });

  describe('mapCursorStatePayloadWithDefaults', () => {
    it('returns full state with defaults merged and cursorPaths cloned', () => {
      const state = mapCursorStatePayloadWithDefaults({ theme_mode: 'light' }, defaultCursorState);

      expect(state.themeMode).toBe('light');
      expect(state.cursorPaths).toEqual({});
      // Clone check
      expect(state.cursorPaths).not.toBe(defaultCursorState.cursorPaths);
    });
  });
});
