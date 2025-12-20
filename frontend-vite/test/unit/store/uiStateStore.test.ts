import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';

vi.mock('@/services/toastService', () => ({
  toastService: {
    show: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

import { createUIStateSlice, type UIStateSlice } from '@/store/slices/uiStateStore';
import { toastService } from '@/services/toastService';

describe('uiStateStore slice', () => {
  const createTestStore = () =>
    create<UIStateSlice>()((set, get, api) => ({
      ...createUIStateSlice(set as any, get as any, api as any),
    }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates message state via showMessage and resets via clearMessage', () => {
    const useStore = createTestStore();

    useStore.getState().showMessage('Hello', 'success');
    expect(useStore.getState().message).toEqual({ text: 'Hello', type: 'success' });

    useStore.getState().clearMessage();
    expect(useStore.getState().message).toEqual({ text: '', type: '' });
  });

  it('updates customizationMode and selectingCursorForCustomization flags', () => {
    const useStore = createTestStore();

    expect(useStore.getState().customizationMode).toBe('simple');
    useStore.getState().setCustomizationMode('advanced');
    expect(useStore.getState().customizationMode).toBe('advanced');

    expect(useStore.getState().selectingCursorForCustomization).toBe(false);
    useStore.getState().setSelectingCursorForCustomization(true);
    expect(useStore.getState().selectingCursorForCustomization).toBe(true);
  });

  it('delegates toast operations to toastService (safeType + duration)', () => {
    const useStore = createTestStore();

    useStore.getState().addToast('A', '', 1234);
    expect(toastService.show).toHaveBeenCalledWith('A', 'info', { duration: 1234 });

    useStore.getState().addToast('B', 'success', 2500);
    expect(toastService.show).toHaveBeenCalledWith('B', 'success', { duration: 2500 });

    useStore.getState().removeToast('id_1');
    expect(toastService.remove).toHaveBeenCalledWith('id_1');

    useStore.getState().clearAllToasts();
    expect(toastService.clear).toHaveBeenCalledTimes(1);
  });
});
