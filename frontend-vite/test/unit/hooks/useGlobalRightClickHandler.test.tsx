/**
 * Unit tests for useGlobalRightClickHandler hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import * as React from 'react';
import { useGlobalRightClickHandler } from '@/hooks/useGlobalRightClickHandler';

// Test component that uses the hook
function TestComponent({ children }: { children?: React.ReactNode }) {
  useGlobalRightClickHandler();
  return <div data-testid="test-container">{children}</div>;
}

describe('useGlobalRightClickHandler', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Context Menu Prevention', () => {
    it('prevents context menu on regular elements', () => {
      render(
        <TestComponent>
          <div data-testid="regular-element">Regular Element</div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="regular-element"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(true);
    });

    it('prevents context menu on body', () => {
      render(<TestComponent />);

      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !document.body.dispatchEvent(event);
      expect(prevented).toBe(true);
    });
  });

  describe('Cursor Component Exceptions', () => {
    it('allows context menu on cursor-card elements', () => {
      render(
        <TestComponent>
          <div className="cursor-card" data-testid="cursor-card">Cursor Card</div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="cursor-card"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('allows context menu on library-item elements', () => {
      render(
        <TestComponent>
          <div className="library-item" data-testid="library-item">Library Item</div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="library-item"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('allows context menu on cursor-preview elements', () => {
      render(
        <TestComponent>
          <div className="cursor-preview" data-testid="cursor-preview">Preview</div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="cursor-preview"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('allows context menu on cursor-preview-img elements', () => {
      render(
        <TestComponent>
          <img className="cursor-preview-img" data-testid="cursor-img" alt="cursor" />
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="cursor-img"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('allows context menu on cursor-name elements', () => {
      render(
        <TestComponent>
          <span className="cursor-name" data-testid="cursor-name">Normal</span>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="cursor-name"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });
  });

  describe('Nested Elements', () => {
    it('allows context menu on child of cursor-card', () => {
      render(
        <TestComponent>
          <div className="cursor-card">
            <span data-testid="nested-child">Nested Child</span>
          </div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="nested-child"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });

    it('allows context menu on deeply nested child of library-item', () => {
      render(
        <TestComponent>
          <div className="library-item">
            <div>
              <div>
                <span data-testid="deep-nested">Deep Nested</span>
              </div>
            </div>
          </div>
        </TestComponent>
      );

      const element = document.querySelector('[data-testid="deep-nested"]')!;
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true
      });

      const prevented = !element.dispatchEvent(event);
      expect(prevented).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(<TestComponent />);
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
        { capture: true }
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
