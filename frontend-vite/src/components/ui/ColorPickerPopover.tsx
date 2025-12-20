import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerPopoverProps {
  /** Current color value (hex string like "#ff0000") */
  value: string;
  /** Called when color changes. commit=true means final selection, false means dragging */
  onChange: (color: string, options?: { commit: boolean }) => void;
  /** Whether the popover is open */
  isOpen: boolean;
  /** Called to close the popover */
  onClose: () => void;
  /** Reference to the trigger element for positioning */
  triggerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Shared color picker popover component using react-colorful.
 * Renders as a portal to document.body to avoid overflow clipping.
 */
export function ColorPickerPopover({
  value,
  onChange,
  isOpen,
  onClose,
  triggerRef
}: ColorPickerPopoverProps) {
  const [localColor, setLocalColor] = useState(value);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local color with external value
  useEffect(() => {
    if (value !== localColor) {
      setLocalColor(value);
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  // Commit color on pointer up after dragging
  useEffect(() => {
    const commitColor = (color: string) => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      onChange(color, { commit: true });
    };

    const handlePointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      commitColor(localColor);
    };

    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('touchend', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    document.addEventListener('touchcancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('touchend', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('touchcancel', handlePointerUp);
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
      }
    };
  }, [localColor, onChange]);

  // Position the popover
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const computePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const { innerWidth, innerHeight } = window;
      const gap = 8;

      // Default: place above, right-aligned
      let left = rect.right - 200;
      let top = rect.top - 260 - gap;

      // If not enough space above, place below
      if (top < 8) {
        top = rect.bottom + gap;
      }

      // Clamp horizontally
      if (left < 8) left = 8;
      if (left + 200 > innerWidth - 8) left = innerWidth - 208;

      // Clamp vertically
      if (top + 260 > innerHeight - 8) top = Math.max(8, innerHeight - 268);

      setPopoverPosition({ top: Math.round(top), left: Math.round(left) });
      setPositionReady(true);
    };

    computePosition();
    const raf = requestAnimationFrame(computePosition);
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [isOpen, triggerRef]);

  // Reset position ready when closing
  useEffect(() => {
    if (!isOpen) setPositionReady(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={popoverRef}
      data-testid="color-picker-popover"
      style={{
        position: 'fixed',
        top: popoverPosition.top,
        left: popoverPosition.left,
        zIndex: 20001,
        padding: '12px',
        backgroundColor: '#2c2c2e',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(99, 99, 102, 0.3)',
        visibility: positionReady ? 'visible' : 'hidden'
      }}
    >
      <div onPointerDown={() => { draggingRef.current = true; }}>
        <HexColorPicker
          color={localColor}
          onChange={(c) => {
            setLocalColor(c);
            // Debounce intermediate updates
            if (commitTimerRef.current) {
              clearTimeout(commitTimerRef.current);
            }
            commitTimerRef.current = setTimeout(() => {
              onChange(c, { commit: false });
              commitTimerRef.current = null;
            }, 200);
          }}
        />
      </div>
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <div style={{
          flex: 1,
          height: '32px',
          borderRadius: '4px',
          border: '1px solid rgba(99, 99, 102, 0.3)',
          backgroundColor: '#1c1c1e',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span style={{ color: '#8e8e93', marginRight: '4px' }}>#</span>
          <input
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              outline: 'none',
              border: 'none',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              color: '#ffffff'
            }}
            value={localColor.replace('#', '')}
            onChange={(e) => {
              const newColor = `#${e.target.value}`;
              setLocalColor(newColor);
              if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                onChange(newColor, { commit: false });
              }
            }}
            onBlur={() => onChange(localColor, { commit: true })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onChange(localColor, { commit: true });
                (e.target as HTMLInputElement).blur();
              }
            }}
            maxLength={6}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
