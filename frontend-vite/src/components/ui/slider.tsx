import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  thumbClassName?: string
  thumbStyle?: React.CSSProperties
  thumbCursor?: React.CSSProperties['cursor']
  thumbActiveCursor?: React.CSSProperties['cursor']
  thumbChildren?: React.ReactNode
}

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, style, thumbClassName, thumbStyle, thumbCursor = 'pointer', thumbActiveCursor, thumbChildren, ...props }, ref) => {
  const [isThumbActive, setIsThumbActive] = React.useState(false)

  React.useEffect(() => {
    if (!isThumbActive) return
    const handlePointerEnd = () => setIsThumbActive(false)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)
    return () => {
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [isThumbActive])

  const resolvedCursor = isThumbActive && thumbActiveCursor ? thumbActiveCursor : thumbCursor

  return (
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
      className={cn(
        "relative block rounded-full shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 slider-thumb",
        thumbClassName
      )}
      onPointerDown={() => setIsThumbActive(true)}
      onPointerUp={() => setIsThumbActive(false)}
      onPointerCancel={() => setIsThumbActive(false)}
      onLostPointerCapture={() => setIsThumbActive(false)}
      style={{
        width: '18px',
        height: '18px',
        cursor: resolvedCursor,
        ...thumbStyle
      }}
    >
      {thumbChildren}
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
