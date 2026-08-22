/**
 * StatusBadge Component
 *
 * Reusable status indicator for verification, availability, and response states.
 * Maps status values to visual colors and icons.
 */

import { cn } from "../../utils/cn";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  Circle,
} from "lucide-react";
import type { VerificationStatus, AvailabilityStatus } from "../../types/volunteer";

type BadgeVariant = "verification" | "availability" | "response";

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  size?: "sm" | "default" | "lg";
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
}

const VERIFICATION_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; bgColor: string; Icon: typeof CheckCircle2 }
> = {
  PENDING: {
    label: "Pending Verification",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    Icon: Clock,
  },
  VERIFIED: {
    label: "Verified",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    Icon: XCircle,
  },
  SUSPENDED: {
    label: "Suspended",
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-300",
    Icon: Ban,
  },
};

const AVAILABILITY_CONFIG: Record<
  AvailabilityStatus,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  AVAILABLE: {
    label: "Available",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    dotColor: "bg-red-500",
  },
  RESPONDING: {
    label: "Responding",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    dotColor: "bg-amber-500",
  },
  OFFLINE: {
    label: "Offline",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-300",
    dotColor: "bg-gray-400",
  },
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5 gap-1",
  default: "text-sm px-3 py-1 gap-1.5",
  lg: "text-base px-4 py-1.5 gap-2",
};

const ICON_SIZES = {
  sm: "w-3 h-3",
  default: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StatusBadge({
  status,
  variant = "verification",
  size = "default",
  className,
  showIcon = true,
  showLabel = true,
}: StatusBadgeProps) {
  if (variant === "verification") {
    const config = VERIFICATION_CONFIG[status as VerificationStatus];
    if (!config) return null;
    const { label, color, bgColor, Icon } = config;

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-semibold",
          bgColor,
          color,
          SIZE_CLASSES[size],
          className
        )}
      >
        {showIcon && <Icon className={ICON_SIZES[size]} />}
        {showLabel && label}
      </span>
    );
  }

  if (variant === "availability") {
    const config = AVAILABILITY_CONFIG[status as AvailabilityStatus];
    if (!config) return null;
    const { label, color, bgColor, dotColor } = config;

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border font-semibold",
          bgColor,
          color,
          SIZE_CLASSES[size],
          className
        )}
      >
        {showIcon && (
          <span className={cn("rounded-full", dotColor, {
            "w-2 h-2": size === "sm",
            "w-2.5 h-2.5": size === "default",
            "w-3 h-3": size === "lg",
          })} />
        )}
        {showLabel && label}
      </span>
    );
  }

  // Generic response variant
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold bg-gray-50 border-gray-200 text-gray-700",
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && <Circle className={ICON_SIZES[size]} />}
      {showLabel && status}
    </span>
  );
}
