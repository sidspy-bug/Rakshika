import type { RouteProfile, Waypoint, RouteSummary } from "../../types/navigation";
import { Trash2, Footprints, Car, Clock, Compass, AlertTriangle, Sparkles, Navigation } from "lucide-react";
import { Button } from "../ui/Button";
import { GlassCard } from "../ui/GlassCard";

interface NavigationPanelProps {
  waypoints: Waypoint[];
  profile: RouteProfile;
  route: RouteSummary | null;
  loading: boolean;
  isNavigating: boolean;
  onProfileChange: (profile: RouteProfile) => void;
  onRemoveWaypoint: (id: string) => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onClear: () => void;
  isOnline: boolean;
}

export function NavigationPanel({
  waypoints,
  profile,
  route,
  loading,
  isNavigating,
  onProfileChange,
  onRemoveWaypoint,
  onStartNavigation,
  onStopNavigation,
  onClear,
  isOnline,
}: NavigationPanelProps) {
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} mins`;
  };

  return (
    <GlassCard className="p-5 border border-gray-800 bg-black/90 text-white shadow-2xl overflow-hidden flex flex-col gap-4 max-w-md w-full mx-auto animate-in slide-in-from-bottom-4 duration-200">
      
      {/* Profile Toggle (Walking vs Driving) */}
      <div className="flex gap-2 p-1 bg-gray-950 rounded-xl border border-gray-900">
        <button
          onClick={() => onProfileChange("foot-walking")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            profile === "foot-walking" ? "bg-emerald-600 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
          disabled={isNavigating}
        >
          <Footprints className="w-4 h-4" />
          Safe Walk
        </button>
        <button
          onClick={() => onProfileChange("driving-car")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            profile === "driving-car" ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white"
          }`}
          disabled={isNavigating}
        >
          <Car className="w-4 h-4" />
          Driving
        </button>
      </div>

      {/* Waypoints List */}
      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
        {/* Start Position (Fixed) */}
        <div className="flex items-center gap-3 bg-gray-950/40 p-2.5 rounded-xl border border-gray-900/50">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] shrink-0"></div>
          <span className="text-xs text-gray-300 font-semibold truncate flex-1">Your Live Location</span>
        </div>

        {/* Target Waypoints */}
        {waypoints.map((wp, idx) => (
          <div
            key={wp.id}
            className="flex items-center gap-3 bg-gray-900/40 p-2.5 rounded-xl border border-gray-800/50 animate-in slide-in-from-right-3 duration-150"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Stop {idx + 1}</span>
              <span className="text-xs text-gray-300 font-semibold truncate block leading-tight">{wp.name}</span>
            </div>
            {!isNavigating && (
              <button
                onClick={() => onRemoveWaypoint(wp.id)}
                className="p-1.5 text-gray-500 hover:text-rose-500 rounded-lg hover:bg-gray-800 transition-colors"
                title="Remove Stop"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-2 text-xs text-gray-400 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          Calculating route segments...
        </div>
      )}

      {/* Route Metadata */}
      {route && !loading && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 bg-gray-950/60 p-3.5 rounded-xl border border-gray-900">
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase block">Distance</span>
                <span className="font-bold text-xs text-gray-200">{formatDistance(route.distance)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[9px] text-gray-500 font-bold uppercase block">Estimated Duration</span>
                <span className="font-bold text-xs text-gray-200">{formatDuration(route.duration)}</span>
              </div>
            </div>
          </div>

          {!isOnline && (
            <div className="bg-amber-950/30 text-amber-500 border border-amber-900/30 text-[10px] font-bold p-2.5 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Offline: Route shown is straight-line approximation. Recalculation is locked.</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex gap-2">
        {isNavigating ? (
          <Button variant="danger" className="w-full font-bold h-11" onClick={onStopNavigation}>
            Stop Navigation
          </Button>
        ) : (
          <>
            <Button
              className="flex-1 font-bold h-11 flex items-center justify-center gap-2"
              onClick={onStartNavigation}
              disabled={!route || loading}
            >
              <Navigation className="w-4 h-4 fill-current" />
              Start Navigation
            </Button>
            <Button
              variant="secondary"
              className="px-4 font-bold h-11 border-gray-800 bg-transparent hover:bg-gray-900 text-gray-400 hover:text-white"
              onClick={onClear}
            >
              Clear
            </Button>
          </>
        )}
      </div>
    </GlassCard>
  );
}
