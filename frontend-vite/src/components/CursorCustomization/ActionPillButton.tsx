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
      className={cn('inline-flex items-center gap-4 rounded-full px-4', className)}
      {...props}
    >
      {iconWithSizing}
      <span className="text-base font-medium">{children}</span>
    </Button>
  );
}
