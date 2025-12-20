import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSafeAsync } from '@/hooks/useSafeAsync';

const loggerMocks = vi.hoisted(() => ({
  warn: vi.fn()
}));

vi.mock('@/utils/logger', () => ({
  logger: loggerMocks
}));

function createDeferred<T>() {
  let resolveFn: (value: T | PromiseLike<T>) => void = () => {};
  let rejectFn: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  return { promise, resolve: resolveFn, reject: rejectFn };
}

describe('hooks/useSafeAsync', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves async work and calls success/finally callbacks while mounted', async () => {
    const { result } = renderHook(() => useSafeAsync());
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onFinally = vi.fn();

    await act(async () => {
      const value = await result.current.safeAsync(async () => 'done', {
        onSuccess,
        onError,
        onFinally
      });
      expect(value).toBe('done');
    });

    expect(onSuccess).toHaveBeenCalledWith('done');
    expect(onError).not.toHaveBeenCalled();
    expect(onFinally).toHaveBeenCalledTimes(1);
    expect(result.current.isMounted()).toBe(true);
  });

  it('handles rejected async work, logs warning, and calls onError/onFinally', async () => {
    const { result } = renderHook(() => useSafeAsync());
    const onError = vi.fn();
    const onFinally = vi.fn();
    const failure = new Error('boom');

    await act(async () => {
      const value = await result.current.safeAsync(
        async () => {
          throw failure;
        },
        {
          onError,
          onFinally,
          errorMessage: 'custom failure'
        }
      );
      expect(value).toBeNull();
    });

    expect(onError).toHaveBeenCalledWith(failure);
    expect(onFinally).toHaveBeenCalledTimes(1);
    expect(loggerMocks.warn).toHaveBeenCalledWith('[useSafeAsync] Operation failed:', 'custom failure', failure);
  });

  it('skips callbacks after cleanup/unmount even if promise resolves', async () => {
    const { result } = renderHook(() => useSafeAsync());
    const onSuccess = vi.fn();
    const onFinally = vi.fn();
    const deferred = createDeferred<string>();

    const promise = result.current.safeAsync(
      () => deferred.promise,
      {
        onSuccess,
        onFinally
      }
    );

    // Simulate unmount/cleanup before the promise settles
    result.current.cleanup();
    expect(result.current.isMounted()).toBe(false);

    await act(async () => {
      deferred.resolve('late');
      const value = await promise;
      expect(value).toBe('late');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onFinally).not.toHaveBeenCalled();
  });

  it('safePromise prevents resolution after cancel is invoked', async () => {
    const { result } = renderHook(() => useSafeAsync());
    const deferred = createDeferred<number>();
    const { promise, cancel } = result.current.safePromise(deferred.promise);

    const resolvedSpy = vi.fn();
    const rejectedSpy = vi.fn();
    promise.then(resolvedSpy).catch(rejectedSpy);

    cancel();

    await act(async () => {
      deferred.resolve(42);
      await Promise.resolve();
    });

    expect(resolvedSpy).not.toHaveBeenCalled();
    expect(rejectedSpy).not.toHaveBeenCalled();
  });
});
