import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCursorSelection } from '@/components/CursorCustomization/hooks/useCursorSelection';
import { Commands } from '@/tauri/commands';

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCursorSelection', () => {
  let invokeMock: ReturnType<typeof vi.fn<(command: string, args?: any) => Promise<any>>>;
  let loadAvailableCursorsMock: ReturnType<typeof vi.fn<() => Promise<void>>>;
  let showMessageMock: ReturnType<typeof vi.fn<(message: string, type?: any) => void>>;

  let invoke: (command: string, params?: any) => Promise<any>;
  let loadAvailableCursors: () => Promise<void>;
  let showMessage: (message: string, type?: any) => void;

  beforeEach(() => {
    invokeMock = vi.fn<(command: string, args?: any) => Promise<any>>().mockResolvedValue(undefined);
    loadAvailableCursorsMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    showMessageMock = vi.fn<(message: string, type?: any) => void>();

    invoke = invokeMock as unknown as (command: string, params?: any) => Promise<any>;
    loadAvailableCursors = loadAvailableCursorsMock as unknown as () => Promise<void>;
    showMessage = showMessageMock as unknown as (message: string, type?: any) => void;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createHandleModeChange skips when the requested mode equals current mode', async () => {
    const { result } = renderHook(() => useCursorSelection('simple'));

    const handleModeChange = result.current.createHandleModeChange(invoke, loadAvailableCursors, showMessage);

    await act(async () => {
      await handleModeChange('simple');
    });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(loadAvailableCursorsMock).not.toHaveBeenCalled();
    expect(result.current.customizationMode).toBe('simple');
  });

  it('createHandleModeChange switches modes and reloads available cursors', async () => {
    const { result } = renderHook(() => useCursorSelection('simple'));

    const handleModeChange = result.current.createHandleModeChange(invoke, loadAvailableCursors, showMessage);

    await act(async () => {
      await handleModeChange('advanced');
    });

    expect(invokeMock).toHaveBeenCalledWith(Commands.switchCustomizationMode, { mode: 'advanced' });
    expect(loadAvailableCursorsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.customizationMode).toBe('advanced');
    });
  });

  it('createHandleModeChange handles invoke errors without changing mode', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    invokeMock.mockRejectedValueOnce(new Error('backend failed'));

    const { result } = renderHook(() => useCursorSelection('simple'));

    const handleModeChange = result.current.createHandleModeChange(invoke, loadAvailableCursors, showMessage);

    await act(async () => {
      await handleModeChange('advanced');
    });

    expect(loadAvailableCursorsMock).not.toHaveBeenCalled();
    expect(result.current.customizationMode).toBe('simple');

    consoleErrorSpy.mockRestore();
  });

  it('handleSelectFromLibrary sets pending + selected cursor, and clears when null', async () => {
    const { result } = renderHook(() => useCursorSelection('simple'));

    const lib = { name: 'Lib Cursor', file_path: 'C:\\lib.cur' };

    await act(async () => {
      await result.current.handleSelectFromLibrary(lib as any);
    });

    expect(result.current.pendingLibraryCursor).toEqual(lib);
    expect(result.current.selectedLibraryCursor).toEqual(lib);

    await act(async () => {
      await result.current.handleSelectFromLibrary(null);
    });

    expect(result.current.pendingLibraryCursor).toBe(null);
    expect(result.current.selectedLibraryCursor).toBe(null);
  });

  it('handleApplyPendingCursor applies the library cursor, reloads, and exits reverse-selection mode', async () => {
    const { result } = renderHook(() => useCursorSelection('simple'));

    const lib = { name: 'Lib Cursor', file_path: 'C:\\lib.cur' };
    const target = { name: 'Normal', display_name: 'Normal Pointer' };

    await act(async () => {
      await result.current.handleSelectFromLibrary(lib as any);
    });

    await act(async () => {
      await result.current.handleApplyPendingCursor(
        target as any,
        lib as any,
        { cursorSize: '48' } as any,
        invoke,
        showMessage,
        loadAvailableCursors
      );
    });

    expect(invokeMock).toHaveBeenCalledWith(Commands.setSingleCursorWithSize, {
      cursor_name: 'Normal',
      image_path: 'C:\\lib.cur',
      size: 48,
    });

    expect(loadAvailableCursorsMock).toHaveBeenCalledTimes(1);
    expect(showMessageMock).toHaveBeenCalledWith('Applied Lib Cursor to Normal Pointer', 'success');

    await waitFor(() => {
      expect(result.current.pendingLibraryCursor).toBe(null);
      expect(result.current.selectedLibraryCursor).toBe(null);
    });
  });

  it('handleApplyPendingCursor shows an error and keeps pending selection on failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    invokeMock.mockRejectedValueOnce(new Error('apply failed'));

    const { result } = renderHook(() => useCursorSelection('simple'));

    const lib = { name: 'Lib Cursor', file_path: 'C:\\lib.cur' };
    const target = { name: 'Normal', display_name: 'Normal Pointer' };

    await act(async () => {
      await result.current.handleSelectFromLibrary(lib as any);
    });

    await act(async () => {
      await result.current.handleApplyPendingCursor(
        target as any,
        lib as any,
        { cursorSize: 32 } as any,
        invoke,
        showMessage,
        loadAvailableCursors
      );
    });

    const errorCalls = showMessageMock.mock.calls.filter((c) => c[1] === 'error');
    expect(errorCalls.length).toBeGreaterThan(0);
    expect(String(errorCalls[errorCalls.length - 1][0])).toContain('Failed to apply cursor:');

    expect(result.current.pendingLibraryCursor).toEqual(lib);
    expect(result.current.selectedLibraryCursor).toEqual(lib);

    consoleErrorSpy.mockRestore();
  });

  it('cancelBrowseMode clears selection state and exits browse mode', async () => {
    const { result } = renderHook(() => useCursorSelection('simple'));

    const lib = { name: 'Lib Cursor', file_path: 'C:\\lib.cur' };

    await act(async () => {
      await result.current.handleSelectFromLibrary(lib as any);
    });

    await act(async () => {
      await result.current.handleBrowse(null);
    });

    expect(result.current.selectingCursorForCustomization).toBe(true);

    act(() => {
      result.current.cancelBrowseMode();
    });

    expect(result.current.pendingLibraryCursor).toBe(null);
    expect(result.current.selectedLibraryCursor).toBe(null);
    expect(result.current.selectingCursorForCustomization).toBe(false);
  });
});
