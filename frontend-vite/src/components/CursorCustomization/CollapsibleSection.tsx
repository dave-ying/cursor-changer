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
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${!open ? '-mt-1' : contentClassName}`}
        style={{
          maxHeight: open ? `${maxHeight}px` : '0px',
          opacity: open ? 1 : 0
        }}
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
