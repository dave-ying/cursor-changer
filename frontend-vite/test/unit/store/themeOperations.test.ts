import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyAccentColor, applyTheme, createThemeOperations } from '@/store/operations/themeOperations';
import { Commands } from '@/tauri/commands';

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('themeOperations', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applyAccentColor sets theme-related CSS variables', () => {
    applyAccentColor('#ff0000');

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--color-ring')).toBe('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#ff0000');
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#ff0000');
  });

  it('applyTheme applies explicit light/dark mode classes', () => {
    document.documentElement.classList.add('dark');
    applyTheme('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('applyTheme(system) uses matchMedia to select dark/light', () => {
    const mmSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any);

    applyTheme('system');

    expect(mmSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('setAccentColor updates local state + DOM, and does not commit when commit=false', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const getTauri = () => ({ invoke, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setAccentColor('#00ff00', { commit: false });

    expect(updateCursorState).toHaveBeenCalledWith({ accentColor: '#00ff00' });
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#00ff00');

    expect(invoke).not.toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('setAccentColor(commit=true) commits to backend and shows success toast', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const getTauri = () => ({ invoke, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setAccentColor('#123456', { commit: true });

    expect(invoke).toHaveBeenCalledWith(Commands.setAccentColor, { color: '#123456' });
    expect(showMessage).toHaveBeenCalledWith('Accent color updated', 'success');
  });

  it('setAccentColor(commit=true) returns early when invoke is not available', async () => {
    const getTauri = () => ({ invoke: null, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setAccentColor('#abcdef', { commit: true });

    expect(updateCursorState).toHaveBeenCalledWith({ accentColor: '#abcdef' });
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#abcdef');
    expect(showMessage).not.toHaveBeenCalled();
  });

  it('setAccentColor(commit=true) reports errors via showMessage', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoke = vi.fn().mockRejectedValue(new Error('persist failed'));
    const getTauri = () => ({ invoke, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setAccentColor('#ff00ff', { commit: true });

    const errCalls = showMessage.mock.calls.filter((c) => c[1] === 'error');
    expect(errCalls.length).toBeGreaterThan(0);
    expect(String(errCalls[errCalls.length - 1][0])).toContain('Failed to set accent color:');

    consoleErrorSpy.mockRestore();
  });

  it('setThemeMode normalizes invalid values, applies DOM class, and commits when invoke is available', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const getTauri = () => ({ invoke, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setThemeMode('not-a-real-mode');

    expect(updateCursorState).toHaveBeenCalledWith({ themeMode: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    expect(invoke).toHaveBeenCalledWith(Commands.setThemeMode, { theme_mode: 'dark' });
    expect(showMessage).toHaveBeenCalledWith('Theme updated', 'success');
  });

  it('setThemeMode still shows success when invoke is not available', async () => {
    const getTauri = () => ({ invoke: null, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setThemeMode('light');

    expect(updateCursorState).toHaveBeenCalledWith({ themeMode: 'light' });
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(showMessage).toHaveBeenCalledWith('Theme updated', 'success');
  });

  it('setThemeMode reports save failures via warning message (but keeps local theme applied)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invoke = vi.fn().mockRejectedValue(new Error('save failed'));
    const getTauri = () => ({ invoke, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
    const updateCursorState = vi.fn();
    const showMessage = vi.fn();

    const ops = createThemeOperations(getTauri as any, updateCursorState as any, showMessage as any);

    await ops.setThemeMode('light');

    expect(updateCursorState).toHaveBeenCalledWith({ themeMode: 'light' });
    expect(document.documentElement.classList.contains('light')).toBe(true);

    const warnCalls = showMessage.mock.calls.filter((c) => c[1] === 'warning');
    expect(warnCalls.length).toBeGreaterThan(0);
    expect(String(warnCalls[warnCalls.length - 1][0])).toContain('Failed to save theme preference:');

    consoleErrorSpy.mockRestore();
  });
});
