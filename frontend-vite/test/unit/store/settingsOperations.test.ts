/**
 * Unit tests for settings operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettingsOperations } from '@/store/operations/settingsOperations';
import type { CursorState, Message, TauriFunctions } from '@/store/useAppStore';

describe('Settings Operations', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockShowMessage: ReturnType<typeof vi.fn>;
  let mockUpdateCursorState: ReturnType<typeof vi.fn>;
  let mockSetCursorState: ReturnType<typeof vi.fn>;
  let mockApplyAccentColor: ReturnType<typeof vi.fn>;
  let mockApplyTheme: ReturnType<typeof vi.fn>;
  let mockLoadAvailableCursors: ReturnType<typeof vi.fn>;
  let operations: ReturnType<typeof createSettingsOperations>;

  beforeEach(() => {
    mockInvoke = vi.fn();
    mockShowMessage = vi.fn();
    mockUpdateCursorState = vi.fn();
    mockSetCursorState = vi.fn();
    mockApplyAccentColor = vi.fn();
    mockApplyTheme = vi.fn();
    mockLoadAvailableCursors = vi.fn().mockResolvedValue(undefined);

    const getTauri = (): TauriFunctions => ({
      invoke: mockInvoke as unknown as NonNullable<TauriFunctions['invoke']>,
      listen: vi.fn() as any,
      getAppWindow: vi.fn() as any
    });

    operations = createSettingsOperations(
      getTauri,
      mockUpdateCursorState as unknown as (updates: Partial<CursorState>) => void,
      mockSetCursorState as unknown as (state: CursorState) => void,
      mockShowMessage as unknown as (text: string, type?: Message['type']) => void,
      mockApplyAccentColor as unknown as (color: string) => void,
      mockApplyTheme as unknown as (mode: string) => void,
      mockLoadAvailableCursors as unknown as () => Promise<void>
    );
  });

  describe('setHotkey', () => {
    it('calls invoke with set_hotkey command and shortcut', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setHotkey('Ctrl+Alt+C');

      expect(mockInvoke).toHaveBeenCalledWith('set_hotkey', { shortcut: 'Ctrl+Alt+C' });
    });

    it('updates cursor state with new shortcut', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setHotkey('Ctrl+Alt+C');

      expect(mockUpdateCursorState).toHaveBeenCalledWith({ shortcut: 'Ctrl+Alt+C' });
    });

    it('shows success message', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setHotkey('Ctrl+Alt+C');

      expect(mockShowMessage).toHaveBeenCalledWith('Hotkey updated successfully', 'success');
    });

    it('shows error message and throws on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Invalid hotkey');
      mockInvoke.mockRejectedValue(error);

      await expect(operations.setHotkey('Invalid')).rejects.toThrow('Invalid hotkey');
      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to set hotkey: Error: Invalid hotkey',
        'error'
      );

      consoleError.mockRestore();
    });
  });

  describe('setShortcutEnabled', () => {
    it('enables shortcut', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setShortcutEnabled(true);

      expect(mockInvoke).toHaveBeenCalledWith('set_shortcut_enabled', { enabled: true });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ shortcutEnabled: true });
      expect(mockShowMessage).toHaveBeenCalledWith('Keyboard shortcut enabled', 'success');
    });

    it('disables shortcut', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setShortcutEnabled(false);

      expect(mockInvoke).toHaveBeenCalledWith('set_shortcut_enabled', { enabled: false });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ shortcutEnabled: false });
      expect(mockShowMessage).toHaveBeenCalledWith('Keyboard shortcut disabled', 'success');
    });

    it('shows error message and throws on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Failed');
      mockInvoke.mockRejectedValue(error);

      await expect(operations.setShortcutEnabled(true)).rejects.toThrow('Failed');
      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to update shortcut setting: Error: Failed',
        'error'
      );

      consoleError.mockRestore();
    });
  });

  describe('setMinimizeToTray', () => {
    it('enables minimize to tray', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setMinimizeToTray(true);

      expect(mockInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: true });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ minimizeToTray: true });
    });

    it('disables minimize to tray', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setMinimizeToTray(false);

      expect(mockInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: false });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ minimizeToTray: false });
    });

    it('handles errors silently', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));

      await operations.setMinimizeToTray(true);

      // Should not throw, just log error
      expect(mockShowMessage).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('setRunOnStartup', () => {
    it('enables run on startup', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setRunOnStartup(true);

      expect(mockInvoke).toHaveBeenCalledWith('set_run_on_startup', { enable: true });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ runOnStartup: true });
      expect(mockShowMessage).toHaveBeenCalledWith('Startup enabled', 'success');
    });

    it('disables run on startup', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setRunOnStartup(false);

      expect(mockInvoke).toHaveBeenCalledWith('set_run_on_startup', { enable: false });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ runOnStartup: false });
      expect(mockShowMessage).toHaveBeenCalledWith('Startup disabled', 'success');
    });

    it('shows error message on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Permission denied'));

      await operations.setRunOnStartup(true);

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to update startup setting: Error: Permission denied',
        'error'
      );

      consoleError.mockRestore();
    });
  });

  describe('setCursorSize', () => {
    it('sets cursor size', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setCursorSize('64');

      expect(mockInvoke).toHaveBeenCalledWith('set_cursor_size', { size: 64 });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ cursorSize: 64 });
      expect(mockUpdateCursorState).toHaveBeenCalledTimes(1);
      expect(mockShowMessage).not.toHaveBeenCalled();
    });

    it('shows error message for other errors', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Invalid size'));

      await operations.setCursorSize('64');

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to set cursor size: Error: Invalid size',
        'error'
      );

      consoleError.mockRestore();
    });
  });

  describe('setDefaultCursorStyle', () => {
    it('sets Windows style', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setDefaultCursorStyle('windows');

      expect(mockInvoke).toHaveBeenCalledWith('set_default_cursor_style', { style: 'windows' });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ defaultCursorStyle: 'windows' });
      expect(mockShowMessage).toHaveBeenCalledWith('Default cursors set to Windows style', 'success');
    });

    it('sets Mac style', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.setDefaultCursorStyle('mac');

      expect(mockInvoke).toHaveBeenCalledWith('set_default_cursor_style', { style: 'mac' });
      expect(mockUpdateCursorState).toHaveBeenCalledWith({ defaultCursorStyle: 'mac' });
      expect(mockShowMessage).toHaveBeenCalledWith('Default cursors set to Mac style', 'success');
    });

    it('shows error message and throws on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));

      await expect(operations.setDefaultCursorStyle('windows')).rejects.toThrow('Failed');
      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to set default cursor style: Error: Failed',
        'error'
      );

      consoleError.mockRestore();
    });
  });

  describe('resetAllSettings', () => {
    it('resets all settings and applies defaults', async () => {
      const defaultStatus = {
        hidden: false,
        shortcut: 'Ctrl+Shift+X',
        shortcut_enabled: false,
        cursor_size: 32,
        minimize_to_tray: true,
        run_on_startup: false,
        cursor_paths: {},
        accent_color: '#7c3aed',
        theme_mode: 'dark',
        default_cursor_style: 'windows'
      };
      mockInvoke.mockResolvedValue(defaultStatus);

      await operations.resetAllSettings();

      expect(mockInvoke).toHaveBeenCalledWith('reset_all_settings');
      expect(mockSetCursorState).toHaveBeenCalledWith({
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
        defaultCursorStyle: 'windows'
      });
      expect(mockApplyAccentColor).toHaveBeenCalledWith('#7c3aed');
      expect(mockApplyTheme).toHaveBeenCalledWith('dark');
      expect(mockShowMessage).toHaveBeenCalledWith('All settings reset to defaults', 'success');
      expect(mockLoadAvailableCursors).toHaveBeenCalled();
    });

    it('shows error message on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Reset failed'));

      await operations.resetAllSettings();

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to reset settings: Error: Reset failed',
        'error'
      );

      consoleError.mockRestore();
    });
  });
});
