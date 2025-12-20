import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastService } from '@/services/toastService';
import { TOAST_DEFAULTS } from '@/constants/toastConstants';

describe('services/toastService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastService.clear();
  });

  afterEach(() => {
    toastService.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('show adds a toast with defaults and notifies listeners', () => {
    const listener = vi.fn();
    const unsubscribe = toastService.subscribe(listener);

    const id = toastService.show('Hello');

    expect(id).not.toBe(-1);
    const toasts = toastService.getToasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0]!.text).toBe('Hello');
    expect(toasts[0]!.type).toBe('info');
    expect(toasts[0]!.duration).toBe(TOAST_DEFAULTS.DURATION);
    expect(toasts[0]!.position).toBe(TOAST_DEFAULTS.POSITION);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('limits the toast list to MAX_TOASTS', () => {
    for (let i = 0; i < TOAST_DEFAULTS.MAX_TOASTS + 2; i++) {
      toastService.show(`t${i}`);
    }

    const toasts = toastService.getToasts();
    expect(toasts.length).toBe(TOAST_DEFAULTS.MAX_TOASTS);
  });

  it('remove returns true when a toast is removed and false when not found', () => {
    const id = toastService.show('x');
    expect(toastService.remove(id)).toBe(true);
    expect(toastService.remove(id)).toBe(false);
  });

  it('auto-removes toast after duration', () => {
    const id = toastService.show('auto', 'info', { duration: 50 });
    expect(toastService.getToasts().length).toBe(1);

    vi.advanceTimersByTime(50);

    expect(toastService.getToasts().find(t => t.id === id)).toBeUndefined();
  });

  it('clear removes all toasts and notifies listeners', () => {
    const listener = vi.fn();
    toastService.subscribe(listener);

    toastService.show('a');
    expect(toastService.getToasts().length).toBe(1);

    toastService.clear();
    expect(toastService.getToasts().length).toBe(0);
    expect(listener).toHaveBeenCalled();
  });
});
