/**
 * EmergencyMapScreen
 *
 * Full-screen map view for a specific emergency alert.
 * Shows responder's live location and the emergency location.
 * Uses the existing InteractiveMap component.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { InteractiveMap } from "../../components/map/InteractiveMap";
import { LocationCard } from "../../components/volunteer/LocationCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { emergencyResponseApi } from "../../services/emergencyResponseApi";
import { useDistanceCalculation } from "../../hooks/useDistanceCalculation";
import type { SOSAlert } from "../../types/emergency";

export function EmergencyMapScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [alert, setAlert] = useState<SOSAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    const fetchAlert = async () => {
      try {
        const data = await emergencyResponseApi.getAlertDetails(id);
        if (isMounted) setAlert(data);
      } catch (err) {
        if (isMounted) setError("Failed to load map details");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchAlert();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  const { currentLocation, formattedDistance } = useDistanceCalculation(
    alert?.location
  );

  if (isLoading) return <LoadingState fullScreen message="Loading map..." />;
  if (error || !alert) return <ErrorState message={error || "Alert not found"} onRetry={() => navigate(-1)} />;

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative">
      {/* Floating Header */}
      <header className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none flex justify-between items-start pt-safe-top">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-xs border border-slate-200 pointer-events-auto hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        
        <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs border border-slate-200 pointer-events-auto">
          <span className="text-xs font-bold text-slate-700 tracking-wider uppercase">
            Map View
          </span>
        </div>
      </header>

      {/* Map Area */}
      <div className="flex-1 w-full h-full relative z-0">
        <InteractiveMap
          center={alert.location}
          zoom={16}
          emergencyLocation={alert.location}
          userLocation={currentLocation || undefined}
        />
      </div>

      {/* Floating Bottom Card */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-safe-bottom bg-gradient-to-t from-gray-900/40 to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <LocationCard
            targetLocation={alert.location}
            distance={formattedDistance}
            timestamp={alert.timestamp}
          />
        </div>
      </div>
    </div>
  );
}
