import React from 'react';
import { Button } from '@/components/ui/button';

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
  const [measuredHeight, setMeasuredHeight] = React.useState<number>(maxHeight);

  // Measure once when content changes or opens to avoid layout thrash during animation
  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const next = el.scrollHeight;
    // Clamp to provided maxHeight to preserve original look
    setMeasuredHeight(Math.min(next, maxHeight));
  }, [children, maxHeight, open]);

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
        ref={contentRef}
        id={id}
        className={`overflow-hidden ${!open ? '-mt-1' : contentClassName}`}
        style={{
          // Animate only height/opacity to avoid repeated full reflow of siblings
          height: open ? `${measuredHeight}px` : '0px',
          maxHeight: `${maxHeight}px`,
          opacity: open ? 1 : 0,
          transition: 'height 240ms ease, opacity 200ms ease',
          willChange: 'height, opacity',
          contain: 'layout paint'
        }}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
