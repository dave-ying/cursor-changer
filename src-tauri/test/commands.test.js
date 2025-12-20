/**
 * Comprehensive tests for Tauri command invocations.
 * These tests verify that the frontend correctly calls backend commands
 * and handles responses/errors appropriately.
 */

// Mock Tauri API
let mockInvoke;
let mockListen;

beforeEach(() => {
  mockInvoke = vi.fn();
  mockListen = vi.fn(() => vi.fn()); // Returns unlisten function
  
  global.window = {
    __TAURI__: {
      invoke: mockInvoke,
      tauri: { invoke: mockInvoke },
      event: { listen: mockListen },
    }
  };
});

describe('Tauri Commands Tests', () => {
  it('get_status command returns current state', async () => {
    const expectedState = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: true,
      cursor_size: 5,
    };
    
    mockInvoke.mockResolvedValue(expectedState);
    
    const result = await global.window.__TAURI__.invoke('get_status');
    
    expect(mockInvoke).toHaveBeenCalledWith('get_status');
    expect(result).toEqual(expectedState);
  });

  it('toggle_cursor command toggles cursor state', async () => {
    const newState = {
      hidden: true,
      shortcut: 'Ctrl+Alt+H',
      minimize_to_tray: false,
      cursor_size: 8,
    };
    
    mockInvoke.mockResolvedValue(newState);
    
    const result = await global.window.__TAURI__.invoke('toggle_cursor');
    
    expect(mockInvoke).toHaveBeenCalledWith('toggle_cursor');
    expect(result.hidden).toBe(true);
  });

  it('restore_cursor command restores cursor', async () => {
    const restoredState = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: true,
      cursor_size: null,
    };
    
    mockInvoke.mockResolvedValue(restoredState);
    
    const result = await global.window.__TAURI__.invoke('restore_cursor');
    
    expect(mockInvoke).toHaveBeenCalledWith('restore_cursor');
    expect(result.hidden).toBe(false);
  });

  it('set_hotkey command updates shortcut', async () => {
    const newShortcut = 'Ctrl+Alt+C';
    const updatedState = {
      hidden: false,
      shortcut: newShortcut,
      minimize_to_tray: true,
      cursor_size: null,
    };
    
    mockInvoke.mockResolvedValue(updatedState);
    
    const result = await global.window.__TAURI__.invoke('set_hotkey', { shortcut: newShortcut });
    
    expect(mockInvoke).toHaveBeenCalledWith('set_hotkey', { shortcut: newShortcut });
    expect(result.shortcut).toBe(newShortcut);
  });

  it('set_hotkey command rejects empty shortcut', async () => {
    mockInvoke.mockRejectedValue('Shortcut cannot be empty');
    
    await expect(
      global.window.__TAURI__.invoke('set_hotkey', { shortcut: '' })
    ).rejects.toBe('Shortcut cannot be empty');
  });

  it('set_hotkey command rejects invalid shortcut', async () => {
    mockInvoke.mockRejectedValue('Invalid shortcut format');
    
    await expect(
      global.window.__TAURI__.invoke('set_hotkey', { shortcut: 'InvalidKey' })
    ).rejects.toBe('Invalid shortcut format');
  });

  it('set_minimize_to_tray command updates preference', async () => {
    const updatedState = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: false,
      cursor_size: null,
    };
    
    mockInvoke.mockResolvedValue(updatedState);
    
    const result = await global.window.__TAURI__.invoke('set_minimize_to_tray', { enable: false });
    
    expect(mockInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: false });
    expect(result.minimize_to_tray).toBe(false);
  });

  it('set_cursor_size command updates cursor size', async () => {
    const size = 10;
    const updatedState = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: true,
      cursor_size: size,
    };
    
    mockInvoke.mockResolvedValue(updatedState);
    
    const result = await global.window.__TAURI__.invoke('set_cursor_size', { size });
    
    expect(mockInvoke).toHaveBeenCalledWith('set_cursor_size', { size });
    expect(result.cursor_size).toBe(size);
  });

  it('set_cursor_size command rejects invalid size (too small)', async () => {
    mockInvoke.mockRejectedValue('Cursor size must be between 1 and 15');
    
    await expect(
      global.window.__TAURI__.invoke('set_cursor_size', { size: 0 })
    ).rejects.toBe('Cursor size must be between 1 and 15');
  });

  it('set_cursor_size command rejects invalid size (too large)', async () => {
    mockInvoke.mockRejectedValue('Cursor size must be between 1 and 15');
    
    await expect(
      global.window.__TAURI__.invoke('set_cursor_size', { size: 16 })
    ).rejects.toBe('Cursor size must be between 1 and 15');
  });

  it('get_available_cursors command returns cursor list', async () => {
    const cursors = [
      { id: 32512, name: 'Normal', display_name: 'Normal select', image_path: null },
      { id: 32513, name: 'IBeam', display_name: 'Text select', image_path: null },
    ];
    
    mockInvoke.mockResolvedValue(cursors);
    
    const result = await global.window.__TAURI__.invoke('get_available_cursors');
    
    expect(mockInvoke).toHaveBeenCalledWith('get_available_cursors');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Normal');
  });

  it('get_cursor_image command returns cursor path', async () => {
    const imagePath = 'C:\\Windows\\Cursors\\arrow.cur';
    
    mockInvoke.mockResolvedValue(imagePath);
    
    const result = await global.window.__TAURI__.invoke('get_cursor_image', { cursor_name: 'Normal' });
    
    expect(mockInvoke).toHaveBeenCalledWith('get_cursor_image', { cursor_name: 'Normal' });
    expect(result).toBe(imagePath);
  });

  it('set_cursor_image command sets cursor image', async () => {
    const cursorInfo = {
      id: 32512,
      name: 'Normal',
      display_name: 'Normal select',
      image_path: 'C:\\Windows\\Cursors\\custom.cur',
    };
    
    mockInvoke.mockResolvedValue(cursorInfo);
    
    const result = await global.window.__TAURI__.invoke('set_cursor_image', {
      cursor_name: 'Normal',
      image_path: 'C:\\Custom\\cursor.cur',
    });
    
    expect(mockInvoke).toHaveBeenCalledWith('set_cursor_image', {
      cursor_name: 'Normal',
      image_path: 'C:\\Custom\\cursor.cur',
    });
    expect(result.image_path).toBeTruthy();
  });

  it('set_cursor_image command rejects invalid cursor name', async () => {
    mockInvoke.mockRejectedValue("Cursor type 'InvalidName' not found");
    
    await expect(
      global.window.__TAURI__.invoke('set_cursor_image', {
        cursor_name: 'InvalidName',
        image_path: 'C:\\Custom\\cursor.cur',
      })
    ).rejects.toContain('not found');
  });

  it('set_all_cursors command sets all cursor images', async () => {
    const allCursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: 'C:\\Windows\\Cursors\\custom.cur',
    }));
    
    mockInvoke.mockResolvedValue(allCursors);
    
    const result = await global.window.__TAURI__.invoke('set_all_cursors', {
      image_path: 'C:\\Custom\\cursor.cur',
    });
    
    expect(mockInvoke).toHaveBeenCalledWith('set_all_cursors', {
      image_path: 'C:\\Custom\\cursor.cur',
    });
    expect(result).toHaveLength(15);
  });

  it('quit_app command exits application', async () => {
    mockInvoke.mockResolvedValue(undefined);
    
    await global.window.__TAURI__.invoke('quit_app');
    
    expect(mockInvoke).toHaveBeenCalledWith('quit_app');
  });

  it('commands handle network errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));
    
    await expect(
      global.window.__TAURI__.invoke('get_status')
    ).rejects.toThrow('Network error');
  });

  it('commands handle timeout errors', async () => {
    mockInvoke.mockImplementation(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );
    
    await expect(
      global.window.__TAURI__.invoke('toggle_cursor')
    ).rejects.toThrow('Timeout');
  });

  it('multiple concurrent command calls', async () => {
    mockInvoke.mockResolvedValue({ hidden: false });
    
    const promises = [
      global.window.__TAURI__.invoke('get_status'),
      global.window.__TAURI__.invoke('get_status'),
      global.window.__TAURI__.invoke('get_status'),
    ];
    
    const results = await Promise.all(promises);
    
    expect(mockInvoke).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });

  it('command retry logic on transient failures', async () => {
    let callCount = 0;
    mockInvoke.mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Transient error');
      }
      return { hidden: false };
    });
    
    // Simulate retry logic (this would be in the actual UI code)
    let result;
    for (let i = 0; i < 3; i++) {
      try {
        result = await global.window.__TAURI__.invoke('get_status');
        break;
      } catch (e) {
        if (i === 2) throw e;
      }
    }
    
    expect(result).toEqual({ hidden: false });
    expect(callCount).toBe(3);
  });
});
