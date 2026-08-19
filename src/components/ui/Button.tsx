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
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] disabled:pointer-events-none disabled:opacity-50 shadow-sm hover:shadow-md",
          {
            "bg-[#D32F2F] text-white hover:bg-[#b71c1c]": variant === "default",
            "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50": variant === "secondary",
            "bg-[#F44336] text-white hover:bg-red-700 shadow-red-500/20": variant === "danger",
            "hover:bg-gray-100 text-gray-700 shadow-none hover:shadow-none": variant === "ghost",
            "h-10 px-5 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-12 rounded-full px-8 text-base font-semibold": size === "lg",
            "h-10 w-10 p-0": size === "icon",
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
