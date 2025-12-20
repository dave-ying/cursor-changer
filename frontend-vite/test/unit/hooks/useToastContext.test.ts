import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockToastHook = {
  toasts: [{ id: 1, text: 'x', type: 'info' }],
  showToast: vi.fn(() => 123),
  removeToast: vi.fn(() => true),
  clearToasts: vi.fn(),
  success: vi.fn(() => 1),
  error: vi.fn(() => 2),
  warning: vi.fn(() => 3),
  info: vi.fn(() => 4),
};

vi.mock('@/hooks/useToast', () => ({
  useToast: () => mockToastHook,
}));

describe('hooks/useToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps useToast and provides addToast that maps duration into options', async () => {
    const { useToastContext } = await import('@/hooks/useToastContext');

    const { result } = renderHook(() => useToastContext());

    const id = result.current.addToast('Hello', 'success', 1500 as any);

    expect(id).toBe(123);
    expect(mockToastHook.showToast).toHaveBeenCalledWith('Hello', 'success', { duration: 1500 });
    expect(result.current.toasts).toBe(mockToastHook.toasts);
  });

  it('exposes convenience helpers', async () => {
    const { useToastContext } = await import('@/hooks/useToastContext');

    const { result } = renderHook(() => useToastContext());

    result.current.success('s');
    result.current.error('e');
    result.current.warning('w');
    result.current.info('i');

    expect(mockToastHook.success).toHaveBeenCalledWith('s');
    expect(mockToastHook.error).toHaveBeenCalledWith('e');
    expect(mockToastHook.warning).toHaveBeenCalledWith('w');
    expect(mockToastHook.info).toHaveBeenCalledWith('i');
  });
});
