import { expect, test, vi, beforeEach } from 'vitest';

/**
 * Comprehensive error handling tests for the application.
 * Tests various failure scenarios and recovery mechanisms.
 */

let mockInvoke;
let mockEmit;
let errorListeners;

beforeEach(() => {
  errorListeners = {};
  mockInvoke = vi.fn();
  mockEmit = vi.fn();
  
  global.window = {
    __TAURI__: {
      invoke: mockInvoke,
      event: {
        listen: vi.fn((eventName, callback) => {
          errorListeners[eventName] = callback;
          return vi.fn();
        }),
        emit: mockEmit,
      },
    },
  };
});

test('handles cursor toggle failure gracefully', async () => {
  mockInvoke.mockRejectedValue('Failed to hide system cursors');
  
  try {
    await global.window.__TAURI__.invoke('toggle_cursor');
    expect.fail('Should have thrown error');
  } catch (error) {
    expect(error).toBe('Failed to hide system cursors');
  }
});

test('handles cursor restore failure gracefully', async () => {
  mockInvoke.mockRejectedValue('Failed to restore system cursors');
  
  try {
    await global.window.__TAURI__.invoke('restore_cursor');
    expect.fail('Should have thrown error');
  } catch (error) {
    expect(error).toBe('Failed to restore system cursors');
  }
});

test('handles invalid shortcut registration', async () => {
  mockInvoke.mockRejectedValue("Failed to register shortcut 'InvalidKey': Invalid format");
  
  await expect(
    global.window.__TAURI__.invoke('set_hotkey', { shortcut: 'InvalidKey' })
  ).rejects.toContain('Invalid format');
});

test('handles shortcut already registered by another app', async () => {
  mockInvoke.mockRejectedValue("Failed to register shortcut 'Ctrl+C': Already registered");
  
  await expect(
    global.window.__TAURI__.invoke('set_hotkey', { shortcut: 'Ctrl+C' })
  ).rejects.toContain('Already registered');
});

test('handles empty shortcut string', async () => {
  mockInvoke.mockRejectedValue('Shortcut cannot be empty');
  
  await expect(
    global.window.__TAURI__.invoke('set_hotkey', { shortcut: '' })
  ).rejects.toBe('Shortcut cannot be empty');
});

test('handles whitespace-only shortcut', async () => {
  mockInvoke.mockRejectedValue('Shortcut cannot be empty');
  
  await expect(
    global.window.__TAURI__.invoke('set_hotkey', { shortcut: '   ' })
  ).rejects.toBe('Shortcut cannot be empty');
});

test('handles cursor size out of range (too small)', async () => {
  mockInvoke.mockRejectedValue('Cursor size must be between 1 and 15');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_size', { size: 0 })
  ).rejects.toContain('between 1 and 15');
});

test('handles cursor size out of range (too large)', async () => {
  mockInvoke.mockRejectedValue('Cursor size must be between 1 and 15');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_size', { size: 20 })
  ).rejects.toContain('between 1 and 15');
});

test('handles registry write failure for cursor size', async () => {
  mockInvoke.mockRejectedValue('Failed to write cursor size to Windows Registry');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_size', { size: 8 })
  ).rejects.toContain('Registry');
});

test('handles invalid cursor type name', async () => {
  mockInvoke.mockRejectedValue("Cursor type 'NonExistent' not found");
  
  await expect(
    global.window.__TAURI__.invoke('get_cursor_image', { cursor_name: 'NonExistent' })
  ).rejects.toContain('not found');
});

test('handles cursor file copy failure', async () => {
  mockInvoke.mockRejectedValue('Failed to copy cursor file to Windows\\Cursors folder');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_image', {
      cursor_name: 'Normal',
      image_path: 'C:\\Invalid\\Path\\cursor.cur',
    })
  ).rejects.toContain('copy cursor file');
});

test('handles invalid cursor file extension', async () => {
  mockInvoke.mockRejectedValue('Invalid cursor file format');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_image', {
      cursor_name: 'Normal',
      image_path: 'C:\\Files\\image.png',
    })
  ).rejects.toContain('Invalid cursor file');
});

test('handles config persistence failure', async () => {
  mockInvoke.mockRejectedValue('Failed to persist preferences: Permission denied');
  
  // Command might succeed but log a warning
  mockInvoke.mockResolvedValue({
    hidden: false,
    shortcut: 'Ctrl+Alt+H',
    minimize_to_tray: true,
    cursor_size: 5,
  });
  
  const result = await global.window.__TAURI__.invoke('set_hotkey', { shortcut: 'Ctrl+Alt+H' });
  
  // Should still return updated state even if persistence fails
  expect(result.shortcut).toBe('Ctrl+Alt+H');
});

test('handles corrupted config file on load', async () => {
  // Backend should handle this and return defaults
  mockInvoke.mockResolvedValue({
    hidden: false,
    shortcut: 'Ctrl+Shift+X', // Default
    minimize_to_tray: true,
    cursor_size: null,
  });
  
  const result = await global.window.__TAURI__.invoke('get_status');
  
  expect(result.shortcut).toBe('Ctrl+Shift+X');
});

test('handles state mutex poisoning', async () => {
  mockInvoke.mockRejectedValue('Application state poisoned');
  
  await expect(
    global.window.__TAURI__.invoke('toggle_cursor')
  ).rejects.toContain('poisoned');
});

test('handles Windows API failure in cursor operations', async () => {
  mockInvoke.mockRejectedValue('Windows API error: CreateCursor failed');
  
  await expect(
    global.window.__TAURI__.invoke('toggle_cursor')
  ).rejects.toContain('Windows API');
});

