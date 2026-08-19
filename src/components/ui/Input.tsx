import * as React from "react"
import { cn } from "../../utils/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-semibold text-gray-700 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-11",
              error && "border-red-500 focus-visible:ring-red-500",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
