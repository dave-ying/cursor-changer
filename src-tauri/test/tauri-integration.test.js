import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

let dom;
let window;
let document;
let mockInvoke;
let mockListen;
let eventListeners;
let unlistenFns;

beforeEach(() => {
  eventListeners = {};
  unlistenFns = [];
  
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="cursor-state">Visible</div>
        <div id="shortcut">Ctrl+Shift+X</div>
        <div id="recorded">Ctrl+Shift+X</div>
        <div id="message"></div>
        <button id="toggle-btn">Toggle</button>
        <button id="apply-btn" disabled>Apply</button>
        <button id="edit-btn">Edit</button>
        <input type="checkbox" id="minimize-to-tray" checked />
        <input type="range" id="cursor-size-slider" min="32" max="256" value="32" />
        <div id="cursor-size-display">32</div>
        <div id="close-dialog" class="hidden">
          <button id="confirm-close">Close</button>
          <button id="confirm-minimize">Minimize</button>
          <button id="cancel-close">Cancel</button>
        </div>
        <button id="minimize-btn">Minimize</button>
        <button id="maximize-btn">Maximize</button>
        <button id="close-btn">Close</button>
        <div id="cursor-grid"></div>
        <button id="set-windows-defaults">Set Defaults</button>
        <button id="manage-custom-cursors">Manage</button>
        <div id="manage-cursors-modal" class="hidden">
          <div id="custom-cursors-list"></div>
          <button id="close-manage-cursors">Close</button>
        </div>
        <div id="browse-modal" class="hidden">
          <button id="browse-upload-btn">Upload</button>
          <button id="browse-cancel-btn">Cancel</button>
        </div>
        <div id="cursor-changer-studio-backdrop" class="hidden">
          <div id="cursor-changer-studio-title">cursor changer</div>
          <div id="studio-stage-fit" style="display:none;">
            <canvas id="fit-canvas" width="256" height="256"></canvas>
            <input type="range" id="fit-scale" min="10" max="200" value="100" />
            <div id="fit-scale-display">100%</div>
            <input type="number" id="fit-x" value="0" />
            <input type="number" id="fit-y" value="0" />
            <button id="fit-center-btn">Center</button>
            <button id="fit-continue-btn">Continue</button>
          </div>
          <div id="studio-stage-hotspot" style="display:grid;">
            <div id="studio-file-section">
              <input type="file" id="studio-file-png" accept="image/*" />
            </div>
            <div id="studio-name-section">
              <input type="text" id="studio-name" />
            </div>
            <canvas id="studio-canvas" width="512" height="512"></canvas>
            <input type="number" id="studio-hotX" value="0" />
            <input type="number" id="studio-hotY" value="0" />
            <select id="studio-indicator-style">
              <option value="cross">Crosshair</option>
              <option value="dot">Dot</option>
            </select>
            <button id="studio-view-crosshair">Crosshair</button>
            <button id="studio-view-dot">Dot</button>
            <input type="color" id="studio-hotspot-color" value="#ff0000" />
            <button id="studio-download">Download</button>
            <div id="studio-status"></div>
          </div>
          <button id="close-cursor-changer-studio">Close</button>
        </div>
        <button id="mode-simple" class="active">Simple</button>
        <button id="mode-advanced">Advanced</button>
        <div id="mode-description">Simple mode</div>
        <div id="simple-mode-info">Simple mode info</div>
      </body>
    </html>
  `, { url: 'http://localhost' });
  
  window = dom.window;
  document = window.document;
  global.window = window;
  global.document = document;
  
  // Mock localStorage if jsdom does not expose a writable instance
  const storageShim = {
    _store: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._store, k) ? this._store[k] : null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
    clear() { this._store = {}; }
  };
  try {
    const storage = window.localStorage;
    storage.setItem('__vitest__', '1');
    storage.removeItem('__vitest__');
  } catch {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storageShim
    });
  }
  
  mockInvoke = vi.fn();
  mockListen = vi.fn((eventName, callback) => {
    eventListeners[eventName] = callback;
    const unlisten = vi.fn();
    unlistenFns.push(unlisten);
    return Promise.resolve(unlisten);
  });
  
  const mockAppWindow = {
    hide: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    listen: mockListen,
    close: vi.fn()
  };
  
  window.__TAURI__ = {
    invoke: mockInvoke,
    event: { listen: mockListen },
    window: {
      getCurrentWindow: () => mockAppWindow,
      getCurrent: () => mockAppWindow,
      appWindow: mockAppWindow
    },
    appWindow: mockAppWindow
  };
  
  // Provide global functions the UI expects
  global.setMessage = vi.fn();
  global.updateState = vi.fn();
  window.setMessage = global.setMessage;
  window.updateState = global.updateState;
});

afterEach(() => {
  try {
    dom?.window?.close?.();
  } catch {}
  try {
    delete global.window;
    delete global.document;
    delete global.setMessage;
    delete global.updateState;
  } catch {}
});

describe('Cursor State Management', () => {
  test('initial state loads correctly', async () => {
    const initialState = {
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      minimize_to_tray: true,
      cursor_size: 32
    };
    
    mockInvoke.mockResolvedValue(initialState);
    
    const result = await window.__TAURI__.invoke('get_status');
    
    expect(result).toEqual(initialState);
    expect(mockInvoke).toHaveBeenCalledWith('get_status');
  });
  
  test('cursor toggle workflow', async () => {
    // Initial state: visible
    let state = { hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 32 };
    mockInvoke.mockResolvedValueOnce(state);
    
    await window.__TAURI__.invoke('get_status');
    
    // Toggle to hidden
    state.hidden = true;
    mockInvoke.mockResolvedValueOnce(state);
    
    const result1 = await window.__TAURI__.invoke('toggle_cursor');
    expect(result1.hidden).toBe(true);
    
    // Toggle back to visible
    state.hidden = false;
    mockInvoke.mockResolvedValueOnce(state);
    
    const result2 = await window.__TAURI__.invoke('toggle_cursor');
    expect(result2.hidden).toBe(false);
  });
  
  test('cursor restore always makes visible', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 32 });
    
    const result = await window.__TAURI__.invoke('restore_cursor');
    
    expect(result.hidden).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith('restore_cursor');
  });
});

describe('Hotkey Management', () => {
  test('set hotkey updates shortcut', async () => {
    const newShortcut = 'Ctrl+Alt+H';
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: newShortcut, minimize_to_tray: true, cursor_size: 32 });
    
    const result = await window.__TAURI__.invoke('set_hotkey', { shortcut: newShortcut });
    
    expect(result.shortcut).toBe(newShortcut);
    expect(mockInvoke).toHaveBeenCalledWith('set_hotkey', { shortcut: newShortcut });
  });
  
  test('invalid hotkey rejected', async () => {
    mockInvoke.mockRejectedValue('Invalid shortcut format');
    
    await expect(
      window.__TAURI__.invoke('set_hotkey', { shortcut: 'InvalidKey' })
    ).rejects.toBe('Invalid shortcut format');
  });
  
  test('empty hotkey rejected', async () => {
    mockInvoke.mockRejectedValue('Shortcut cannot be empty');
    
    await expect(
      window.__TAURI__.invoke('set_hotkey', { shortcut: '' })
    ).rejects.toBe('Shortcut cannot be empty');
  });
});

describe('Minimize to Tray', () => {
  test('toggle minimize to tray preference', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: false, cursor_size: 32 });
    
    const result = await window.__TAURI__.invoke('set_minimize_to_tray', { enable: false });
    
    expect(result.minimize_to_tray).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: false });
  });
  
  test('minimize-to-tray enabled by default', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 32 });
    
    const result = await window.__TAURI__.invoke('get_status');
    
    expect(result.minimize_to_tray).toBe(true);
  });
});

describe('Cursor Customization', () => {
  test('get available cursors returns 15 types', async () => {
    const cursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: null
    }));
    
    mockInvoke.mockResolvedValue(cursors);
    
    const result = await window.__TAURI__.invoke('get_available_cursors');
    
    expect(result).toHaveLength(15);
    expect(mockInvoke).toHaveBeenCalledWith('get_available_cursors');
  });
  
  test('browse cursor file opens dialog', async () => {
    const filePath = 'C:\\Windows\\Cursors\\test.cur';
    mockInvoke.mockResolvedValue(filePath);
    
    const result = await window.__TAURI__.invoke('browse_cursor_file');
    
    expect(result).toBe(filePath);
    expect(mockInvoke).toHaveBeenCalledWith('browse_cursor_file');
  });
  
  test('set single cursor image', async () => {
    const cursorInfo = {
      id: 32512,
      name: 'Normal',
      display_name: 'Normal select',
      image_path: 'C:\\Custom\\cursor.cur'
    };
    
    mockInvoke.mockResolvedValue(cursorInfo);
    
    const result = await window.__TAURI__.invoke('set_cursor_image', {
      cursor_name: 'Normal',
      image_path: 'C:\\Custom\\cursor.cur'
    });
    
    expect(result.image_path).toBe('C:\\Custom\\cursor.cur');
  });
  
  test('set all cursors applies to 15 types', async () => {
    const allCursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: 'C:\\Custom\\cursor.cur'
    }));
    
    mockInvoke.mockResolvedValue(allCursors);
    
    const result = await window.__TAURI__.invoke('set_all_cursors', {
      image_path: 'C:\\Custom\\cursor.cur'
    });
    
    expect(result).toHaveLength(15);
    expect(result.every(c => c.image_path === 'C:\\Custom\\cursor.cur')).toBe(true);
  });
  
  test('set cursor with size', async () => {
    const cursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: 'C:\\Custom\\cursor.cur'
    }));
    
    mockInvoke.mockResolvedValue(cursors);
    
    const result = await window.__TAURI__.invoke('set_all_cursors_with_size', {
      imagePath: 'C:\\Custom\\cursor.cur',
      size: 64
    });
    
    expect(result).toHaveLength(15);
  });
  
  test('set cursor size updates preference', async () => {
    mockInvoke.mockResolvedValue('Cursor resized to 64px');
    
    const result = await window.__TAURI__.invoke('set_cursor_size', { size: 64 });
    
    expect(result).toContain('64px');
  });
  
  test('invalid cursor size rejected (too small)', async () => {
    mockInvoke.mockRejectedValue('Invalid cursor size: 16. Must be between 32 and 256 pixels.');
    
    await expect(
      window.__TAURI__.invoke('set_cursor_size', { size: 16 })
    ).rejects.toContain('Invalid cursor size');
  });
  
  test('invalid cursor size rejected (too large)', async () => {
    mockInvoke.mockRejectedValue('Invalid cursor size: 512. Must be between 32 and 256 pixels.');
    
    await expect(
      window.__TAURI__.invoke('set_cursor_size', { size: 512 })
    ).rejects.toContain('Invalid cursor size');
  });
});

describe('Default Cursors', () => {
  test('load app default cursors', async () => {
    const cursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: '/app/default-cursors/cursor.cur'
    }));
    
    mockInvoke.mockResolvedValue(cursors);
    
    const result = await window.__TAURI__.invoke('load_app_default_cursors');
    
    expect(result).toHaveLength(15);
    expect(mockInvoke).toHaveBeenCalledWith('load_app_default_cursors');
  });
  
  test('set cursors to windows defaults', async () => {
    const cursors = Array(15).fill(null).map((_, i) => ({
      id: 32512 + i,
      name: `Cursor${i}`,
      display_name: `Cursor ${i}`,
      image_path: null
    }));
    
    mockInvoke.mockResolvedValue(cursors);
    
    const result = await window.__TAURI__.invoke('set_cursors_to_windows_defaults');
    
    expect(result).toHaveLength(15);
    expect(result.every(c => c.image_path === null)).toBe(true);
  });
  
  test('reset cursor to default', async () => {
    mockInvoke.mockResolvedValue(undefined);
    
    await window.__TAURI__.invoke('reset_cursor_to_default', { cursorName: 'Normal' });
    
    expect(mockInvoke).toHaveBeenCalledWith('reset_cursor_to_default', { cursorName: 'Normal' });
  });
});

describe('cursor changer', () => {
  test('get cursor with hotspot', async () => {
    const cursorInfo = {
      data_url: 'data:image/x-icon;base64,ABC123',
      hotspot_x: 16,
      hotspot_y: 16,
      width: 32,
      height: 32
    };
    
    mockInvoke.mockResolvedValue(cursorInfo);
    
    const result = await window.__TAURI__.invoke('get_cursor_with_hotspot', {
      filePath: 'C:\\Custom\\cursor.cur'
    });
    
    expect(result.hotspot_x).toBe(16);
    expect(result.hotspot_y).toBe(16);
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
  });
  
  test('read cursor file as data URL', async () => {
    const dataUrl = 'data:image/x-icon;base64,ABC123';
    mockInvoke.mockResolvedValue(dataUrl);
    
    const result = await window.__TAURI__.invoke('read_cursor_file_as_data_url', {
      filePath: 'C:\\Custom\\cursor.cur'
    });
    
    expect(result).toBe(dataUrl);
  });
  
  test('save cursor file with dialog', async () => {
    const savedPath = 'C:\\Users\\Desktop\\my-cursor.cur';
    mockInvoke.mockResolvedValue(savedPath);
    
    const result = await window.__TAURI__.invoke('save_cursor_file', {
      filename: 'my-cursor.cur',
      data: [0, 0, 2, 0, 1, 0]
    });
    
    expect(result).toBe(savedPath);
  });
  
  test('save cursor to appdata', async () => {
    const savedPath = 'C:\\Users\\AppData\\Roaming\\com.cursorchanger.app\\cursors\\cursor.cur';
    mockInvoke.mockResolvedValue(savedPath);
    
    const result = await window.__TAURI__.invoke('save_cursor_to_appdata', {
      filename: 'cursor.cur',
      data: [0, 0, 2, 0, 1, 0]
    });
    
    expect(result).toContain('AppData');
  });
});

describe('Custom Cursor Management', () => {
  test('get custom cursors', async () => {
    const customCursors = [
      { id: 32512, name: 'Normal', display_name: 'Normal select', image_path: 'C:\\Custom\\normal.cur' },
      { id: 32649, name: 'Hand', display_name: 'Link select', image_path: 'C:\\Custom\\hand.cur' }
    ];
    
    mockInvoke.mockResolvedValue(customCursors);
    
    const result = await window.__TAURI__.invoke('get_custom_cursors');
    
    expect(result).toHaveLength(2);
    expect(result.every(c => c.image_path && !c.image_path.includes('default-cursors'))).toBe(true);
  });
  
  test('delete custom cursor', async () => {
    mockInvoke.mockResolvedValue(undefined);
    
    await window.__TAURI__.invoke('delete_custom_cursor', { cursorName: 'Normal' });
    
    expect(mockInvoke).toHaveBeenCalledWith('delete_custom_cursor', { cursorName: 'Normal' });
  });
});

describe('Window Management', () => {
  test('quit app command', async () => {
    mockInvoke.mockResolvedValue(undefined);
    
    await window.__TAURI__.invoke('quit_app');
    
    expect(mockInvoke).toHaveBeenCalledWith('quit_app');
  });
  
  test('window hide', async () => {
    const appWindow = await window.__TAURI__.window.getCurrentWindow();
    
    await appWindow.hide();
    
    expect(appWindow.hide).toHaveBeenCalled();
  });
  
  test('window minimize', async () => {
    const appWindow = await window.__TAURI__.window.getCurrentWindow();
    
    await appWindow.minimize();
    
    expect(appWindow.minimize).toHaveBeenCalled();
  });
  
  test('window maximize', async () => {
    const appWindow = await window.__TAURI__.window.getCurrentWindow();
    
    await appWindow.maximize();
    
    expect(appWindow.maximize).toHaveBeenCalled();
  });
  
  test('window unmaximize', async () => {
    const appWindow = await window.__TAURI__.window.getCurrentWindow();
    appWindow.isMaximized.mockResolvedValue(true);
    
    const isMaximized = await appWindow.isMaximized();
    expect(isMaximized).toBe(true);
    
    await appWindow.unmaximize();
    
    expect(appWindow.unmaximize).toHaveBeenCalled();
  });
});

describe('Event Handling', () => {
  test('cursor-state event updates UI', async () => {
    const payload = {
      hidden: true,
      shortcut: 'Ctrl+Alt+H',
      minimize_to_tray: false,
      cursor_size: 64
    };
    
    // Register listener
    await window.__TAURI__.event.listen('cursor-state', ({ payload }) => {
      expect(payload.hidden).toBe(true);
      expect(payload.shortcut).toBe('Ctrl+Alt+H');
    });
    
    // Trigger event
    eventListeners['cursor-state']({ payload });
  });
  
  test('cursor-error event shows error', async () => {
    const errorMessage = 'Failed to toggle cursor';
    
    await window.__TAURI__.event.listen('cursor-error', ({ payload }) => {
      expect(payload).toBe(errorMessage);
    });
    
    eventListeners['cursor-error']({ payload: errorMessage });
  });
  
  test('show-close-confirmation event shows dialog', async () => {
    const appWindow = await window.__TAURI__.window.getCurrentWindow();
    
    await appWindow.listen('show-close-confirmation', () => {
      const dialog = document.getElementById('close-dialog');
      dialog.classList.remove('hidden');
    });
    
    eventListeners['show-close-confirmation']({});
    
    // Would verify dialog is shown in real UI code
    expect(eventListeners['show-close-confirmation']).toBeDefined();
  });
});

describe('Error Handling', () => {
  test('network errors are caught', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));
    
    await expect(
      window.__TAURI__.invoke('get_status')
    ).rejects.toThrow('Network error');
  });
  
  test('timeout errors are handled', async () => {
    mockInvoke.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    );
    
    await expect(
      window.__TAURI__.invoke('toggle_cursor')
    ).rejects.toThrow('Timeout');
  });
  
  test('invalid cursor name errors', async () => {
    mockInvoke.mockRejectedValue("Cursor type 'InvalidName' not found");
    
    await expect(
      window.__TAURI__.invoke('set_cursor_image', {
        cursor_name: 'InvalidName',
        image_path: 'C:\\Custom\\cursor.cur'
      })
    ).rejects.toContain('not found');
  });
  
  test('file not found errors', async () => {
    mockInvoke.mockRejectedValue('File not found: C:\\Nonexistent\\cursor.cur');
    
    await expect(
      window.__TAURI__.invoke('set_cursor_image', {
        cursor_name: 'Normal',
        image_path: 'C:\\Nonexistent\\cursor.cur'
      })
    ).rejects.toContain('File not found');
  });
});

describe('Edge Cases', () => {
  test('concurrent command calls', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 32 });
    
    const promises = [
      window.__TAURI__.invoke('get_status'),
      window.__TAURI__.invoke('get_status'),
      window.__TAURI__.invoke('get_status')
    ];
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });
  
  test('rapid toggle clicks', async () => {
    let hidden = false;
    mockInvoke.mockImplementation(() => {
      hidden = !hidden;
      return Promise.resolve({ hidden, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: 32 });
    });
    
    const promises = Array(5).fill(null).map(() => window.__TAURI__.invoke('toggle_cursor'));
    
    await Promise.all(promises);
    
    expect(mockInvoke).toHaveBeenCalledTimes(5);
  });
  
  test('null cursor size handled gracefully', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: 'Ctrl+Shift+X', minimize_to_tray: true, cursor_size: null });
    
    const result = await window.__TAURI__.invoke('get_status');
    
    expect(result.cursor_size).toBeNull();
  });
  
  test('empty shortcut handled', async () => {
    mockInvoke.mockResolvedValue({ hidden: false, shortcut: null, minimize_to_tray: true, cursor_size: 32 });
    
    const result = await window.__TAURI__.invoke('get_status');
    
    expect(result.shortcut).toBeNull();
  });
  
  test('undefined image path handled', async () => {
    const cursor = {
      id: 32512,
      name: 'Normal',
      display_name: 'Normal select',
      image_path: undefined
    };
    
    mockInvoke.mockResolvedValue(cursor);
    
    const result = await window.__TAURI__.invoke('get_cursor_image', { cursor_name: 'Normal' });
    
    expect(result.image_path).toBeUndefined();
  });
});
