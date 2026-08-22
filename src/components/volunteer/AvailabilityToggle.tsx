/**
 * AvailabilityToggle Component
 *
 * Toggle control for volunteer availability status.
 * Visual states: 🟢 AVAILABLE, 🔴 UNAVAILABLE, 🟡 RESPONDING, ⚫ OFFLINE
 * Syncs with backend via volunteerApi.
 */

import { useState } from "react";
import { cn } from "../../utils/cn";
import { volunteerApi } from "../../services/volunteerApi";
import { useVolunteer } from "../../store/volunteerStore";
import type { AvailabilityStatus } from "../../types/volunteer";

interface AvailabilityToggleProps {
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; description: string; dotColor: string; bgColor: string; textColor: string }
> = {
  AVAILABLE: {
    label: "Available",
    description: "You may receive nearby emergency alerts",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
  },
  UNAVAILABLE: {
    label: "Unavailable",
    description: "You will not receive emergency alerts",
    dotColor: "bg-red-500",
    bgColor: "bg-red-50 border-red-200",
    textColor: "text-red-700",
  },
  RESPONDING: {
    label: "Responding",
    description: "You are currently responding to an emergency",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
  },
  OFFLINE: {
    label: "Offline",
    description: "Connection unavailable",
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-100 border-gray-300",
    textColor: "text-gray-600",
  },
};

export function AvailabilityToggle({
  className,
  compact = false,
}: AvailabilityToggleProps) {
  const { profile, setAvailability } = useVolunteer();
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatus: AvailabilityStatus =
    profile?.availability ?? "OFFLINE";
  const config = STATUS_CONFIG[currentStatus];

  // Only allow toggling between AVAILABLE and UNAVAILABLE
  const canToggle =
    currentStatus === "AVAILABLE" || currentStatus === "UNAVAILABLE";
  const isAvailable = currentStatus === "AVAILABLE";

  const handleToggle = async () => {
    if (!canToggle || isUpdating) return;

    const newStatus: AvailabilityStatus = isAvailable
      ? "UNAVAILABLE"
      : "AVAILABLE";

    setIsUpdating(true);
    try {
      await volunteerApi.updateAvailability(newStatus);
      setAvailability(newStatus);
    } catch (err) {
      console.error("Failed to update availability:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={!canToggle || isUpdating}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all",
          config.bgColor,
          config.textColor,
          canToggle && "cursor-pointer hover:shadow-sm",
          !canToggle && "cursor-default",
          isUpdating && "opacity-60",
          className
        )}
      >
        <span
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            config.dotColor,
            isAvailable && "animate-pulse"
          )}
        />
        {config.label}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all",
        config.bgColor,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "w-4 h-4 rounded-full",
              config.dotColor,
              isAvailable && "animate-pulse"
            )}
          />
          <div>
            <p className={cn("font-bold text-sm", config.textColor)}>
              Response Status
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {canToggle && (
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className={cn(
              "relative w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
              isAvailable
                ? "bg-emerald-500 focus:ring-emerald-500"
                : "bg-gray-300 focus:ring-gray-400",
              isUpdating && "opacity-60"
            )}
          >
            <span
              className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300",
                isAvailable ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
        )}
      </div>
    </div>
  );
}
