/**
 * EmptyState Component
 *
 * Display when a list or section has no content.
 */

import { Inbox } from "lucide-react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title = "Nothing here yet",
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
        className
      )}
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        {icon ?? <Inbox className="w-8 h-8 text-gray-400" />}
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 max-w-xs">{message}</p>
      </div>
      {action}
    </div>
  );
}
