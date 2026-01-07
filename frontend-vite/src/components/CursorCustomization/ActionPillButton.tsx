import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IconElement = React.ReactElement<React.SVGProps<SVGSVGElement>>;

interface ActionPillButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  icon: IconElement;
}

export function ActionPillButton({
  icon,
  children,
  className,
  variant = 'default',
  ...props
}: ActionPillButtonProps) {
  const iconWithSizing = React.cloneElement(icon, {
    className: cn('!h-5 !w-5', icon.props.className),
    'aria-hidden': true
  });

  return (
    <Button
      variant={variant}
      className={cn(
        'inline-flex items-center gap-4 rounded-full px-4 transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]',
        variant === 'secondary'
          ? 'bg-foreground/10 text-foreground hover:bg-foreground/15 border border-border/60'
          : 'bg-primary text-primary-foreground shadow-none hover:bg-primary/70 focus-visible:ring-0',
        className
      )}
      {...props}
    >
      {iconWithSizing}
      <span className="text-base font-medium">{children}</span>
    </Button>
  );
}
