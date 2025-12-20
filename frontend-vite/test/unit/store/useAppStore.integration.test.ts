import { describe, it, expect, beforeEach, vi } from 'vitest';

type AppStoreModule = typeof import('@/store/useAppStore');

describe('useAppStore integration', () => {
  let useAppStore: AppStoreModule['useAppStore'];

  const importFreshStore = async () => {
    vi.resetModules();
    const storeModule: AppStoreModule = await import('@/store/useAppStore');
    useAppStore = storeModule.useAppStore;
  };

  const mockTauri = (overrides: Partial<NonNullable<ReturnType<typeof useAppStore.getState>['tauri']>> = {}) => ({
    invoke: vi.fn(),
    listen: vi.fn().mockResolvedValue(() => {}),
    getAppWindow: vi.fn(),
    ...overrides
  });

  beforeEach(async () => {
    await importFreshStore();
  });

  it('filters invalid cursor paths when loading status payloads', async () => {
    const tauriInvoke = vi.fn().mockResolvedValue({
      cursor_paths: { Normal: 'C:\\cursors\\arrow.cur', IBeam: 42 },
      theme_mode: 'light',
      accent_color: '#ffffff',
      hidden: false,
      shortcut: 'Ctrl+Shift+X',
      shortcut_enabled: true,
      cursor_size: 48,
      minimize_to_tray: true,
      run_on_startup: false,
      last_loaded_cursor_path: null,
      default_cursor_style: 'windows'
    });

    useAppStore.setState(
      (state) => ({
        ...state,
        tauri: mockTauri({ invoke: tauriInvoke })
      }),
      true
    );

    await useAppStore.getState().operations.loadStatus();

    expect(tauriInvoke).toHaveBeenCalledWith('get_status');
    expect(useAppStore.getState().cursorState.cursorPaths).toEqual({
      Normal: 'C:\\cursors\\arrow.cur'
    });
    expect(useAppStore.getState().cursorState.cursorSize).toBe(48);
    expect(useAppStore.getState().cursorState.themeMode).toBe('light');
  });

  it('updates tray and startup toggles via settings operations', async () => {
    const tauriInvoke = vi.fn().mockResolvedValue({});

    useAppStore.setState(
      (state) => ({
        ...state,
        tauri: mockTauri({ invoke: tauriInvoke })
      }),
      true
    );

    await useAppStore.getState().operations.setMinimizeToTray(false);
    expect(tauriInvoke).toHaveBeenCalledWith('set_minimize_to_tray', { enable: false });
    expect(useAppStore.getState().cursorState.minimizeToTray).toBe(false);

    await useAppStore.getState().operations.setRunOnStartup(true);
    expect(tauriInvoke).toHaveBeenCalledWith('set_run_on_startup', { enable: true });
    expect(useAppStore.getState().cursorState.runOnStartup).toBe(true);
    expect(useAppStore.getState().message).toEqual({ text: '', type: '' });
  });

  it('resetAllSettings applies payload and notifies subscribers', async () => {
    const resetPayload = {
      hidden: false,
      shortcut: 'Ctrl+Alt+Z',
      shortcut_enabled: true,
      cursor_size: 40,
      minimize_to_tray: false,
      run_on_startup: true,
      cursor_paths: { Normal: 'C:\\reset\\arrow.cur' },
      accent_color: '#111111',
      theme_mode: 'light',
      default_cursor_style: 'mac'
    };

    const tauriInvoke = vi.fn((cmd: string) => {
      switch (cmd) {
        case 'reset_all_settings':
          return Promise.resolve(resetPayload);
        case 'reset_window_size_to_default':
          return Promise.resolve(undefined);
        case 'get_available_cursors':
          return Promise.resolve([{ name: 'Normal', display_name: 'Normal pointer', image_path: null }]);
        default:
          return Promise.resolve(undefined);
      }
    });

    useAppStore.setState(
      (state) => ({
        ...state,
        tauri: mockTauri({ invoke: tauriInvoke as ReturnType<typeof mockTauri>['invoke'] })
      }),
      true
    );

    const themeUpdates: string[] = [];
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.cursorState.themeMode !== prevState.cursorState.themeMode) {
        themeUpdates.push(state.cursorState.themeMode);
      }
    });

    await useAppStore.getState().operations.resetAllSettings();

    unsubscribe();

    expect(tauriInvoke).toHaveBeenCalledWith('reset_all_settings');
    expect(tauriInvoke).toHaveBeenCalledWith('reset_window_size_to_default');
    expect(tauriInvoke).toHaveBeenCalledWith('get_available_cursors');

    expect(useAppStore.getState().cursorState).toMatchObject({
      cursorSize: 40,
      minimizeToTray: false,
      runOnStartup: true,
      cursorPaths: { Normal: 'C:\\reset\\arrow.cur' },
      defaultCursorStyle: 'mac',
      themeMode: 'light'
    });

    expect(useAppStore.getState().availableCursors).toHaveLength(1);
    expect(themeUpdates).toContain('light');
    expect(useAppStore.getState().message).toEqual({ text: '', type: '' });
  });
});
