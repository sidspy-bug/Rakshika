/**
 * LoadingState Component
 *
 * Centered loading spinner with optional message.
 * Used as a full-screen or inline loading indicator.
 */

import { cn } from "../../utils/cn";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  fullScreen?: boolean;
}

const SPINNER_SIZES = {
  sm: "w-6 h-6 border-2",
  default: "w-10 h-10 border-3",
  lg: "w-14 h-14 border-4",
};

export function LoadingState({
  message = "Loading...",
  className,
  size = "default",
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen && "min-h-screen",
        !fullScreen && "py-16",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full border-gray-200 border-t-[#D32F2F] animate-spin",
          SPINNER_SIZES[size]
        )}
      />
      {message && (
        <p className="text-sm text-gray-500 font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
