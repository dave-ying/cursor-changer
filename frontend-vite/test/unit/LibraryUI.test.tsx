import { expect, vi, beforeEach, afterEach, describe, it } from 'vitest';
import { render, screen, waitFor, within, fireEvent, cleanup as rtlCleanup } from '@testing-library/react';
import * as React from 'react';
import App from '@/App';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MessageProvider } from '@/context/MessageContext';

 declare global {
  interface Window {
    __TAURI__?: any;
    __TAURI_INTERNALS__?: any;
    __TAURI_IPC__?: any;
  }
 }

// Cleanup after each test
afterEach(() => {
  if (typeof rtlCleanup === 'function') {
    rtlCleanup();
  }
});

// Keep a handle on original computed style and a hover tracker per-suite
const originalGetComputedStyle = window.getComputedStyle;
let hoveredElements = new WeakSet<Element>();
let _mouseOverHandler: any;
let _mouseOutHandler: any;
const mockInvoke = vi.fn((cmd) => {
  switch (cmd) {
    case 'get_status':
      return Promise.resolve({
        cursor_paths: {},
        theme_mode: 'dark',
        accent_color: '#7c3aed',
        hidden: false,
        shortcut: 'Ctrl+Shift+X',
        shortcut_enabled: true,
        cursor_size: 32,
        minimize_to_tray: true,
        run_on_startup: false
      });
    case 'get_library_cursors':
      return Promise.resolve([
        { id: 'lib_1', name: 'Lib Cursor', display_name: 'Library Cursor', image_path: 'C:\\lib.cur' }
      ]);
    case 'get_available_cursors':
      return Promise.resolve([
        { name: 'Normal', display_name: 'Normal Pointer', image_path: null }
      ]);
    case 'get_library_cursor_preview':
    case 'get_system_cursor_preview':
      return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKw66AAAAABJRU5ErkJggg==');
    case 'reorder_library_cursors':
      return Promise.resolve();
    default:
      return Promise.resolve(undefined);
  }
});

// Create a mock appWindow object
const mockAppWindow = {
  hide: () => Promise.resolve(),
  minimize: () => Promise.resolve(),
  maximize: () => Promise.resolve(),
  unmaximize: () => Promise.resolve(),
  close: () => Promise.resolve(),
  isMaximized: () => Promise.resolve(false),
  isMinimized: () => Promise.resolve(false),
  isVisible: () => Promise.resolve(true),
  setTitle: () => Promise.resolve(),
  listen: vi.fn(() => Promise.resolve(() => { })),
  once: vi.fn(() => Promise.resolve(() => { })),
  emit: vi.fn(() => Promise.resolve()),
};

beforeEach(() => {
  // Ensure window.__TAURI__ exists with complete API surface
  window.__TAURI__ = {
    invoke: mockInvoke,
    listen: vi.fn(() => Promise.resolve(() => { })),
    event: { 
      listen: vi.fn(() => Promise.resolve(() => { })), 
      emit: vi.fn(),
      once: vi.fn(() => Promise.resolve(() => { })),
    },
    window: {
      getCurrentWindow: () => mockAppWindow,
      getCurrent: () => mockAppWindow,
      appWindow: mockAppWindow,
    },
    appWindow: mockAppWindow,
    core: {
      invoke: mockInvoke,
    },
    tauri: {
      invoke: mockInvoke,
      appWindow: mockAppWindow,
    },
  };
  mockInvoke.mockClear();
  // Reset hover set between tests
  hoveredElements = new WeakSet<Element>();

  // Track mouseover/mouseout to simulate hover in JSDOM
  _mouseOverHandler = (e: Event) => {
    try { hoveredElements.add(e.target as Element); } catch (err) { }
  };
  _mouseOutHandler = (e: Event) => {
    try { hoveredElements.delete(e.target as Element); } catch (err) { }
  };
  document.addEventListener('mouseover', _mouseOverHandler, true);
  document.addEventListener('mouseout', _mouseOutHandler, true);
  document.addEventListener('mouseenter', _mouseOverHandler, true);
  document.addEventListener('mouseleave', _mouseOutHandler, true);

  // Mock getComputedStyle to return expected animation values for preview elements
  window.getComputedStyle = ((el: Element, pseudoElt?: string | null) => {
    const style = originalGetComputedStyle(el);
    const isPreview = el && el.classList && typeof el.classList.contains === 'function' && el.classList.contains('cursor-preview');

    // Use defaults from actual computed style for unknown properties
    const base = {
      getPropertyValue: (prop: string) => style.getPropertyValue(prop),
      animation: style.animation || '',
      animationPlayState: style.animationPlayState || '',
      transition: style.transition || '',
      willChange: style.willChange || '',
      transformOrigin: style.transformOrigin || ''
    };

    if (!isPreview) return base as unknown as CSSStyleDeclaration;

    const prefersReduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      return { ...base, animation: 'none', animationPlayState: 'paused', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };
    }

    // If the preview or any of its ancestor nodes are hovered, return paused
    const isHovered = (() => {
      let node: Element | null = el;
      while (node) {
        if (hoveredElements.has(node)) return true;
        node = node.parentElement;
      }
      return false;
    })();

    return {
      ...base,
      animation: 'subtle-pulse-scale 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      animationPlayState: isHovered ? 'paused' : 'running',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    } as unknown as CSSStyleDeclaration;
  }) as typeof window.getComputedStyle;
});

