import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToast } from '@/hooks/useToast';
import type { Toast } from '@/types/toastTypes';

const {
  subscribeSpy,
  unsubscribeSpy,
  mockShow,
  mockRemove,
  mockClear,
  mockSuccess,
  mockError,
  mockWarning,
  mockInfo,
  mockGetToasts
} = vi.hoisted(() => {
  return {
    subscribeSpy: vi.fn(),
    unsubscribeSpy: vi.fn(),
    mockShow: vi.fn(),
    mockRemove: vi.fn(),
    mockClear: vi.fn(),
    mockSuccess: vi.fn(),
    mockError: vi.fn(),
    mockWarning: vi.fn(),
    mockInfo: vi.fn(),
    mockGetToasts: vi.fn()
  };
});

let currentToasts: Toast[] = [];
let subscriber: (() => void) | null = null;

mockGetToasts.mockImplementation(() => [...currentToasts]);

vi.mock('@/services/toastService', () => ({
  toastService: {
    subscribe: (listener: () => void) => {
      subscriber = listener;
      subscribeSpy(listener);
      return () => unsubscribeSpy();
    },
    getToasts: mockGetToasts,
    show: mockShow,
    remove: mockRemove,
    clear: mockClear,
    success: mockSuccess,
    error: mockError,
    warning: mockWarning,
    info: mockInfo
  }
}));

describe('hooks/useToast', () => {
  beforeEach(() => {
    currentToasts = [];
    subscriber = null;
    vi.clearAllMocks();
  });

  it('subscribes to toastService updates and keeps toasts in sync', async () => {
    const initialToasts: Toast[] = [
      { id: 'a', text: 'Initial', type: 'info' }
    ];
    currentToasts = initialToasts;

    const { result } = renderHook(() => useToast());

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.toasts).toEqual(initialToasts);
    });

    const updatedToasts: Toast[] = [
      { id: 'b', text: 'Updated', type: 'success', position: 'top-right' }
    ];
    currentToasts = updatedToasts;

    await act(async () => {
      subscriber?.();
    });

    await waitFor(() => {
      expect(result.current.toasts).toEqual(updatedToasts);
    });
  });

  it('cleans up the subscription on unmount', () => {
    const { unmount } = renderHook(() => useToast());

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('forwards toast actions to toastService helpers', () => {
    const { result } = renderHook(() => useToast());

    mockShow.mockReturnValue('show-id');
    const showId = result.current.showToast('Hello', 'success', { duration: 500 });
    expect(mockShow).toHaveBeenCalledWith('Hello', 'success', { duration: 500 });
    expect(showId).toBe('show-id');

    mockRemove.mockReturnValue(true);
    const removeResult = result.current.removeToast('toast-id');
    expect(mockRemove).toHaveBeenCalledWith('toast-id');
    expect(removeResult).toBe(true);

    result.current.clearToasts();
    expect(mockClear).toHaveBeenCalledTimes(1);

    mockSuccess.mockReturnValue('success-id');
    expect(result.current.success('Success', { position: 'top-left' })).toBe('success-id');
    expect(mockSuccess).toHaveBeenCalledWith('Success', { position: 'top-left' });

    mockError.mockReturnValue('error-id');
    expect(result.current.error('Error')).toBe('error-id');
    expect(mockError).toHaveBeenCalledWith('Error', undefined);

    mockWarning.mockReturnValue('warning-id');
    expect(result.current.warning('Warn')).toBe('warning-id');
    expect(mockWarning).toHaveBeenCalledWith('Warn', undefined);

    mockInfo.mockReturnValue('info-id');
    expect(result.current.info('Info', { duration: 1000 })).toBe('info-id');
    expect(mockInfo).toHaveBeenCalledWith('Info', { duration: 1000 });
  });
});
