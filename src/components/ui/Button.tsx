import * as React from "react"
import { cn } from "../../utils/cn"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "danger" | "ghost"
  size?: "sm" | "default" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] disabled:pointer-events-none disabled:opacity-50 select-none",
          {
            "bg-[#D32F2F] text-white hover:bg-[#b71c1c] active:bg-[#9a1414] shadow-xs": variant === "default",
            "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 shadow-xs": variant === "secondary",
            "bg-[#D32F2F] text-white hover:bg-red-700 active:bg-red-800 shadow-xs": variant === "danger",
            "hover:bg-slate-100 text-slate-700 active:bg-slate-200 shadow-none": variant === "ghost",
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-12 rounded-xl px-6 text-base": size === "lg",
            "h-10 w-10 p-0 rounded-lg": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
