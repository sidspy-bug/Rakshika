/**
 * ResponseActionMenu Component
 *
 * Floating action menu for active responses. Provides quick access to
 * calling the user, starting navigation, marking arrival, and resolving.
 */

import { Phone, Navigation, MapPin, CheckCircle2 } from "lucide-react";
import type { ResponseState } from "../../types/volunteer";

interface ResponseActionMenuProps {
  currentState: ResponseState;
  onCall: () => void;
  onNavigate: () => void;
  onUpdateState: (newState: ResponseState) => void;
  onResolveClick: () => void;
  isUpdating: boolean;
}

export function ResponseActionMenu({
  currentState,
  onCall,
  onNavigate,
  onUpdateState,
  onResolveClick,
  isUpdating,
}: ResponseActionMenuProps) {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-2xl border border-gray-100 pointer-events-auto max-w-lg mx-auto w-full">
      
      {/* Primary Status Update Action */}
      <div className="mb-4">
        {currentState === "ACCEPTED" ? (
          <button
            onClick={() => onUpdateState("RESPONDING")}
            disabled={isUpdating}
            className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <MapPin className="w-5 h-5" />
            I'm Approaching
          </button>
        ) : currentState === "RESPONDING" ? (
          <button
            onClick={() => onUpdateState("ARRIVING")}
            disabled={isUpdating}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <MapPin className="w-5 h-5" />
            I'm On Scene
          </button>
        ) : currentState === "ARRIVING" ? (
          <button
            onClick={onResolveClick}
            disabled={isUpdating}
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            <CheckCircle2 className="w-5 h-5" />
            Resolve Incident
          </button>
        ) : null}
      </div>

      {/* Secondary Actions Row */}
      <div className="flex gap-3">
        <button
          onClick={onCall}
          className="flex-1 h-12 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call User
        </button>
        
        <button
          onClick={onNavigate}
          className="flex-1 h-12 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation className="w-4 h-4" />
          Map View
        </button>
      </div>

    </div>
  );
}
