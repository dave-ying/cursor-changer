import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, style, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    style={{ minHeight: 24, ...style }}
    {...props}>
    <SliderPrimitive.Track
      className="relative w-full grow overflow-hidden rounded-full slider-track">
      <SliderPrimitive.Range
        className="absolute h-full slider-range"
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block rounded-full shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 border-2 cursor-pointer slider-thumb"
      style={{
        width: '18px',
        height: '18px'
      }}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
