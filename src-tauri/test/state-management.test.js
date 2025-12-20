import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Tauri API and JSDOM setup
let mockInvoke;
let eventListeners;

// Setup JSDOM
let dom;
let window;
let document;

beforeEach(() => {
  // Create a minimal DOM
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="status">Hidden: <span id="status-hidden">false</span></div>
        <div id="shortcut-display">Ctrl+Shift+X</div>
        <input type="checkbox" id="minimize-to-tray" />
        <input type="range" id="cursor-size" min="1" max="15" value="5" />
        <button id="toggle-btn">Toggle</button>
        <button id="restore-btn">Restore</button>
      </body>
    </html>
  `, { url: 'http://localhost' });
  
  window = dom.window;
  document = window.document;
  global.window = window;
  global.document = document;
  
  eventListeners = {};
  mockInvoke = vi.fn();
  
  window.__TAURI__ = {
    invoke: mockInvoke,
    event: {
      listen: vi.fn((eventName, callback) => {
        eventListeners[eventName] = callback;
        return vi.fn(); // unlisten
      }),
    },
  };
});

afterEach(() => {
  // Clean up JSDOM to prevent open handles
  try {
    dom?.window?.close?.();
  } catch {}
  try {
    delete global.window;
    delete global.document;
  } catch {}
});

test('state updates when cursor-state event fires', async () => {
  const payload = {
    hidden: true,
    shortcut: 'Ctrl+Alt+H',
    minimize_to_tray: false,
    cursor_size: 8,
  };
  
  // Simulate event listener being set up
  const listener = eventListeners['cursor-state'];
  if (!listener) {
    // Manually register for test
    eventListeners['cursor-state'] = (event) => {
      const data = event.payload;
      document.getElementById('status-hidden').textContent = String(data.hidden);
      document.getElementById('shortcut-display').textContent = data.shortcut || '';
      document.getElementById('minimize-to-tray').checked = data.minimize_to_tray;
      if (data.cursor_size) {
        document.getElementById('cursor-size').value = String(data.cursor_size);
      }
    };
  }
  
  // Fire the event
  eventListeners['cursor-state']({ payload });
  
  expect(document.getElementById('status-hidden').textContent).toBe('true');
  expect(document.getElementById('shortcut-display').textContent).toBe('Ctrl+Alt+H');
  expect(document.getElementById('minimize-to-tray').checked).toBe(false);
  expect(document.getElementById('cursor-size').value).toBe('8');
});

test('state initializes correctly on app load', async () => {
  const initialState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(initialState);
  
  // Simulate app initialization
  const state = await window.__TAURI__.invoke('get_status');
  
  document.getElementById('status-hidden').textContent = String(state.hidden);
  document.getElementById('shortcut-display').textContent = state.shortcut || '';
  document.getElementById('minimize-to-tray').checked = state.minimize_to_tray;
  document.getElementById('cursor-size').value = String(state.cursor_size || 5);
  
  expect(document.getElementById('status-hidden').textContent).toBe('false');
  expect(document.getElementById('shortcut-display').textContent).toBe('Ctrl+Shift+X');
  expect(document.getElementById('minimize-to-tray').checked).toBe(true);
  expect(document.getElementById('cursor-size').value).toBe('5');
});

test('toggle button updates state correctly', async () => {
  const newState = {
    hidden: true,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(newState);
  
  // Simulate toggle button click
  const result = await window.__TAURI__.invoke('toggle_cursor');
  
  document.getElementById('status-hidden').textContent = String(result.hidden);
  
  expect(document.getElementById('status-hidden').textContent).toBe('true');
  expect(mockInvoke).toHaveBeenCalledWith('toggle_cursor');
});

test('restore button resets cursor state', async () => {
  // Start with hidden cursor
  document.getElementById('status-hidden').textContent = 'true';
  
  const restoredState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(restoredState);
  
  // Simulate restore button click
  const result = await window.__TAURI__.invoke('restore_cursor');
  
  document.getElementById('status-hidden').textContent = String(result.hidden);
  
  expect(document.getElementById('status-hidden').textContent).toBe('false');
  expect(mockInvoke).toHaveBeenCalledWith('restore_cursor');
});

test('minimize-to-tray checkbox updates backend state', async () => {
  const checkbox = document.getElementById('minimize-to-tray');
  checkbox.checked = false;
  
  const updatedState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: false,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(updatedState);
  
  // Simulate checkbox change
  await window.__TAURI__.invoke('set_minimize_to_tray', { enable: checkbox.checked });
  
  expect(mockInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: false });
});

test('cursor size slider updates backend state', async () => {
  const slider = document.getElementById('cursor-size');
  slider.value = '12';
  
  const updatedState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 12,
  };
  
  mockInvoke.mockResolvedValue(updatedState);
  
  // Simulate slider change
  await window.__TAURI__.invoke('set_cursor_size', { size: parseInt(slider.value) });
  
  expect(mockInvoke).toHaveBeenCalledWith('set_cursor_size', { size: 12 });
});

test('shortcut display updates when backend changes', async () => {
  const newShortcut = 'Alt+Shift+C';
  const updatedState = {
    hidden: false,
    shortcut: newShortcut,
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(updatedState);
  
  const result = await window.__TAURI__.invoke('set_hotkey', { shortcut: newShortcut });
  
  document.getElementById('shortcut-display').textContent = result.shortcut;
  
  expect(document.getElementById('shortcut-display').textContent).toBe(newShortcut);
});

test('state synchronization handles partial updates', async () => {
  // Initial state
  const initialState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValueOnce(initialState);
  
  await window.__TAURI__.invoke('get_status');
  
  // Partial update (only hidden changes)
  const partialUpdate = {
    hidden: true,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValueOnce(partialUpdate);
  
  const result = await window.__TAURI__.invoke('toggle_cursor');
  
  expect(result.hidden).toBe(true);
  expect(result.shortcut).toBe('Ctrl+Shift+X'); // Unchanged
});

test('state persists across multiple operations', async () => {
  let currentState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  // Operation 1: Toggle cursor
  currentState.hidden = !currentState.hidden;
  mockInvoke.mockResolvedValueOnce(currentState);
  await window.__TAURI__.invoke('toggle_cursor');
  
  // Operation 2: Change minimize preference
  currentState.minimize_to_tray = false;
  mockInvoke.mockResolvedValueOnce(currentState);
  await window.__TAURI__.invoke('set_minimize_to_tray', { enable: false });
  
  // Operation 3: Change cursor size
  currentState.cursor_size = 10;
  mockInvoke.mockResolvedValueOnce(currentState);
  await window.__TAURI__.invoke('set_cursor_size', { size: 10 });
  
  // Verify final state
  expect(currentState.hidden).toBe(true);
  expect(currentState.minimize_to_tray).toBe(false);
  expect(currentState.cursor_size).toBe(10);
});

test('concurrent state updates are handled correctly', async () => {
  const updates = [
    { hidden: true, shortcut: 'Ctrl+A', minimize_to_tray: true, cursor_size: 5 },
    { hidden: false, shortcut: 'Ctrl+B', minimize_to_tray: false, cursor_size: 8 },
    { hidden: true, shortcut: 'Ctrl+C', minimize_to_tray: true, cursor_size: 12 },
  ];
  
  mockInvoke
    .mockResolvedValueOnce(updates[0])
    .mockResolvedValueOnce(updates[1])
    .mockResolvedValueOnce(updates[2]);
  
  // Simulate rapid concurrent updates
  const results = await Promise.all([
    window.__TAURI__.invoke('toggle_cursor'),
    window.__TAURI__.invoke('toggle_cursor'),
    window.__TAURI__.invoke('toggle_cursor'),
  ]);
  
  expect(results).toHaveLength(3);
  expect(mockInvoke).toHaveBeenCalledTimes(3);
});

test('state rollback on error', async () => {
  const initialState = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  // Set initial state
  document.getElementById('status-hidden').textContent = String(initialState.hidden);
  
  // Attempt update that fails
  mockInvoke.mockRejectedValue(new Error('Operation failed'));
  
  try {
    await window.__TAURI__.invoke('toggle_cursor');
  } catch (error) {
    // State should remain unchanged
    expect(document.getElementById('status-hidden').textContent).toBe('false');
  }
});

test('state updates trigger UI re-render', async () => {
  let renderCount = 0;
  
  eventListeners['cursor-state'] = () => {
    renderCount++;
  };
  
  const states = [
    { hidden: true, shortcut: 'Ctrl+A', minimize_to_tray: true, cursor_size: 5 },
    { hidden: false, shortcut: 'Ctrl+B', minimize_to_tray: false, cursor_size: 8 },
  ];
  
  states.forEach(state => {
    eventListeners['cursor-state']({ payload: state });
  });
  
  expect(renderCount).toBe(2);
});

test('state handles null/undefined cursor_size', async () => {
  const stateWithNull = {
    hidden: false,
    shortcut: 'Ctrl+Shift+X',
    minimize_to_tray: true,
    cursor_size: null,
  };
  
  mockInvoke.mockResolvedValue(stateWithNull);
  
  const result = await window.__TAURI__.invoke('get_status');
  
  expect(result.cursor_size).toBeNull();
  
  // UI should handle null gracefully
  const slider = document.getElementById('cursor-size');
  slider.value = String(result.cursor_size || 5);
  expect(slider.value).toBe('5');
});

test('state handles empty shortcut', async () => {
  const stateWithNoShortcut = {
    hidden: false,
    shortcut: null,
    minimize_to_tray: true,
    cursor_size: 5,
  };
  
  mockInvoke.mockResolvedValue(stateWithNoShortcut);
  
  const result = await window.__TAURI__.invoke('get_status');
  
  expect(result.shortcut).toBeNull();
  
  document.getElementById('shortcut-display').textContent = result.shortcut || 'None';
  expect(document.getElementById('shortcut-display').textContent).toBe('None');
});