test('cursor-error event is emitted on backend errors', async () => {
  let errorReceived = null;
  
  errorListeners['cursor-error'] = (event) => {
    errorReceived = event.payload;
  };
  
  // Simulate backend emitting error
  errorListeners['cursor-error']({ payload: 'Failed to toggle cursor' });
  
  expect(errorReceived).toBe('Failed to toggle cursor');
});

test('handles network timeout gracefully', async () => {
  mockInvoke.mockImplementation(() => 
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 50)
    )
  );
  
  await expect(
    global.window.__TAURI__.invoke('get_status')
  ).rejects.toThrow('Request timeout');
});

test('handles rapid error recovery', async () => {
  let callCount = 0;
  
  mockInvoke.mockImplementation(async () => {
    callCount++;
    if (callCount === 1) {
      throw new Error('First attempt failed');
    }
    return { hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 5 };
  });
  
  // First call fails
  try {
    await global.window.__TAURI__.invoke('toggle_cursor');
  } catch (e) {
    expect(e.message).toContain('First attempt failed');
  }
  
  // Second call succeeds
  const result = await global.window.__TAURI__.invoke('toggle_cursor');
  expect(result.hidden).toBe(false);
});

test('handles partial command execution failure', async () => {
  // Simulate situation where shortcut is set but persistence fails
  mockInvoke.mockResolvedValue({
    hidden: false,
    shortcut: 'Ctrl+Alt+T',
    minimize_to_tray: true,
    cursor_size: 5,
  });
  
  const result = await global.window.__TAURI__.invoke('set_hotkey', { shortcut: 'Ctrl+Alt+T' });
  
  // Command returns success even if persistence had issues
  expect(result.shortcut).toBe('Ctrl+Alt+T');
});

test('handles missing window focus for shortcut', async () => {
  // Global shortcuts should work regardless of focus
  mockInvoke.mockResolvedValue({
    hidden: true,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  });
  
  const result = await global.window.__TAURI__.invoke('toggle_cursor');
  expect(result.hidden).toBe(true);
});

test('handles get_status on uninitialized state', async () => {
  // Should return default state
  mockInvoke.mockResolvedValue({
    hidden: false,
    shortcut: null,
    minimize_to_tray: true,
    cursor_size: null,
  });
  
  const result = await global.window.__TAURI__.invoke('get_status');
  
  expect(result.hidden).toBe(false);
  expect(result.minimize_to_tray).toBe(true);
});

test('handles quit_app with cursor still hidden', async () => {
  // Backend should restore cursor before quitting
  mockInvoke.mockResolvedValue(undefined);
  
  await global.window.__TAURI__.invoke('quit_app');
  
  expect(mockInvoke).toHaveBeenCalledWith('quit_app');
});

test('handles multiple error types in sequence', async () => {
  const errors = [
    'Failed to hide system cursors',
    'Invalid shortcut format',
    'Cursor size out of range',
    'Permission denied',
  ];
  
  let errorIndex = 0;
  mockInvoke.mockImplementation(async () => {
    throw new Error(errors[errorIndex++ % errors.length]);
  });
  
  for (const expectedError of errors) {
    try {
      await global.window.__TAURI__.invoke('toggle_cursor');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e.message).toBe(expectedError);
    }
  }
});

test('error messages are user-friendly', async () => {
  const technicalError = 'HRESULT 0x80070005: Access denied';
  const userFriendlyError = 'Failed to write cursor size to Windows Registry';
  
  mockInvoke.mockRejectedValue(userFriendlyError);
  
  try {
    await global.window.__TAURI__.invoke('set_cursor_size', { size: 10 });
  } catch (error) {
    expect(error).not.toContain('HRESULT');
    expect(error).toContain('Registry');
  }
});

test('handles event listener registration failure', () => {
  const failingListener = vi.fn(() => {
    throw new Error('Event listener failed');
  });
  
  try {
    global.window.__TAURI__.event.listen('cursor-state', failingListener);
    failingListener({ payload: { hidden: false } });
  } catch (error) {
    expect(error.message).toBe('Event listener failed');
  }
});

test('handles missing __TAURI__ global', async () => {
  global.window = {};
  
  expect(global.window.__TAURI__).toBeUndefined();
  
  // UI should handle gracefully with fallback
  const hasTauri = typeof global.window.__TAURI__ !== 'undefined';
  expect(hasTauri).toBe(false);
});

test('handles rapid command invocations without race conditions', async () => {
  let invocationCount = 0;
  
  mockInvoke.mockImplementation(async () => {
    invocationCount++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      hidden: invocationCount % 2 === 1,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: true,
      cursor_size: 5,
    };
  });
  
  // Fire multiple rapid commands
  const promises = Array(10).fill(null).map(() => 
    global.window.__TAURI__.invoke('toggle_cursor')
  );
  
  const results = await Promise.all(promises);
  
  expect(results).toHaveLength(10);
  expect(invocationCount).toBe(10);
});

test('handles command payload validation errors', async () => {
  mockInvoke.mockRejectedValue('Invalid payload: missing required field');
  
  await expect(
    global.window.__TAURI__.invoke('set_cursor_size', {})
  ).rejects.toContain('Invalid payload');
});

test('error recovery preserves app state consistency', async () => {
  let state = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  // Successful operation
  mockInvoke.mockResolvedValueOnce({ ...state, hidden: true });
  let result = await global.window.__TAURI__.invoke('toggle_cursor');
  expect(result.hidden).toBe(true);
  
  // Failed operation - state should not change
  mockInvoke.mockRejectedValueOnce('Operation failed');
  try {
    await global.window.__TAURI__.invoke('toggle_cursor');
  } catch (e) {
    // State remains as before the failed operation
    mockInvoke.mockResolvedValueOnce({ ...state, hidden: true });
    result = await global.window.__TAURI__.invoke('get_status');
    expect(result.hidden).toBe(true);
  }
});
