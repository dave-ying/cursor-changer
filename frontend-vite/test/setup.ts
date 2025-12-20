// Minimal setup file for Vitest
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: any) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { }, // Deprecated
    removeListener: () => { }, // Deprecated
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false,
  }),
});

// Create a mock appWindow object
const mockAppWindow = {
  hide: () => Promise.resolve(),
  minimize: () => Promise.resolve(),
  maximize: () => Promise.resolve(),
  unmaximize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  isMaximized: () => Promise.resolve(false),
  isMinimized: () => Promise.resolve(false),
  isVisible: () => Promise.resolve(true),
  setTitle: () => Promise.resolve(),
  listen: () => Promise.resolve(() => { }),
  once: () => Promise.resolve(() => { }),
  emit: () => Promise.resolve(),
};

// Default invoke handler
const defaultInvokeHandler = (cmd: string, _args?: any) => {
  switch (cmd) {
    case 'get_status':
      return Promise.resolve({
        cursor_paths: {},
        theme_mode: 'dark',
        accent_color: '#7c3aed',
        hidden: false,
        shortcut: 'Ctrl+Shift+X',
        shortcut_enabled: true,
        cursor_size: 32,
        minimize_to_tray: true,
        run_on_startup: false
      });
    case 'get_available_cursors':
      return Promise.resolve([
        { name: 'Normal', display_name: 'Normal Pointer', image_path: null }
      ]);
    case 'get_library_cursors':
      return Promise.resolve([
        { id: 'lib_1', name: 'Lib Cursor', display_name: 'Library Cursor', image_path: 'C:\\lib.cur' }
      ]);
    case 'get_library_cursor_preview':
    case 'get_system_cursor_preview':
      return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
    default:
      return Promise.resolve(undefined);
  }
};

// Mock Tauri with complete API surface
const createTauriMock = () => ({
  invoke: defaultInvokeHandler,
  // Top-level listen function (Tauri v2 style)
  listen: () => Promise.resolve(() => { }),
  // Event module
  event: { 
    listen: () => Promise.resolve(() => { }), 
    emit: () => Promise.resolve(),
    once: () => Promise.resolve(() => { }),
  },
  // Window module (Tauri v2 style)
  window: {
    getCurrentWindow: () => mockAppWindow,
    getCurrent: () => mockAppWindow,
    appWindow: mockAppWindow,
  },
  // Direct appWindow reference (Tauri v1 style)
  appWindow: mockAppWindow,
  // Core module (some Tauri versions)
  core: {
    invoke: defaultInvokeHandler,
  },
  // Tauri module (some Tauri versions)
  tauri: {
    invoke: defaultInvokeHandler,
    appWindow: mockAppWindow,
  },
});

// Initialize the mock
(globalThis as any).__TAURI__ = createTauriMock();

if (typeof window !== 'undefined') {
  (window as any).__TAURI__ = (globalThis as any).__TAURI__;
  (window as any).__TAURI_INTERNALS__ = {
    invoke: defaultInvokeHandler,
  };
}

// Suppress console.error for expected Tauri-related warnings during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

function getErrorMessage(args: any[]): string {
  const err = args.find((a) => a instanceof Error) as Error | undefined;
  return err?.message || '';
}

function getCombinedMessage(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      try {
        return String(a);
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

function isAllowedConsoleError(args: any[]): boolean {
  const message = args[0]?.toString() || '';
  const errorMessage = getErrorMessage(args);
  const combinedMessage = getCombinedMessage(args);

  return (
    combinedMessage.includes('not wrapped in act') ||
    combinedMessage.includes('wrap-tests-with-act') ||
    message.includes('tauri.invoke is not available') ||
    message.includes('appWindow is not available') ||
    message.includes('event.listen is not available') ||
    errorMessage.includes('tauri.invoke is not available') ||
    errorMessage.includes('appWindow is not available') ||
    errorMessage.includes('event.listen is not available') ||
    message.startsWith('Failed to listen to') && errorMessage.includes('event.listen is not available') ||
    combinedMessage.includes('tauri.invoke is not available') ||
    combinedMessage.includes('appWindow is not available') ||
    combinedMessage.includes('event.listen is not available') ||
    combinedMessage.includes('[useTauri]') ||
    message.includes('[useTauri]')
  );
}

console.error = (...args: any[]) => {
  if (isAllowedConsoleError(args)) {
    return;
  }

  originalConsoleError.apply(console, args);
  throw new Error(`Unexpected console.error in test: ${getCombinedMessage(args)}`);
};

console.log = (...args: any[]) => {
  const combinedMessage = getCombinedMessage(args);
  if (combinedMessage.includes('[DEBUG]')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Suppress expected Tauri-related warnings in tests
  if (
    message.includes('Failed to load cursor preview') ||
    message.includes('Failed to check maximize state')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Clean up after each test to prevent state leakage
afterEach(() => {
  // Reset the Tauri mock to default state
  (globalThis as any).__TAURI__ = createTauriMock();
  if (typeof window !== 'undefined') {
    (window as any).__TAURI__ = (globalThis as any).__TAURI__;
  }
});