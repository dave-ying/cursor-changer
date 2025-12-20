import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTauri } from '@/hooks/useTauri';

describe('useTauri', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI;
    delete (window as any).__TAURI_INTERNALS__;
    delete (window as any).__TAURI_IPC__;
  });

  it('detects v2-style injected APIs (core.invoke + event.listen + window.getCurrentWindow)', async () => {
    const invoke = vi.fn().mockResolvedValue('ok');
    const listen = vi.fn(async () => () => {});
    const appWindow = { hide: vi.fn(), minimize: vi.fn() };

    (window as any).__TAURI__ = {
      core: { invoke },
      event: { listen },
      window: { getCurrentWindow: () => appWindow }
    };

    const { result } = renderHook(() => useTauri());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.error).toBeNull();

    await result.current.invoke('test_cmd', { cursorName: 'Normal' });
    expect(invoke).toHaveBeenCalledWith('test_cmd', {
      cursorName: 'Normal'
    });

    const win = result.current.getAppWindow();
    expect(win).toBe(appWindow);

    await result.current.listen('evt', () => {});
    expect(listen).toHaveBeenCalled();
  });

  it('falls back to stub APIs when only legacy __TAURI__.tauri.invoke shape is present', async () => {
    vi.useFakeTimers();

    const invoke = vi.fn().mockResolvedValue('ok');
    const listen = vi.fn(async () => () => {});
    const appWindow = { hide: vi.fn(), minimize: vi.fn() };

    // Not supported by the current hook (it only checks __TAURI__.invoke and __TAURI__.core.invoke)
    ;(window as any).__TAURI__ = {
      tauri: { invoke },
      event: { listen },
      appWindow
    };

    const { result } = renderHook(() => useTauri());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeTruthy();

    await expect(result.current.invoke('test_cmd', { cursor_name: 'Normal' }))
      .rejects
      .toThrow('tauri.invoke is not available');

    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls back to stub APIs when only __TAURI_INTERNALS__ is present', async () => {
    vi.useFakeTimers();
    const invoke = vi.fn().mockResolvedValue('ok');
    // tryInjected() requires some injected object to exist; internals are used as a fallback
    // when the injected object doesn't expose invoke directly.
    (window as any).__TAURI__ = {};
    (window as any).__TAURI_INTERNALS__ = { invoke };

    const { result } = renderHook(() => useTauri());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeTruthy();

    await expect(result.current.invoke('test_cmd', { fooBar: 1 }))
      .rejects
      .toThrow('tauri.invoke is not available');

    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls back to stub APIs when no Tauri runtime is detected', async () => {
    vi.useFakeTimers();

    // test/setup.ts installs a default __TAURI__ mock globally. Clear it here to
    // validate the real fallback/stub behavior.
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI;
    delete (globalThis as any).__TAURI__;
    delete (globalThis as any).__TAURI;
    delete (window as any).__TAURI_INTERNALS__;
    delete (window as any).__TAURI_IPC__;

    const { result } = renderHook(() => useTauri());

    // Allow the effect to start, then advance enough time for the polling loop to complete.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeTruthy();

    await expect(result.current.invoke('x')).rejects.toThrow('tauri.invoke is not available');
    await expect(result.current.listen('x', () => {})).rejects.toThrow('event.listen is not available');
    const win = result.current.getAppWindow();
    expect(win).toBeTruthy();
    await expect(win.hide()).rejects.toThrow('appWindow.hide is not available');
  });
});
