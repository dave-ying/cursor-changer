import { act, renderHook } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';
import { useMessage } from '@/hooks/useMessage';

describe('AppProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('showMessage sets a message and auto-clears after 5 seconds', async () => {
    const { result } = renderHook(() => useMessage());

    act(() => {
      result.current.showMessage('hello', 'success');
    });

    expect(useAppStore.getState().message).toEqual({ text: 'hello', type: 'success' });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(useAppStore.getState().message).toEqual({ text: '', type: '' });
  });
});
