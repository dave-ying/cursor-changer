import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { logger } from '../../utils/logger';

interface ModeToggleProps {
  value: string;
  onValueChange: (newValue: string) => void;
}

export function ModeToggle({ value, onValueChange }: ModeToggleProps) {
  const handleValueChange = (newValue: string) => {
    // Only call onValueChange if the value actually changed
    if (newValue !== value) {
      logger.debug(`[ModeToggle] Mode change requested: ${value} -> ${newValue}`);
      onValueChange(newValue);
    } else {
      logger.debug(`[ModeToggle] Ignored redundant mode change to ${newValue} (already active)`);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleValueChange}
      className="bg-muted rounded-full p-1"
    >
      <ToggleGroupItem
        value="simple"
        className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Simple
      </ToggleGroupItem>
      <ToggleGroupItem
        value="advanced"
        className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Advanced
      </ToggleGroupItem>
    </ToggleGroup>
  );
}