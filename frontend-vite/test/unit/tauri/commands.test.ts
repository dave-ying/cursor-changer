import { describe, it, expect, vi } from 'vitest';
import { Commands, invokeCommand } from '@/tauri/commands';

describe('tauri/commands invokeCommand', () => {
  it('calls invoke without args when args are omitted', async () => {
    const payload = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      shortcut_enabled: true,
      cursor_size: 32,
      minimize_to_tray: true,
      run_on_startup: false,
      last_loaded_cursor_path: null,
      cursor_paths: {},
      accent_color: '#7c3aed',
      theme_mode: 'dark',
      default_cursor_style: 'windows'
    };

    const invoke = vi.fn().mockResolvedValue(payload);
    const result = await invokeCommand(invoke, Commands.getStatus);

    expect(invoke).toHaveBeenCalledWith(Commands.getStatus);
    expect(result).toEqual(payload);
  });

  it('calls invoke with args when args are provided', async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true });

    await invokeCommand(invoke, Commands.setCursorSize, { size: 64 });

    expect(invoke).toHaveBeenCalledWith(Commands.setCursorSize, { size: 64 });
  });
});
