import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const VARIANTS = {
  default: {
    track: "bg-muted",
    range: "bg-foreground/30",
    thumb: "border-border bg-background shadow-sm",
  },
  accent: {
    track: "bg-[hsl(var(--accent-1)/0.20)]",
    range: "bg-[hsl(var(--accent-1))]",
    thumb: "border-[hsl(var(--accent-1)/0.50)] bg-[hsl(var(--accent-1))] shadow-[color:hsl(var(--accent-1)/0.30)]",
  },
  violet: {
    track: "bg-violet-500/20",
    range: "bg-violet-500",
    thumb: "border-violet-400/50 bg-violet-500 shadow-violet-500/30",
  },
  cyan: {
    track: "bg-cyan-500/20",
    range: "bg-cyan-500",
    thumb: "border-cyan-400/50 bg-cyan-500 shadow-cyan-500/30",
  },
  emerald: {
    track: "bg-emerald-500/20",
    range: "bg-emerald-500",
    thumb: "border-emerald-400/50 bg-emerald-500 shadow-emerald-500/30",
  },
  amber: {
    track: "bg-amber-500/20",
    range: "bg-amber-500",
    thumb: "border-amber-400/50 bg-amber-500 shadow-amber-500/30",
  },
  rose: {
    track: "bg-rose-500/20",
    range: "bg-rose-500",
    thumb: "border-rose-400/50 bg-rose-500 shadow-rose-500/30",
  },
};

const Slider = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}>
      <SliderPrimitive.Track
        className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full", v.track)}>
        <SliderPrimitive.Range className={cn("absolute h-full rounded-full", v.range)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn("block h-4 w-4 rounded-full border shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", v.thumb)} />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
