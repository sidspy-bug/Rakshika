/**
 * LocationStatusCard Component
 *
 * Shows the status of background location tracking.
 * Includes timestamp of last update and visual freshness indicator.
 * Warns if location permission is not available.
 */

import { useState, useEffect } from "react";
import { MapPin, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "../../utils/cn";
import { useUserLocation } from "../../hooks/useUserLocation";
import { usePermissions } from "../../hooks/usePermissions";

interface LocationStatusCardProps {
  className?: string;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LocationStatusCard({ className }: LocationStatusCardProps) {
  const { location, error, loading } = useUserLocation();
  const { permissions } = usePermissions();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Update timestamp when coords change
  useEffect(() => {
    if (location) {
      setLastUpdated(new Date());
    }
  }, [location]);

  const isLocationGranted = permissions.location === "granted";

  if (!isLocationGranted) {
    return (
      <div
        className={cn(
          "bg-red-50 border border-red-200 rounded-2xl p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-red-800 text-sm">Location Required</p>
            <p className="text-xs text-red-700 mt-1">
              Please grant location permissions in settings to receive accurate
              emergency alerts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-amber-50 border border-amber-200 rounded-2xl p-4",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm">Location Error</p>
            <p className="text-xs text-amber-700 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white border border-gray-100 rounded-2xl p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              loading ? "bg-blue-50" : "bg-emerald-50"
            )}
          >
            {loading ? (
              <Clock className="w-4 h-4 text-blue-600 animate-spin-slow" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">
              Location Active
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Tracking enabled
            </p>
          </div>
        </div>
        
        {/* Pulsing indicator if active */}
        <div className="relative flex h-3 w-3">
          {!loading && location && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-3 w-3",
              loading ? "bg-blue-500" : "bg-emerald-500"
            )}
          ></span>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            Last Updated
          </p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">
            {lastUpdated
              ? formatTimeAgo(lastUpdated)
              : "Waiting for signal..."}
          </p>
        </div>
      </div>
    </div>
  );
}
