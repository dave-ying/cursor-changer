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
  ...props
}: ActionPillButtonProps) {
  const iconWithSizing = React.cloneElement(icon, {
    className: cn('!h-5 !w-5', icon.props.className),
    'aria-hidden': true
  });

  return (
    <Button
      variant="default"
      className={cn('inline-flex items-center gap-1 rounded-full', className)}
      {...props}
    >
      {iconWithSizing}
      <span className="text-sm font-medium">{children}</span>
    </Button>
  );
}
