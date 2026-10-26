import * as React from "react"
import { cn } from "../../utils/cn"

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200/90 shadow-sm rounded-xl p-5 transition-all text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const TactileCard = GlassCard;

