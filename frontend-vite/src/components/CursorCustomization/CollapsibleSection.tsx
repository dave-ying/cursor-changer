import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  id: string;
  open: boolean;
  onToggle: () => void;
  openLabel?: string;
  closedLabel?: string;
  maxHeight?: number;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  id,
  open,
  onToggle,
  openLabel = 'Hide',
  closedLabel = 'Show more',
  maxHeight = 200,
  children,
  className = '',
  contentClassName = 'pb-4'
}: CollapsibleSectionProps) {
  const label = open ? openLabel : closedLabel;
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState<number>(0);

  // Measure the content once mounted and whenever it resizes to keep the animation smooth.
  React.useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const next = node.scrollHeight;
      setMeasuredHeight(Math.min(next, maxHeight));
    };

    measure();

    const supportsResizeObserver =
      typeof window !== 'undefined' && 'ResizeObserver' in window;

    if (supportsResizeObserver) {
      const observer = new ResizeObserver(() => {
        if (frame != null) return;
        frame = requestAnimationFrame(measure);
      });
      observer.observe(node);
      return () => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
      };
    }

    const handleResize = () => {
      if (frame != null) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [maxHeight]);

  const expandedHeight = open ? measuredHeight : 0;
  const transitionTiming = 'cubic-bezier(0.33, 1, 0.68, 1)';

  return (
    <div className={className}>
      <Button
        variant="secondary"
        className="rounded-full px-4 py-2 h-auto inline-flex items-center gap-2 w-full justify-center text-left"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
      >
        {label}
      </Button>
      <div
        id={id}
        className={cn(
          'relative overflow-hidden rounded-[calc(var(--radius-surface,12px)/4)] bg-transparent',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        style={{
          height: `${expandedHeight}px`,
          maxHeight: `${maxHeight}px`,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          transition: [
            `height 260ms ${transitionTiming}`,
            `opacity 200ms ease`,
            `transform 260ms ${transitionTiming}`,
            `margin-top 260ms ${transitionTiming}`
          ].join(', '),
          marginTop: open ? '0rem' : '0rem',
          willChange: 'height, opacity, transform, margin-top',
          contain: 'layout paint'
        }}
        aria-hidden={!open}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}
