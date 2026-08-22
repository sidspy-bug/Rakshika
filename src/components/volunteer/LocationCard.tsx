/**
 * LocationCard Component
 *
 * Displays emergency location details: distance, coordinates, and freshness.
 * Intended for use in the Active Response and Map screens.
 */

import { MapPin, Navigation, Clock, AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { navigationLauncher } from "../../services/navigationLauncher";
import type { Coords } from "../../types/gis";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface LocationCardProps {
  targetLocation: Coords;
  distance: string | null;
  timestamp: string;
  className?: string;
  compact?: boolean;
}

export function LocationCard({
  targetLocation,
  distance,
  timestamp,
  className,
  compact = false,
}: LocationCardProps) {
  const timeDate = new Date(timestamp);
  const isStale = Date.now() - timeDate.getTime() > 5 * 60 * 1000; // 5 minutes

  const handleNavigate = () => {
    navigationLauncher.openNavigation(targetLocation);
  };

  if (compact) {
    return (
      <div className={cn("bg-white rounded-2xl border p-4 shadow-sm", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{distance || "Unknown"}</p>
              <p className="text-xs text-gray-500">Distance to emergency</p>
            </div>
          </div>
          <Button size="sm" onClick={handleNavigate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4">
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Navigate
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-3xl border border-gray-100 p-5 shadow-sm", className)}>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            Emergency Location
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {targetLocation.lat.toFixed(5)}, {targetLocation.lng.toFixed(5)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gray-900 tracking-tight">
            {distance || "--"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className={cn(
          "rounded-xl p-3 border flex items-start gap-2",
          isStale ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-100"
        )}>
          {isStale ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <div>
            <p className={cn(
              "text-[10px] uppercase font-bold tracking-wider",
              isStale ? "text-amber-700" : "text-emerald-700"
            )}>
              {isStale ? "Last Known" : "Updated"}
            </p>
            <p className={cn(
              "text-xs font-medium mt-0.5",
              isStale ? "text-amber-900" : "text-emerald-900"
            )}>
              {formatTimeAgo(timeDate)}
            </p>
          </div>
        </div>
      </div>

      <Button
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 shadow-lg text-white"
        onClick={handleNavigate}
      >
        <Navigation className="w-5 h-5 mr-2" /> Start Navigation
      </Button>
    </div>
  );
}
