/**
 * Unit tests for data loading operations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDataLoadingOperations } from '@/store/operations/dataLoadingOperations';
import type { CursorState, Message, TauriFunctions } from '@/store/useAppStore';

// Mock the theme operations module
vi.mock('@/store/operations/themeOperations', () => ({
  applyTheme: vi.fn(),
  applyAccentColor: vi.fn()
}));

// Mock the cursor preview cache
vi.mock('@/services/cursorPreviewCache', () => ({
  preloadCursorPreviews: vi.fn().mockResolvedValue(undefined)
}));

describe('Data Loading Operations', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockGetAppWindow: ReturnType<typeof vi.fn>;
  let mockShowMessage: ReturnType<typeof vi.fn>;
  let mockUpdateCursorState: ReturnType<typeof vi.fn>;
  let mockSetAvailableCursors: ReturnType<typeof vi.fn>;
  let mockSetLibraryCursors: ReturnType<typeof vi.fn>;
  let mockSetIsMaximized: ReturnType<typeof vi.fn>;
  let operations: ReturnType<typeof createDataLoadingOperations>;

  beforeEach(() => {
    mockInvoke = vi.fn();
    mockGetAppWindow = vi.fn();
    mockShowMessage = vi.fn();
    mockUpdateCursorState = vi.fn();
    mockSetAvailableCursors = vi.fn();
    mockSetLibraryCursors = vi.fn();
    mockSetIsMaximized = vi.fn();

    const getTauri = (): TauriFunctions => ({
      invoke: mockInvoke as unknown as NonNullable<TauriFunctions['invoke']>,
      listen: vi.fn() as any,
      getAppWindow: mockGetAppWindow as unknown as NonNullable<TauriFunctions['getAppWindow']>
    });

    operations = createDataLoadingOperations(
      getTauri,
      mockUpdateCursorState as unknown as (updates: Partial<CursorState>) => void,
      mockSetAvailableCursors as unknown as (cursors: any[]) => void,
      mockSetLibraryCursors as unknown as (cursors: any[]) => void,
      mockSetIsMaximized as unknown as (maximized: boolean) => void,
      mockShowMessage as unknown as (text: string, type?: Message['type']) => void
    );
  });

  describe('loadStatus', () => {
    it('loads status and updates cursor state', async () => {
      const status = {
        cursor_paths: { Normal: 'C:\\cursor.cur' },
        theme_mode: 'light',
        accent_color: '#ff0000',
        hidden: true,
        shortcut: 'Ctrl+Alt+X',
        shortcut_enabled: false,
        cursor_size: 64,
        minimize_to_tray: false,
        run_on_startup: true,
        last_loaded_cursor_path: 'C:\\last.cur',
        default_cursor_style: 'mac'
      };
      mockInvoke.mockResolvedValue(status);

      await operations.loadStatus();

      expect(mockInvoke).toHaveBeenCalledWith('get_status');
      expect(mockUpdateCursorState).toHaveBeenCalledWith({
        hidden: true,
        shortcut: 'Ctrl+Alt+X',
        shortcutEnabled: false,
        cursorSize: 64,
        minimizeToTray: false,
        runOnStartup: true,
        lastLoadedCursorPath: 'C:\\last.cur',
        cursorPaths: { Normal: 'C:\\cursor.cur' },
        accentColor: '#ff0000',
        themeMode: 'light',
        defaultCursorStyle: 'mac'
      });
    });

    it('uses default values for missing fields', async () => {
      mockInvoke.mockResolvedValue({});

      await operations.loadStatus();

      expect(mockUpdateCursorState).toHaveBeenCalledWith({
        hidden: false,
        shortcut: 'Ctrl+Shift+X',
        shortcutEnabled: true,
        cursorSize: 32,
        minimizeToTray: true,
        runOnStartup: false,
        lastLoadedCursorPath: null,
        cursorPaths: {},
        accentColor: '#7c3aed',
        themeMode: 'dark',
        defaultCursorStyle: 'windows'
      });
    });

    it('filters out undefined cursor paths', async () => {
      mockInvoke.mockResolvedValue({
        cursor_paths: { Normal: 'C:\\cursor.cur', IBeam: undefined }
      });

      await operations.loadStatus();

      expect(mockUpdateCursorState).toHaveBeenCalledWith(
        expect.objectContaining({
          cursorPaths: { Normal: 'C:\\cursor.cur' }
        })
      );
    });

    it('shows error message on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Network error'));

      await operations.loadStatus();

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to load status from backend',
        'error'
      );

      consoleError.mockRestore();
    });

    it('does nothing when invoke is not available', async () => {
      const getTauri = (): TauriFunctions => ({ invoke: null, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
      const ops = createDataLoadingOperations(
        getTauri,
        mockUpdateCursorState as unknown as (updates: Partial<CursorState>) => void,
        mockSetAvailableCursors as unknown as (cursors: any[]) => void,
        mockSetLibraryCursors as unknown as (cursors: any[]) => void,
        mockSetIsMaximized as unknown as (maximized: boolean) => void,
        mockShowMessage as unknown as (text: string, type?: Message['type']) => void
      );

      await ops.loadStatus();

      expect(mockUpdateCursorState).not.toHaveBeenCalled();
    });
  });

  describe('loadAvailableCursors', () => {
    it('loads and sets available cursors', async () => {
      const cursors = [
        { name: 'Normal', display_name: 'Normal Pointer', image_path: null },
        { name: 'IBeam', display_name: 'Text Select', image_path: 'C:\\ibeam.cur' }
      ];
      mockInvoke.mockResolvedValue(cursors);

      await operations.loadAvailableCursors();

      expect(mockInvoke).toHaveBeenCalledWith('get_available_cursors');
      expect(mockSetAvailableCursors).toHaveBeenCalledWith(cursors);
    });

    it('handles empty cursor list', async () => {
      mockInvoke.mockResolvedValue([]);

      await operations.loadAvailableCursors();

      expect(mockSetAvailableCursors).toHaveBeenCalledWith([]);
    });

    it('handles non-array response', async () => {
      mockInvoke.mockResolvedValue(null);

      await operations.loadAvailableCursors();

      expect(mockSetAvailableCursors).toHaveBeenCalledWith([]);
    });

    it('sets empty array on error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));

      await operations.loadAvailableCursors();

      expect(mockSetAvailableCursors).toHaveBeenCalledWith([]);

      consoleError.mockRestore();
    });
  });

  describe('loadLibraryCursors', () => {
    it('loads and sets library cursors', async () => {
      const cursors = [
        { id: 'lib_1', name: 'Custom', display_name: 'Custom Cursor', image_path: 'C:\\custom.cur' }
      ];
      mockInvoke.mockResolvedValue(cursors);

      await operations.loadLibraryCursors();

      expect(mockInvoke).toHaveBeenCalledWith('get_library_cursors');
      expect(mockSetLibraryCursors).toHaveBeenCalledWith(cursors);
    });

    it('handles empty library', async () => {
      mockInvoke.mockResolvedValue([]);

      await operations.loadLibraryCursors();

      expect(mockSetLibraryCursors).toHaveBeenCalledWith([]);
    });

    it('handles non-array response', async () => {
      mockInvoke.mockResolvedValue(null);

      await operations.loadLibraryCursors();

      expect(mockSetLibraryCursors).toHaveBeenCalledWith([]);
    });

    it('sets empty array on error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error('Failed'));

      await operations.loadLibraryCursors();

      expect(mockSetLibraryCursors).toHaveBeenCalledWith([]);

      consoleError.mockRestore();
    });
  });

  describe('updateMaximizeState', () => {
    it('updates maximize state from window', async () => {
      const mockWindow = { isMaximized: vi.fn().mockResolvedValue(true) };
      mockGetAppWindow.mockReturnValue(mockWindow);

      await operations.updateMaximizeState();

      expect(mockWindow.isMaximized).toHaveBeenCalled();
      expect(mockSetIsMaximized).toHaveBeenCalledWith(true);
    });

    it('handles non-maximized window', async () => {
      const mockWindow = { isMaximized: vi.fn().mockResolvedValue(false) };
      mockGetAppWindow.mockReturnValue(mockWindow);

      await operations.updateMaximizeState();

      expect(mockSetIsMaximized).toHaveBeenCalledWith(false);
    });

    it('handles errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAppWindow.mockImplementation(() => {
        throw new Error('Window not available');
      });

      // Should not throw
      await operations.updateMaximizeState();

      expect(mockSetIsMaximized).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('does nothing when getAppWindow is not available', async () => {
      const getTauri = (): TauriFunctions => ({
        invoke: mockInvoke as unknown as NonNullable<TauriFunctions['invoke']>,
        listen: vi.fn() as any,
        getAppWindow: null
      });
      const ops = createDataLoadingOperations(
        getTauri,
        mockUpdateCursorState as unknown as (updates: Partial<CursorState>) => void,
        mockSetAvailableCursors as unknown as (cursors: any[]) => void,
        mockSetLibraryCursors as unknown as (cursors: any[]) => void,
        mockSetIsMaximized as unknown as (maximized: boolean) => void,
        mockShowMessage as unknown as (text: string, type?: Message['type']) => void
      );

      await ops.updateMaximizeState();

      expect(mockSetIsMaximized).not.toHaveBeenCalled();
    });
  });
});
