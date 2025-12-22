/**
 * Common test utilities and helpers for frontend tests
 */

import { vi } from 'vitest';
import * as React from 'react';

// Common mock setup for Tauri API
export interface MockTauriSetup {
  mockInvoke: ReturnType<typeof vi.fn>;
  mockListen: ReturnType<typeof vi.fn>;
  mockEventCallbacks: Record<string, Function>;
}

export function createMockTauriSetup(): MockTauriSetup {
  const mockEventCallbacks: Record<string, Function> = {};
  
  const mockListen = vi.fn((event, callback) => {
    mockEventCallbacks[event] = callback;
    return Promise.resolve();
  });

  const mockInvoke = vi.fn();
  
  return {
    mockInvoke,
    mockListen,
    mockEventCallbacks
  };
}

// Common app state snapshot for tests
export const defaultAppStateSnapshot = {
  hidden: false,
  shortcut: 'Ctrl+Shift+X',
  cursor_size: 32,
  minimize_to_tray: true,
  run_on_startup: false,
  godzilla_mode: false,
  cursor_paths: {}
};

// Common mock cursors for tests
export const defaultMockCursors = [
  { name: 'Normal', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
  { name: 'IBeam', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
  { name: 'Hand', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
  { name: 'Wait', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 }
];

// Common mock library for tests
export const defaultMockLibrary = [
  { id: 'lib_1', name: 'Custom Arrow', file_path: 'C:\\cursor1.cur', hotspot_x: 0, hotspot_y: 0 },
  { id: 'lib_2', name: 'Custom Hand', file_path: 'C:\\cursor2.cur', hotspot_x: 5, hotspot_y: 5 }
];

// Helper to reset all mocks before each test
export function resetAllMocks() {
  vi.clearAllMocks();
}

// Helper to create mock context
export function createMockAppContext(overrides: Partial<any> = {}) {
  return {
    cursorState: {
      shortcut: 'Ctrl+Shift+X',
      shortcutEnabled: false,
      ...overrides.cursorState
    },
    operations: {
      setHotkey: vi.fn(),
      setShortcutEnabled: vi.fn(),
      ...overrides.operations
    },
    recording: false,
    setRecording: vi.fn(),
    capturedShortcut: null,
    setCapturedShortcut: vi.fn(),
    originalShortcut: null,
    setOriginalShortcut: vi.fn(),
    invoke: vi.fn(),
    ...overrides
  };
}
