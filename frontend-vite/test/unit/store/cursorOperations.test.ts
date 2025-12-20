/**
 * Unit tests for cursor operations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCursorOperations } from '@/store/operations/cursorOperations';
import type { Message, TauriFunctions } from '@/store/useAppStore';

describe('Cursor Operations', () => {
  let mockInvoke: ReturnType<typeof vi.fn>;
  let mockShowMessage: ReturnType<typeof vi.fn>;
  let operations: ReturnType<typeof createCursorOperations>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    mockInvoke = vi.fn();
    mockShowMessage = vi.fn();

    const getTauri = (): TauriFunctions => ({
      invoke: mockInvoke as unknown as NonNullable<TauriFunctions['invoke']>,
      listen: vi.fn() as any,
      getAppWindow: vi.fn() as any
    });

    operations = createCursorOperations(
      getTauri,
      mockShowMessage as unknown as (text: string, type?: Message['type']) => void
    );
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = null;
  });

  describe('toggleCursor', () => {
    it('calls invoke with toggle_cursor command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.toggleCursor();

      expect(mockInvoke).toHaveBeenCalledWith('toggle_cursor');
    });

    it('handles errors gracefully', async () => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Toggle failed');
      mockInvoke.mockRejectedValue(error);

      await operations.toggleCursor();

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to toggle cursor: Error: Toggle failed',
        'error'
      );
    });

    it('does nothing when invoke is not available', async () => {
      const getTauri = (): TauriFunctions => ({ invoke: null, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
      const ops = createCursorOperations(
        getTauri,
        mockShowMessage as unknown as (text: string, type?: Message['type']) => void
      );

      await ops.toggleCursor();

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(mockShowMessage).not.toHaveBeenCalled();
    });
  });

  describe('restoreCursor', () => {
    it('calls invoke with restore_cursor command', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.restoreCursor();

      expect(mockInvoke).toHaveBeenCalledWith('restore_cursor');
    });

    it('shows success message on successful restore', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await operations.restoreCursor();

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Cursor restored to system defaults',
        'success'
      );
    });

    it('shows error message on failure', async () => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Restore failed');
      mockInvoke.mockRejectedValue(error);

      await operations.restoreCursor();

      expect(mockShowMessage).toHaveBeenCalledWith(
        'Failed to restore cursor: Error: Restore failed',
        'error'
      );
    });

    it('does nothing when invoke is not available', async () => {
      const getTauri = (): TauriFunctions => ({ invoke: null, listen: vi.fn() as any, getAppWindow: vi.fn() as any });
      const ops = createCursorOperations(
        getTauri,
        mockShowMessage as unknown as (text: string, type?: Message['type']) => void
      );

      await ops.restoreCursor();

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});
