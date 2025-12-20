import * as React from 'react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './error-boundary';
import { logger } from '@/utils/logger';

interface SafeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  errorBoundary?: boolean;
}

// Enhanced Card component with error boundary protection
const SafeCard = React.forwardRef<HTMLDivElement, SafeCardProps>(
  ({ className, errorBoundary = true, ...props }, ref) => {
    try {
      const cardElement = (
        <div
          ref={ref}
          className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            className
          )}
          {...props}
          data-card="true"
        />
      );

      if (errorBoundary) {
        return (
          <ErrorBoundary 
            name="Card" 
            showDetails={false} 
            enableRetry={true}
            fallback={({ error }) => (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-red-600 text-sm">
                  <strong>Card Error:</strong> {error?.message || 'Unknown error'}
                </div>
              </div>
            )}
          >
            {cardElement}
          </ErrorBoundary>
        );
      }

      return cardElement;
    } catch (error) {
      logger.error('[SafeCard] Error rendering card:', error);
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-red-600 text-sm">
            <strong>Card Error:</strong> Failed to render card component
          </div>
        </div>
      );
    }
  }
);

SafeCard.displayName = "SafeCard";

// Card components with error boundary protection
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  try {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
      />
    );
  } catch (error) {
    logger.error('[CardHeader] Error rendering header:', error);
    return (
      <div className="flex flex-col space-y-1.5 p-6 text-red-600 text-sm">
        Error rendering card header
      </div>
    );
  }
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  try {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  } catch (error) {
    logger.error('[CardTitle] Error rendering title:', error);
    return (
      <h3 className="text-2xl font-semibold leading-none tracking-tight text-red-600 text-sm">
        Error rendering title
      </h3>
    );
  }
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  try {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  } catch (error) {
    logger.error('[CardDescription] Error rendering description:', error);
    return (
      <p className="text-sm text-red-500">
        Error rendering description
      </p>
    );
  }
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  try {
    return (
      <div ref={ref} className={cn("p-6", className)} {...props} />
    );
  } catch (error) {
    logger.error('[CardContent] Error rendering content:', error);
    return (
      <div className="p-6 text-red-600 text-sm">
        Error rendering card content
      </div>
    );
  }
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  try {
    return (
      <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
      />
    );
  } catch (error) {
    logger.error('[CardFooter] Error rendering footer:', error);
    return (
      <div className="flex items-center p-6 pt-0 text-red-600 text-sm">
        Error rendering card footer
      </div>
    );
  }
});
CardFooter.displayName = "CardFooter";

// Export both the safe version and the original with error boundaries
export { SafeCard, SafeCard as Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

// Also export the original for backward compatibility
const OriginalCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
OriginalCard.displayName = "OriginalCard";

export { OriginalCard };
