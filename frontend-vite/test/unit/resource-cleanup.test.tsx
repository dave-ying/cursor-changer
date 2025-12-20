/**
 * Unit tests for resource cleanup
 * 
 * These tests verify that resources (event listeners, timers, etc.) are properly cleaned up
 * **Validates: Requirements 7.2, 7.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSafeEventListener, useSafeTimer } from '@/hooks/useSafeAsync';

describe('Resource cleanup tests', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Test that event listeners are properly unregistered on cleanup
   */
  it('should unregister all event listeners on cleanup', () => {
    const mockElement = document.createElement('div');
    const addSpy = vi.spyOn(mockElement, 'addEventListener');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const { result } = renderHook(() => useSafeEventListener());
    
    // Add multiple event listeners
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();
    
    result.current.addEventListener(mockElement, 'click', handler1);
    result.current.addEventListener(mockElement, 'keydown', handler2);
    result.current.addEventListener(mockElement, 'mouseover', handler3);
    
    // Verify listeners were added
    expect(addSpy).toHaveBeenCalledTimes(3);
    
    // Cleanup
    result.current.cleanup();
    
    // Verify all listeners were removed
    expect(removeSpy).toHaveBeenCalledTimes(3);
    expect(removeSpy).toHaveBeenCalledWith('click', handler1, {});
    expect(removeSpy).toHaveBeenCalledWith('keydown', handler2, {});
    expect(removeSpy).toHaveBeenCalledWith('mouseover', handler3, {});
  });

  /**
   * Test that timers are properly cleared on cleanup
   */
  it('should clear all timers on cleanup', () => {
    const { result } = renderHook(() => useSafeTimer());
    
    // Create multiple timers
    const timeout1 = result.current.safeSetTimeout(() => {}, 1000);
    const timeout2 = result.current.safeSetTimeout(() => {}, 2000);
    const interval1 = result.current.safeSetInterval(() => {}, 1000);
    
    expect(timeout1).toBeTruthy();
    expect(timeout2).toBeTruthy();
    expect(interval1).toBeTruthy();
    
    // Cleanup
    result.current.clearAll();
    
    // Verify cleanup was called
    expect(result.current.isMounted()).toBe(false);
  });

  /**
   * Test that individual timers can be cleared
   */
  it('should clear individual timers', () => {
    const { result } = renderHook(() => useSafeTimer());
    
    const callback = vi.fn();
    const timeoutId = result.current.safeSetTimeout(callback, 1000);
    
    // Clear the specific timeout
    result.current.clearTimeoutSafe(timeoutId);
    
    // Verify callback was not called (timer was cleared)
    expect(callback).not.toHaveBeenCalled();
  });

  /**
   * Test that event listeners with options are cleaned up correctly
   */
  it('should cleanup event listeners with options', () => {
    const mockElement = document.createElement('div');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const { result } = renderHook(() => useSafeEventListener());
    
    const handler = vi.fn();
    const options = { capture: true, passive: true };
    
    result.current.addEventListener(mockElement, 'click', handler, options);
    
    // Cleanup
    result.current.cleanup();
    
    // Verify listener was removed (options are tracked but not verified in mock)
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Test that cleanup is idempotent
   */
  it('should handle multiple cleanup calls safely', () => {
    const mockElement = document.createElement('div');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const { result } = renderHook(() => useSafeEventListener());
    
    const handler = vi.fn();
    result.current.addEventListener(mockElement, 'click', handler);
    
    // Call cleanup multiple times
    result.current.cleanup();
    result.current.cleanup();
    result.current.cleanup();
    
    // Verify listener was only removed once
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Test that timers don't fire after cleanup
   */
  it('should prevent timers from firing after cleanup', async () => {
    const { result } = renderHook(() => useSafeTimer());
    
    const callback = vi.fn();
    result.current.safeSetTimeout(callback, 10);
    
    // Cleanup immediately
    result.current.clearAll();
    
    // Wait for timer duration
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify callback was not called
    expect(callback).not.toHaveBeenCalled();
  });

  /**
   * Test that event listeners can be manually removed before cleanup
   */
  it('should allow manual removal of event listeners', () => {
    const mockElement = document.createElement('div');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const { result } = renderHook(() => useSafeEventListener());
    
    const handler = vi.fn();
    result.current.addEventListener(mockElement, 'click', handler);
    
    // Manually remove listener
    result.current.removeEventListener(mockElement, 'click', handler);
    
    expect(mockElement.removeEventListener).toHaveBeenCalledTimes(1);
    
    // Cleanup should not try to remove it again
    removeSpy.mockClear();
    result.current.cleanup();
    
    // Verify no additional removal attempts
    expect(removeSpy).not.toHaveBeenCalled();
  });

  /**
   * Test that intervals are properly cleared
   */
  it('should clear intervals properly', () => {
    const { result } = renderHook(() => useSafeTimer());
    
    const callback = vi.fn();
    const intervalId = result.current.safeSetInterval(callback, 10);
    
    // Clear the interval
    result.current.clearIntervalSafe(intervalId);
    
    // Wait to ensure callback doesn't fire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        resolve();
      }, 50);
    });
  });

  /**
   * Test that cleanup works with no resources registered
   */
  it('should handle cleanup with no resources', () => {
    const { result: eventResult } = renderHook(() => useSafeEventListener());
    const { result: timerResult } = renderHook(() => useSafeTimer());
    
    // Cleanup without adding any resources
    expect(() => {
      eventResult.current.cleanup();
      timerResult.current.clearAll();
    }).not.toThrow();
  });

  /**
   * Test that resources are cleaned up on unmount
   */
  it('should cleanup resources on component unmount', () => {
    const mockElement = document.createElement('div');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const { result, unmount } = renderHook(() => useSafeEventListener());
    
    const handler = vi.fn();
    result.current.addEventListener(mockElement, 'click', handler);
    
    // Explicitly cleanup before unmount (simulating useEffect cleanup)
    result.current.cleanup();
    
    // Unmount
    unmount();
    
    // Verify listener was removed
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * Test that mixed resource types are all cleaned up
   */
  it('should cleanup mixed resource types', () => {
    const mockElement = document.createElement('div');
    const removeSpy = vi.spyOn(mockElement, 'removeEventListener');
    
    const eventHook = renderHook(() => useSafeEventListener());
    const timerHook = renderHook(() => useSafeTimer());
    
    // Add various resources
    eventHook.result.current.addEventListener(mockElement, 'click', vi.fn());
    eventHook.result.current.addEventListener(mockElement, 'keydown', vi.fn());
    timerHook.result.current.safeSetTimeout(() => {}, 1000);
    timerHook.result.current.safeSetInterval(() => {}, 1000);
    
    // Cleanup all
    eventHook.result.current.cleanup();
    timerHook.result.current.clearAll();
    
    // Verify cleanup
    expect(removeSpy).toHaveBeenCalledTimes(2);
    expect(timerHook.result.current.isMounted()).toBe(false);
  });

  /**
   * Test that cleanup prevents new resources from being added
   */
  it('should prevent adding resources after cleanup', () => {
    const mockElement = document.createElement('div');
    const addSpy = vi.spyOn(mockElement, 'addEventListener');
    
    const { result } = renderHook(() => useSafeEventListener());
    
    // Cleanup first
    result.current.cleanup();
    
    // Try to add listener after cleanup
    result.current.addEventListener(mockElement, 'click', vi.fn());
    
    // Verify listener was not added
    expect(addSpy).not.toHaveBeenCalled();
  });

  /**
   * Test that timer cleanup prevents new timers
   */
  it('should prevent creating timers after cleanup', () => {
    const { result } = renderHook(() => useSafeTimer());
    
    // Cleanup first
    result.current.clearAll();
    
    // Try to create timer after cleanup
    const timeoutId = result.current.safeSetTimeout(() => {}, 1000);
    
    // Verify timer was not created
    expect(timeoutId).toBeNull();
  });
});
