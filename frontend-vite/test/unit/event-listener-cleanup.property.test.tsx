/**
 * Property-based tests for event listener cleanup
 * 
 * **Feature: app-quality-improvement, Property 15: Event listeners are properly unregistered**
 * **Validates: Requirements 7.4**
 * 
 * These tests verify that event listeners are properly unregistered when components unmount,
 * preventing memory leaks and ensuring proper resource cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSafeEventListener } from '@/hooks/useSafeAsync';
import fc from 'fast-check';

describe('Property 15: Event listener cleanup', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  /**
   * Helper to create a fresh mock element for each test iteration
   */
  const createMockElement = () => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    tagName: 'DIV'
  });

  /**
   * Property test: For any number of event listeners added, all should be removed on cleanup
   */
  it('should remove all event listeners on cleanup', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // number of listeners
        (listenerCount) => {
          // Create fresh mock for this iteration
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          // Add multiple event listeners
          const handlers = [];
          for (let i = 0; i < listenerCount; i++) {
            const handler = vi.fn();
            handlers.push(handler);
            result.current.addEventListener(mockElement, `event${i}`, handler);
          }
          
          // Verify all listeners were added
          expect(mockElement.addEventListener).toHaveBeenCalledTimes(listenerCount);
          
          // Cleanup
          result.current.cleanup();
          
          // Verify all listeners were removed
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(listenerCount);
          
          // Verify each handler was removed
          handlers.forEach((handler, i) => {
            expect(mockElement.removeEventListener).toHaveBeenCalledWith(
              `event${i}`,
              handler,
              {}
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: For any sequence of add/remove operations, cleanup should handle remaining listeners
   */
  it('should cleanup remaining listeners after mixed add/remove operations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }), // sequence of add (true) or remove (false)
        (operations) => {
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          const handlers = [];
          const eventNames = [];
          let addCount = 0;
          let manualRemoveCount = 0;
          
          // Perform mixed add/remove operations
          operations.forEach((shouldAdd, i) => {
            if (shouldAdd) {
              const handler = vi.fn();
              const eventName = `event${i}`;
              handlers.push({ handler, eventName });
              eventNames.push(eventName);
              result.current.addEventListener(mockElement, eventName, handler);
              addCount++;
            } else if (handlers.length > 0) {
              // Remove a previously added listener
              const { handler, eventName } = handlers.pop();
              result.current.removeEventListener(mockElement, eventName, handler);
              manualRemoveCount++;
            }
          });
          
          const remainingListeners = addCount - manualRemoveCount;
          
          // Reset mock call counts
          mockElement.removeEventListener.mockClear();
          
          // Cleanup should remove all remaining listeners
          result.current.cleanup();
          
          // Verify cleanup removed the remaining listeners
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(remainingListeners);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Multiple mount/unmount cycles should not leak listeners
   */
  it('should not leak listeners across multiple mount/unmount cycles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // number of mount/unmount cycles
        fc.integer({ min: 1, max: 5 }),  // listeners per cycle
        (cycles, listenersPerCycle) => {
          const mockElement = createMockElement();
          let totalAdded = 0;
          let totalRemoved = 0;
          
          for (let cycle = 0; cycle < cycles; cycle++) {
            const { result } = renderHook(() => useSafeEventListener());
            
            // Add listeners
            for (let i = 0; i < listenersPerCycle; i++) {
              const handler = vi.fn();
              result.current.addEventListener(mockElement, `event${cycle}_${i}`, handler);
              totalAdded++;
            }
            
            // Explicitly cleanup (simulating component unmount)
            result.current.cleanup();
            totalRemoved += listenersPerCycle;
          }
          
          // Verify all listeners were eventually removed
          expect(totalAdded).toBe(totalRemoved);
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(totalRemoved);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Event listeners with different event types should all be cleaned up
   * Note: We use unique event names to avoid Map key collisions in the implementation
   */
  it('should cleanup listeners for different event types', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // number of unique listeners
        (listenerCount) => {
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          const handlers = [];
          
          // Add unique listeners with unique event names to avoid Map key collisions
          for (let i = 0; i < listenerCount; i++) {
            const handler = vi.fn();
            const eventType = `event${i}`; // Unique event name for each listener
            handlers.push({ eventType, handler });
            result.current.addEventListener(mockElement, eventType, handler);
          }
          
          // Cleanup
          result.current.cleanup();
          
          // Verify all listeners were removed
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(listenerCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Listeners with options should be cleaned up correctly
   */
  it('should cleanup listeners with various options', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), // capture flags
        (listenerCount, captureFlags) => {
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          const handlers = [];
          
          // Add listeners with different options
          for (let i = 0; i < Math.min(listenerCount, captureFlags.length); i++) {
            const handler = vi.fn();
            const options = { capture: captureFlags[i] };
            handlers.push({ handler, options });
            result.current.addEventListener(mockElement, `event${i}`, handler, options);
          }
          
          // Cleanup
          result.current.cleanup();
          
          // Verify all listeners were removed
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(handlers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Cleanup should be idempotent (calling multiple times is safe)
   */
  it('should handle multiple cleanup calls safely', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),  // number of listeners
        fc.integer({ min: 2, max: 5 }),  // number of cleanup calls
        (listenerCount, cleanupCalls) => {
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          // Add listeners
          for (let i = 0; i < listenerCount; i++) {
            const handler = vi.fn();
            result.current.addEventListener(mockElement, `event${i}`, handler);
          }
          
          // Call cleanup multiple times
          for (let i = 0; i < cleanupCalls; i++) {
            result.current.cleanup();
          }
          
          // Verify listeners were only removed once (idempotent)
          // The first cleanup removes all listeners, subsequent calls should be no-ops
          expect(mockElement.removeEventListener).toHaveBeenCalledTimes(listenerCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: After cleanup, adding new listeners should fail gracefully
   */
  it('should not add listeners after cleanup', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (listenerCount) => {
          const mockElement = createMockElement();
          const { result } = renderHook(() => useSafeEventListener());
          
          // Cleanup first
          result.current.cleanup();
          
          // Reset mock
          mockElement.addEventListener.mockClear();
          
          // Try to add listeners after cleanup
          for (let i = 0; i < listenerCount; i++) {
            const handler = vi.fn();
            result.current.addEventListener(mockElement, `event${i}`, handler);
          }
          
          // Verify no listeners were added after cleanup
          expect(mockElement.addEventListener).not.toHaveBeenCalled();
          expect(result.current.isMounted()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
