import * as React from "react"
import { cn } from "../../utils/cn"

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
