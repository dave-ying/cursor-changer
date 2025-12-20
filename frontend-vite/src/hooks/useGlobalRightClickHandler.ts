import { useEffect } from 'react';

/**
 * Custom hook to handle global right-click behavior
 * Disables right-click everywhere except on specific cursor components
 */
export function useGlobalRightClickHandler() {
  useEffect(() => {
    /**
     * Check if the clicked element is a cursor component that should allow right-click
     * @param target - The DOM element that was clicked
     * @returns true if right-click should be allowed, false otherwise
     */
    const isCursorComponent = (target: HTMLElement | null): boolean => {
      if (!target) return false;

      // Check if the target or any of its parents is a cursor card
      let currentElement: HTMLElement | null = target;
      while (currentElement) {
        // Check for active cursor cards
        if (currentElement.classList.contains('cursor-card')) {
          return true;
        }

        // Check for library cursor items
        if (currentElement.classList.contains('library-item')) {
          return true;
        }

        // Check for cursor preview elements
        if (currentElement.classList.contains('cursor-preview')) {
          return true;
        }

        // Check for cursor preview images
        if (currentElement.classList.contains('cursor-preview-img')) {
          return true;
        }

        // Check for cursor name elements
        if (currentElement.classList.contains('cursor-name')) {
          return true;
        }

        currentElement = currentElement.parentElement;
      }

      return false;
    };

    /**
     * Global right-click handler
     */
    const handleContextMenu = (event: MouseEvent) => {
      // Check if the right-click is on a cursor component
      const target = event.target as HTMLElement;
      const isCursor = isCursorComponent(target);

      // If it's not a cursor component, prevent the default context menu
      if (!isCursor) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Allow the event to proceed for cursor components
      return true;
    };

    // Add event listener for contextmenu (right-click)
    document.addEventListener('contextmenu', handleContextMenu, { capture: true });

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, []); // Empty dependency array means this effect runs once on mount
}