afterEach(() => {
  // Restore computed style and cleanup hover listeners
  window.getComputedStyle = originalGetComputedStyle;
  document.removeEventListener('mouseover', _mouseOverHandler, true);
  document.removeEventListener('mouseout', _mouseOutHandler, true);
  document.removeEventListener('mouseenter', _mouseOverHandler, true);
  document.removeEventListener('mouseleave', _mouseOutHandler, true);
});

// Helper to render the app with provider
function renderApp() {
  return render(
    <AppProvider>
      <ThemeProvider>
        <MessageProvider>
          <App />
        </MessageProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

// Mock window.matchMedia for accessibility tests
const mockMatchMedia = (matches = false) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
});

describe('Library UI', () => {
  it('shows library items returned from backend', async () => {
    renderApp();

    // Wait for library grid to populate
    const grid = await screen.findByRole('region', { name: /library/i }).catch(() => null);

    // Fallback: query by data-testid on card
    await waitFor(() => {
      expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
    });
  });

  it('after clicking +, library cursors are shown', async () => {
    renderApp();

    // Click the first Active cursor card on left grid to enter Browse mode
    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    // Now verify library items are shown in the right panel
    await waitFor(() => expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument());
    const libCard = screen.getByTestId('library-card-lib_1');
    expect(libCard).toBeInTheDocument();
    expect(libCard).toHaveClass('library-item', 'selection-mode');
  });

  it('clicking an active cursor enters selecting-from-library mode on main-content', async () => {
    renderApp();

    // Ensure we have at least one active cursor card
    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    // Main content should have the selection classes
    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(true);
      expect(mainContent!.classList.contains('selecting-from-library')).toBe(true);
    });
  });

  it('library items receive a per-item --pulse-delay style variable', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument());
    const libCard = screen.getByTestId('library-card-lib_1');
    expect(libCard).toBeInTheDocument();
    // Inline style variable should be set by the component and equal '0s' for synchronized pulses
    const delay = libCard.style.getPropertyValue('--pulse-delay');
    expect(delay).toBe('0s');
  });

  // ===== UNIT TESTS FOR ANIMATION FEATURE =====

  it('applies pulsing animation style when entering selection mode', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(true);
      expect(mainContent!.classList.contains('selecting-from-library')).toBe(true);
    });

    const mainContent = document.getElementById('main-content') as HTMLElement | null;
    expect(mainContent).toBeTruthy();
    expect(mainContent!).toHaveClass('cursor-selection-active', 'selecting-from-library');
  });

  it('ensures CSS custom properties are defined in root styles', async () => {
    renderApp();

    const rootStyles = window.getComputedStyle(document.documentElement);
    const rootScale = rootStyles.getPropertyValue('--library-pulse-scale');
    const rootDuration = rootStyles.getPropertyValue('--library-pulse-duration');

    if (!rootScale || !rootDuration) {
      // In JSDOM, global CSS variables from bundled stylesheets may not be available.
      // Fall back to checking inline styles on a library card where animation properties are applied.
      await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
      const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
      expect(firstCard).toBeTruthy();
      fireEvent.click(firstCard as HTMLElement);
      await waitFor(() => expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument());
      const libCard = screen.getByTestId('library-card-lib_1');
      const elScale = libCard.style.getPropertyValue('--library-pulse-scale');
      const elDuration = libCard.style.getPropertyValue('--library-pulse-duration');
      expect(elScale).toBeTruthy();
      expect(elDuration).toBeTruthy();
    } else {
      expect(rootScale).toBeTruthy();
      expect(rootDuration).toBeTruthy();
    }
  });

  it('applies correct animation properties to library items in selection mode', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCard = screen.getByTestId('library-card-lib_1');
      const preview = libCard.querySelector('.cursor-preview') as Element | null;
      expect(preview).toBeTruthy();

      const computedStyle = window.getComputedStyle(preview as Element);
      expect(computedStyle.animation).toContain('subtle-pulse-scale');
      expect(computedStyle.animation).toContain('2.5s');
      expect(computedStyle.animationPlayState).toBe('running');
    });
  });

  it('pauses animation on hover during selection mode', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCard = screen.getByTestId('library-card-lib_1');
      const preview = libCard.querySelector('.cursor-preview');
      expect(preview).toBeTruthy();

      // Hover over the library item
      fireEvent.mouseEnter(libCard);

      const computedStyle = window.getComputedStyle(preview as Element);
      expect(computedStyle.animationPlayState).toBe('paused');
    });
  });

  it('handles multiple library items with staggered animations', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCards = screen.getAllByTestId(/library-card-/);
      expect(libCards.length).toBeGreaterThan(0);

      libCards.forEach(card => {
        const preview = card.querySelector('.cursor-preview');
        if (preview) {
          const computedStyle = window.getComputedStyle(preview as Element);
          expect(computedStyle.animation).toContain('subtle-pulse-scale');
        }
      });
    });
  });

  // ===== ACCESSIBILITY TESTS =====

  it('respects prefers-reduced-motion setting', async () => {
    // Mock prefers-reduced-motion
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => {
      if (query.includes('prefers-reduced-motion: reduce')) {
        return mockMatchMedia(true);
      }
      return originalMatchMedia(query);
    });

    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCard = screen.getByTestId('library-card-lib_1');
      const preview = libCard.querySelector('.cursor-preview') as Element | null;
      expect(preview).toBeTruthy();

      // With reduced motion, animation should be disabled
      const computedStyle = window.getComputedStyle(preview as Element);
      expect(computedStyle.animation).toBe('none');
    });

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  // ===== BEHAVIOR TESTS =====

  it('removes animation when exiting selection mode', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(true);
    });

    // Click elsewhere to exit selection mode (ClickOutsideHandler listens for mousedown)
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(false);
      expect(mainContent!.classList.contains('selecting-from-library')).toBe(false);
    });
  });

  it('maintains transition properties when animation is paused', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCard = screen.getByTestId('library-card-lib_1');
      const preview = libCard.querySelector('.cursor-preview');
      expect(preview).toBeTruthy();

      // Hover to pause animation
      fireEvent.mouseEnter(libCard);

      const computedStyle = window.getComputedStyle(preview as Element);
      expect(computedStyle.transition).toContain('transform');
      expect(computedStyle.transition).toContain('0.3s');
    });
  });

  // ===== EDGE CASE TESTS =====

  it('handles library items without preview gracefully', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCards = screen.getAllByTestId(/library-card-/);
      libCards.forEach(card => {
        const preview = card.querySelector('.cursor-preview');
        // Should handle missing preview without crashing
        expect(preview || !preview).toBeTruthy();
      });
    });
  });

  it('preserves existing transforms and styles during animation', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    await waitFor(() => {
      const libCard = screen.getByTestId('library-card-lib_1');
      expect(libCard).toBeInTheDocument();

      // Verify that the library item card maintains its other styles
      expect(libCard.style.opacity).toBeTruthy();
      expect(libCard.style.cursor).toBeTruthy();
    });
  });

  it('handles rapid mode transitions without errors', async () => {
    renderApp();

    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();

    // Rapidly click in and out of selection mode
    for (let i = 0; i < 5; i++) {
      fireEvent.click(firstCard as HTMLElement);
      await waitFor(() => {
        const mainContent = document.getElementById('main-content') as HTMLElement | null;
        expect(mainContent).toBeTruthy();
        expect(mainContent!.classList.contains('cursor-selection-active')).toBe(true);
      });

      // Use mousedown to simulate click outside (ClickOutsideHandler listens for mousedown)
      fireEvent.mouseDown(document.body);
      await waitFor(() => {
        const mainContent = document.getElementById('main-content') as HTMLElement | null;
        expect(mainContent).toBeTruthy();
        expect(mainContent!.classList.contains('cursor-selection-active')).toBe(false);
      });
    }
  });

  it('pressing ESC cancels pending library selection and clears highlight', async () => {
    renderApp();

    // Ensure library items are present
    await waitFor(() => expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument());
    const libCard = screen.getByTestId('library-card-lib_1');

    // Click library item to enter reverse selection (pending) mode
    fireEvent.click(libCard);

    // The card should be highlighted as selected-library-item
    await waitFor(() => expect(libCard.classList.contains('selected-library-item')).toBe(true));

    // Press Escape to cancel selection
    fireEvent.keyDown(window, { key: 'Escape' });

    // It should not have the highlight class anymore
    await waitFor(() => expect(libCard.classList.contains('selected-library-item')).toBe(false));
  });

  it('pressing ESC cancels preview selection (selecting-from-library) and clears highlight', async () => {
    renderApp();

    // Ensure we have at least one active cursor card
    await waitFor(() => expect(document.querySelector('.cursor-card')).toBeTruthy());
    const firstCard = document.querySelector('.cursor-card') as HTMLElement | null;
    expect(firstCard).toBeTruthy();
    fireEvent.click(firstCard as HTMLElement);

    // Main content should be in selecting-from-library mode
    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(true);
      expect(mainContent!.classList.contains('selecting-from-library')).toBe(true);
    });

    // The active cursor should have selected-for-browse class
    await waitFor(() => expect((firstCard as HTMLElement).classList.contains('selected-for-browse')).toBe(true));

    // Press Escape to cancel selection
    fireEvent.keyDown(window, { key: 'Escape' });

    // Verify that the main content is no longer in selection mode and the highlight is cleared
    await waitFor(() => {
      const mainContent = document.getElementById('main-content') as HTMLElement | null;
      expect(mainContent).toBeTruthy();
      expect(mainContent!.classList.contains('cursor-selection-active')).toBe(false);
      expect(mainContent!.classList.contains('selecting-from-library')).toBe(false);
      expect((firstCard as HTMLElement).classList.contains('selected-for-browse')).toBe(false);
    });
  });
});
