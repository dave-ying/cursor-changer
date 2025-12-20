import { CursorState, defaultCursorState } from '../store/slices/cursorStateStore';
import { CursorStatePayload } from '../types/generated/CursorStatePayload';

export const normalizeCursorPaths = (
  cursorPaths: CursorStatePayload['cursor_paths'] | null | undefined
): CursorState['cursorPaths'] => {
  const result: CursorState['cursorPaths'] = {};

  if (!cursorPaths) return result;

  for (const [key, value] of Object.entries(cursorPaths)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }

  return result;
};

export const mapCursorStatePayload = (
  payload: Partial<CursorStatePayload> | null | undefined,
  defaults?: CursorState
): Partial<CursorState> => {
  if (!payload) {
    return defaults
      ? {
          ...defaults,
          cursorPaths: { ...defaults.cursorPaths }
        }
      : {};
  }

  const effectiveDefaults = defaults;
  const updates: Partial<CursorState> = {};

  if (payload.hidden !== undefined) updates.hidden = payload.hidden;
  else if (effectiveDefaults) updates.hidden = effectiveDefaults.hidden;

  if (payload.shortcut !== undefined) updates.shortcut = payload.shortcut;
  else if (effectiveDefaults) updates.shortcut = effectiveDefaults.shortcut;

  if (payload.shortcut_enabled !== undefined) updates.shortcutEnabled = payload.shortcut_enabled;
  else if (effectiveDefaults) updates.shortcutEnabled = effectiveDefaults.shortcutEnabled;

  if (payload.cursor_size !== undefined) updates.cursorSize = payload.cursor_size;
  else if (effectiveDefaults) updates.cursorSize = effectiveDefaults.cursorSize;

  if (payload.minimize_to_tray !== undefined) updates.minimizeToTray = payload.minimize_to_tray;
  else if (effectiveDefaults) updates.minimizeToTray = effectiveDefaults.minimizeToTray;

  if (payload.run_on_startup !== undefined) updates.runOnStartup = payload.run_on_startup;
  else if (effectiveDefaults) updates.runOnStartup = effectiveDefaults.runOnStartup;

  if (payload.last_loaded_cursor_path !== undefined) {
    updates.lastLoadedCursorPath = payload.last_loaded_cursor_path;
  } else if (effectiveDefaults) {
    updates.lastLoadedCursorPath = effectiveDefaults.lastLoadedCursorPath;
  }

  if (payload.cursor_paths !== undefined) updates.cursorPaths = normalizeCursorPaths(payload.cursor_paths);
  else if (effectiveDefaults) updates.cursorPaths = { ...effectiveDefaults.cursorPaths };

  if (payload.accent_color !== undefined) updates.accentColor = payload.accent_color;
  else if (effectiveDefaults) updates.accentColor = effectiveDefaults.accentColor;

  if (payload.theme_mode !== undefined) updates.themeMode = payload.theme_mode;
  else if (effectiveDefaults) updates.themeMode = effectiveDefaults.themeMode;

  if (payload.default_cursor_style !== undefined) updates.defaultCursorStyle = payload.default_cursor_style;
  else if (effectiveDefaults) updates.defaultCursorStyle = effectiveDefaults.defaultCursorStyle;

  return updates;
};

export const mapCursorStatePayloadWithDefaults = (
  payload: Partial<CursorStatePayload> | null | undefined,
  defaults: CursorState = defaultCursorState
): CursorState => {
  const merged = {
    ...defaults,
    ...mapCursorStatePayload(payload, defaults)
  };

  return {
    ...merged,
    cursorPaths: { ...merged.cursorPaths }
  };
};
