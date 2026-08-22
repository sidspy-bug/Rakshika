/**
 * ErrorState Component
 *
 * Error display with icon, message, and optional retry button.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../utils/cn";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
        className
      )}
    >
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      )}
    </div>
  );
}
