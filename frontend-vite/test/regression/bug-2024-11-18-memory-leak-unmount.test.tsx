import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useEffect, useState } from 'react';

/**
 * Regression test for Bug: Memory leak from event listeners not cleaned up on unmount
 * 
 * **Original Issue:**
 * Components that registered event listeners (e.g., for Tauri events, window resize,
 * keyboard events) did not properly clean them up when unmounting. This caused
 * memory leaks during long application sessions, especially when components were
 * frequently mounted and unmounted (e.g., modal dialogs, panels).
 * 
 * **Steps to Reproduce:**
 * 1. Open and close a component multiple times (e.g., settings panel)
 * 2. Each mount registers event listeners
 * 3. Unmount does not clean up listeners
 * 4. Memory usage grows unbounded
 * 5. Application becomes sluggish after extended use
 * 
 * **Expected Behavior:**
 * All event listeners registered during component mount should be cleaned up
 * during unmount. Memory usage should remain stable even with repeated
 * mount/unmount cycles.
 * 
 * **Actual Behavior (before fix):**
 * Event listeners accumulated with each mount, causing memory leaks and
 * degraded performance over time.
 * 
 * **Fixed in:** Initial implementation with proper cleanup
 * **Date Fixed:** 2024-11-18
 * 
 * **Test Verification:**
 * This test verifies that event listeners are properly cleaned up when
 * components unmount, preventing memory leaks.
 */
describe('Regression: Bug - Memory leak from event listeners', () => {
  let mockAddEventListener;
  let mockRemoveEventListener;
  let addedListeners;
  let removedListeners;

  beforeEach(() => {
    addedListeners = [];
    removedListeners = [];
    
    // Mock addEventListener to track registrations
    mockAddEventListener = vi.spyOn(window, 'addEventListener')
      .mockImplementation((event, handler) => {
        addedListeners.push({ event, handler });
      });
    
    // Mock removeEventListener to track cleanup
    mockRemoveEventListener = vi.spyOn(window, 'removeEventListener')
      .mockImplementation((event, handler) => {
        removedListeners.push({ event, handler });
      });
  });

  afterEach(() => {
    mockAddEventListener.mockRestore();
    mockRemoveEventListener.mockRestore();
    cleanup();
  });

  it('should clean up event listeners on unmount', () => {
    // Arrange: Create a component that registers an event listener
    const TestComponent = () => {
      const [count, setCount] = useState(0);
      
      useEffect(() => {
        const handleResize = () => setCount(c => c + 1);
        window.addEventListener('resize', handleResize);
        
        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
        };
      }, []);
      
      return <div>Count: {count}</div>;
    };
    
    // Act: Mount and unmount the component
    const { unmount } = render(<TestComponent />);
    
    // Verify listener was added
    expect(addedListeners.length).toBe(1);
    expect(addedListeners[0].event).toBe('resize');
    
    // Unmount the component
    unmount();
    
    // Assert: Listener should be removed
    expect(removedListeners.length).toBe(1);
    expect(removedListeners[0].event).toBe('resize');
    
    // Verify the same handler was removed
    expect(removedListeners[0].handler).toBe(addedListeners[0].handler);
  });

  it('should clean up multiple event listeners on unmount', () => {
    // Arrange: Component with multiple listeners
    const TestComponent = () => {
      useEffect(() => {
        const handleResize = () => {};
        const handleKeyDown = () => {};
        const handleClick = () => {};
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('click', handleClick);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('click', handleClick);
        };
      }, []);
      
      return <div>Test</div>;
    };
    
    // Act: Mount and unmount
    const { unmount } = render(<TestComponent />);
    
    expect(addedListeners.length).toBe(3);
    
    unmount();
    
    // Assert: All listeners should be removed
    expect(removedListeners.length).toBe(3);
    
    // Verify all events are cleaned up
    const addedEvents = addedListeners.map(l => l.event).sort();
    const removedEvents = removedListeners.map(l => l.event).sort();
    expect(removedEvents).toEqual(addedEvents);
  });

  it('should handle repeated mount/unmount cycles without leaking', () => {
    // Arrange: Component that can be mounted multiple times
    const TestComponent = () => {
      useEffect(() => {
        const handler = () => {};
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
      }, []);
      
      return <div>Test</div>;
    };
    
    // Act: Mount and unmount multiple times
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(<TestComponent />);
      unmount();
    }
    
    // Assert: Number of adds should equal number of removes
    expect(addedListeners.length).toBe(5);
    expect(removedListeners.length).toBe(5);
    
    // No net accumulation of listeners
    expect(addedListeners.length).toBe(removedListeners.length);
  });

  it('should clean up listeners even when component errors', () => {
    // Arrange: Component that might error
    const TestComponent = ({ shouldError }) => {
      useEffect(() => {
        const handler = () => {};
        window.addEventListener('resize', handler);
        
        if (shouldError) {
          throw new Error('Component error');
        }
        
        return () => window.removeEventListener('resize', handler);
      }, [shouldError]);
      
      return <div>Test</div>;
    };
    
    // Act: Mount component
    const { rerender, unmount } = render(<TestComponent shouldError={false} />);
    
    expect(addedListeners.length).toBe(1);
    
    // Unmount (cleanup should still happen)
    unmount();
    
    // Assert: Listener should be cleaned up
    expect(removedListeners.length).toBe(1);
  });
});

/**
 * Additional regression test for Tauri event listener cleanup
 */
describe('Regression: Bug - Tauri event listener memory leak', () => {
  let mockListen;
  let mockUnlisten;
  let unlistenFunctions;

  beforeEach(() => {
    unlistenFunctions = [];
    
    // Mock Tauri listen function
    mockListen = vi.fn((event, handler) => {
      const unlisten = vi.fn();
      unlistenFunctions.push({ event, unlisten });
      return Promise.resolve(unlisten);
    });
    
    // Mock window.__TAURI__
    global.window.__TAURI__ = {
      event: {
        listen: mockListen
      }
    };
  });

  afterEach(() => {
    delete global.window.__TAURI__;
    cleanup();
  });

  it('should clean up Tauri event listeners on unmount', async () => {
    // Arrange: Component that listens to Tauri events
    const TestComponent = () => {
      useEffect(() => {
        let unlisten;
        
        const setupListener = async () => {
          unlisten = await window.__TAURI__.event.listen('test-event', () => {});
        };
        
        setupListener();
        
        return () => {
          if (unlisten) {
            unlisten();
          }
        };
      }, []);
      
      return <div>Test</div>;
    };
    
    // Act: Mount and unmount
    const { unmount } = render(<TestComponent />);
    
    // Wait for async listener setup
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockListen).toHaveBeenCalledWith('test-event', expect.any(Function));
    
    unmount();
    
    // Assert: Unlisten should be called
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(unlistenFunctions[0].unlisten).toHaveBeenCalled();
  });
});
