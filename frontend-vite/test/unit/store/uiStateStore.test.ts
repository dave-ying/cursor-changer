import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';

import { createUIStateSlice, type UIStateSlice } from '@/store/slices/uiStateStore';
import { toastService } from '@/services/toastService';



describe('uiStateStore slice', () => {
  const createTestStore = () =>
    create<UIStateSlice>()((set, get, api) => ({
      ...createUIStateSlice(set as any, get as any, api as any),
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toastService, 'show').mockImplementation(() => 'mock-id');
    vi.spyOn(toastService, 'remove').mockImplementation(() => true);
    vi.spyOn(toastService, 'clear').mockImplementation(() => { });
  });

  it('updates message state via showMessage and resets via clearMessage', () => {
    const useStore = createTestStore();

    useStore.getState().showMessage('Hello explicit', 'success');
    expect(useStore.getState().message).toEqual({ text: 'Hello explicit', type: 'success' });

    useStore.getState().showMessage('Hello default');
    expect(useStore.getState().message).toEqual({ text: 'Hello default', type: 'info' });

    useStore.getState().clearMessage();
    expect(useStore.getState().message).toEqual({ text: '', type: '' });
  });

  it('updates customizationMode and activeSection', () => {
    const useStore = createTestStore();

    expect(useStore.getState().customizationMode).toBe('simple');
    useStore.getState().setCustomizationMode('advanced');
    expect(useStore.getState().customizationMode).toBe('advanced');

    expect(useStore.getState().activeSection).toBe('cursor-customization');
    useStore.getState().setActiveSection('library');
    expect(useStore.getState().activeSection).toBe('library');
  });

  it('delegates toast operations to toastService (safeType + duration)', () => {
    const useStore = createTestStore();

    useStore.getState().addToast('A', '', 1234);
    expect(toastService.show).toHaveBeenCalledWith('A', 'info', { duration: 1234 });

    useStore.getState().addToast('B', 'success', 2500);
    expect(toastService.show).toHaveBeenCalledWith('B', 'success', { duration: 2500 });

    useStore.getState().addToast('C');
    expect(toastService.show).toHaveBeenCalledWith('C', 'info', { duration: 5000 });

    useStore.getState().removeToast('id_1');
    expect(toastService.remove).toHaveBeenCalledWith('id_1');

    useStore.getState().clearAllToasts();
    expect(toastService.clear).toHaveBeenCalledTimes(1);
  });

  it('updates recording and shortcut capture state', () => {
    const useStore = createTestStore();

    useStore.getState().setRecording(true);
    expect(useStore.getState().recording).toBe(true);

    useStore.getState().setCapturedShortcut('Ctrl+Shift+X');
    expect(useStore.getState().capturedShortcut).toBe('Ctrl+Shift+X');

    useStore.getState().setOriginalShortcut('Ctrl+Alt+Z');
    expect(useStore.getState().originalShortcut).toBe('Ctrl+Alt+Z');

    useStore.getState().setCapturedShortcut(null);
    expect(useStore.getState().capturedShortcut).toBeNull();
  });

  it('handles toast removal/clear operations gracefully when service throws', () => {
    const useStore = createTestStore();
    const removeSpy = vi.spyOn(toastService, 'remove').mockImplementation(() => {
      throw new Error('remove failed');
    });
    const clearSpy = vi.spyOn(toastService, 'clear').mockImplementation(() => {
      throw new Error('clear failed');
    });

    expect(() => useStore.getState().removeToast('abc')).toThrow('remove failed');
    expect(() => useStore.getState().clearAllToasts()).toThrow('clear failed');

    removeSpy.mockRestore();
    clearSpy.mockRestore();
  });
});
