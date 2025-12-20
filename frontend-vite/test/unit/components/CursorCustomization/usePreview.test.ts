import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreview } from '@/components/CursorCustomization/Preview/usePreview';

const mockInvoke = vi.hoisted(() => vi.fn());
const mockInvokeCommand = vi.hoisted(() => vi.fn());
const loggerMocks = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn()
}));

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke
  })
}));

vi.mock('@/tauri/commands', () => ({
  Commands: {
    readCursorFileAsDataUrl: 'readCursorFileAsDataUrl'
  },
  invokeCommand: mockInvokeCommand
}));

vi.mock('@/utils/logger', () => ({
  logger: loggerMocks
}));

describe('usePreview hook', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockInvoke.mockReset();
    mockInvokeCommand.mockReset();
    loggerMocks.warn.mockReset();
    loggerMocks.error.mockReset();
  });

  it('loads preview image for selected cursor and toggles loading state', async () => {
    mockInvokeCommand.mockResolvedValue('data-url');
    const { result } = renderHook(() => usePreview());

    await act(async () => {
      result.current.selectCursor({
        name: 'Arrow',
        display_name: 'Arrow',
        image_path: 'path/to/cursor.cur'
      });
    });

    expect(result.current.selectingFromLibrary).toBe(true);

    await waitFor(() => {
      expect(mockInvokeCommand).toHaveBeenCalledWith(
        mockInvoke,
        'readCursorFileAsDataUrl',
        { file_path: 'path/to/cursor.cur' }
      );
    });

    await waitFor(() => {
      expect(result.current.selectedPreviewUrl).toBe('data-url');
      expect(result.current.selectedPreviewLoading).toBe(false);
    });
  });

  it('falls back to null preview when image path missing or load fails', async () => {
    const { result } = renderHook(() => usePreview());

    await act(async () => {
      result.current.selectCursor({
        name: 'Arrow',
        display_name: 'Arrow',
        image_path: null
      });
    });

    expect(result.current.selectedPreviewUrl).toBeNull();
    expect(result.current.selectedPreviewLoading).toBe(false);

    mockInvokeCommand.mockRejectedValue(new Error('fail'));

    await act(async () => {
      result.current.selectCursor({
        name: 'Busy',
        display_name: 'Busy',
        image_path: 'broken.cur'
      });
    });

    await waitFor(() => {
      expect(result.current.selectedPreviewUrl).toBeNull();
      expect(loggerMocks.warn).toHaveBeenCalled();
      expect(result.current.selectedPreviewLoading).toBe(false);
    });
  });

  it('handles ESC key to cancel selection and exposes clearSelection helper', async () => {
    mockInvokeCommand.mockResolvedValue('data-url');
    const { result } = renderHook(() => usePreview());

    await act(async () => {
      result.current.selectCursor({
        name: 'Link',
        display_name: 'Link',
        image_path: 'cursor.cur'
      });
    });

    expect(result.current.selectingFromLibrary).toBe(true);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.selectingFromLibrary).toBe(false);
    expect(result.current.selectedCursor).toBeNull();

    await act(async () => {
      result.current.selectCursor({
        name: 'Link',
        display_name: 'Link',
        image_path: 'cursor.cur'
      });
    });

    expect(result.current.selectedCursor).not.toBeNull();

    await act(async () => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCursor).toBeNull();
    expect(result.current.selectedPreviewUrl).toBeNull();
    expect(result.current.selectingFromLibrary).toBe(false);
  });
});
