import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const buttonGroupVariants = cva(
  "flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9 flex-shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> {
  orientation?: "horizontal" | "vertical"
}

function ButtonGroup({
  className,
  orientation = "horizontal",
  variant,
  size,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        "min-w-0",
        "w-fit",
        "max-w-full",
        className
      )}
      role="group"
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child
        
        const isFirst = index === 0
        const isLast = index === React.Children.count(children) - 1

        return (
          <React.Fragment key={index}>
            {React.cloneElement(child as React.ReactElement<any>, {
              variant,
              size,
              className: cn(
                buttonGroupVariants({ variant, size }),
                !isFirst && !isLast && "rounded-none",
                isFirst && !isLast && "rounded-r-none",
                !isFirst && isLast && "rounded-l-none",
                !isFirst && !isLast && "border-r-0",
                "whitespace-nowrap",
                "overflow-hidden",
                "text-ellipsis",
                (child as React.ReactElement<any>).props.className
              ),
            })}
            {!isLast && orientation === "horizontal" && (
              <Separator orientation="vertical" className="h-auto" />
            )}
            {!isLast && orientation === "vertical" && (
              <Separator orientation="horizontal" className="w-auto" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface ButtonGroupTextProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> {}

function ButtonGroupText({
  className,
  variant,
  size,
  children,
  ...props
}: ButtonGroupTextProps) {
  return (
    <div
      className={cn(
        buttonGroupVariants({ variant, size }),
        "pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ButtonGroupSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof Separator> {}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: ButtonGroupSeparatorProps) {
  return (
    <Separator
      orientation={orientation}
      className={cn("", className)}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
  buttonGroupVariants,
}
