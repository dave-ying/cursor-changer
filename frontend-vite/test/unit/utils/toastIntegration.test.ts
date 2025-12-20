import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastService } from '@/services/toastService';

describe('utils/toastIntegration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toastService.clear();
  });

  afterEach(() => {
    toastService.clear();
  });

  it('integrateWithStore subscribes only once', async () => {
    const { ToastIntegration } = await import('@/utils/toastIntegration');

    (ToastIntegration as any).isIntegrated = false;

    const subscribeSpy = vi.spyOn(toastService, 'subscribe');

    ToastIntegration.integrateWithStore({
      addToast: vi.fn(),
      removeToast: vi.fn(),
    });

    ToastIntegration.integrateWithStore({
      addToast: vi.fn(),
      removeToast: vi.fn(),
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('show delegates to toastService.show', async () => {
    const { ToastIntegration } = await import('@/utils/toastIntegration');
    (ToastIntegration as any).isIntegrated = false;

    const showSpy = vi.spyOn(toastService, 'show');
    showSpy.mockReturnValue(999);

    const id = ToastIntegration.show('Hello', 'warning', 1111);

    expect(id).toBe(999);
    expect(showSpy).toHaveBeenCalledWith('Hello', 'warning', { duration: 1111 });
  });

  it('getService returns the singleton toastService', async () => {
    const { ToastIntegration } = await import('@/utils/toastIntegration');
    expect(ToastIntegration.getService()).toBe(toastService);
  });
});
