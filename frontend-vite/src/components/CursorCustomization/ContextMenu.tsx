import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { logger } from '../../utils/logger';

/**
 * ContextMenu component for cursor library items
 * Renders a context menu with Apply, Edit, and Delete options
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the menu is visible
 * @param {number} props.x - X position (clientX from mouse event)
 * @param {number} props.y - Y position (clientY from mouse event)
 * @param {Function} props.onClose - Callback when menu should close
 * @param {Function} props.onApply - Callback for Apply action
 * @param {Function} props.onClickPointEdit - Callback for Click Point Edit action
 * @param {Function} props.onDelete - Callback for Delete action
 */
interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onApply: () => void;
  onClickPointEdit?: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

export function ContextMenu({ isOpen, x, y, onClose, onApply, onClickPointEdit, onDelete, onEdit }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close menu
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Small delay to prevent immediate close from the same click that opened it
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Calculate position to keep menu within viewport
    useEffect(() => {
        if (!isOpen || !menuRef.current) return;

        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        // Adjust X if menu would overflow right edge
        if (x + menuRect.width > viewportWidth) {
            adjustedX = viewportWidth - menuRect.width - 8;
        }

        // Adjust Y if menu would overflow bottom edge
        if (y + menuRect.height > viewportHeight) {
            adjustedY = viewportHeight - menuRect.height - 8;
        }

        menu.style.left = `${adjustedX}px`;
        menu.style.top = `${adjustedY}px`;
    }, [isOpen, x, y]);

    if (!isOpen) return null;

    const handleItemClick = (action?: () => void) => {
        logger.debug('[ContextMenu] handleItemClick called, action:', action);
        if (action) {
            action();
        }
        onClose();
    };

    const menuContent = (
        <div
            id="library-context-menu"
            ref={menuRef}
            className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg"
            style={{
                left: `${x}px`,
                top: `${y}px`,
            }}
            role="menu"
            aria-orientation="vertical"
        >
            <button
                onClick={() => handleItemClick(onApply)}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none cursor-pointer"
                role="menuitem"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Apply
            </button>

            {onEdit && (
              <button
                  onClick={() => handleItemClick(onEdit)}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none cursor-pointer"
                  role="menuitem"
              >
                  <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                  >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                  </svg>
                  Edit
              </button>
            )}

            <div className="my-1 h-px bg-border" role="separator" />

            <button
                onClick={() => handleItemClick(onDelete)}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive focus:outline-none cursor-pointer"
                role="menuitem"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Delete
            </button>
        </div>
    );

    return createPortal(menuContent, document.body);
}