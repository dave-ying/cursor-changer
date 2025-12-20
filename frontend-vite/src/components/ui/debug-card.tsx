import * as React from 'react';
import { cn } from '@/lib/utils';
import { logger } from '../../utils/logger';

// Debug version of Card component with enhanced logging
const DebugCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  logger.debug('[DebugCard] Rendering with props:', { className });
  
  try {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )}
        {...props}
        onLoad={() => logger.debug('[DebugCard] DOM loaded')}
        onError={(e) => logger.error('[DebugCard] DOM error:', e)}
        data-debug-card="true"
      />
    );
  } catch (error) {
    logger.error('[DebugCard] Render error:', error);
    throw error;
  }
});

DebugCard.displayName = "DebugCard";

export { DebugCard };
