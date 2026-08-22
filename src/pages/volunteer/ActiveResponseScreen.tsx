/**
 * ActiveResponseScreen
 *
 * Primary screen for volunteers actively responding to an emergency.
 * Manages the state machine (Accepted -> Arriving -> On Scene -> Resolved)
 * and shows live map and action menu.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { InteractiveMap } from "../../components/map/InteractiveMap";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { ResponseActionMenu } from "../../components/volunteer/ResponseActionMenu";
import { ResolutionDialog } from "../../components/volunteer/ResolutionDialog";
import { emergencyResponseApi } from "../../services/emergencyResponseApi";
import { useDistanceCalculation } from "../../hooks/useDistanceCalculation";
import type { SOSAlert, ResolutionType } from "../../types/emergency";
import type { ResponseState } from "../../types/volunteer";

export function ActiveResponseScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [alert, setAlert] = useState<SOSAlert | null>(null);
  const [responseState, setResponseState] = useState<ResponseState>("ACCEPTED");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    const fetchDetails = async () => {
      try {
        const data = await emergencyResponseApi.getAlertDetails(id);
        if (isMounted) {
          setAlert(data);
          // In a real implementation, we would also fetch the current ResponseState from the backend
          // For MVP mock, we default to ACCEPTED on fresh load.
        }
      } catch (err) {
        if (isMounted) setError("Failed to load response details");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchDetails();
    return () => { isMounted = false; };
  }, [id]);

  const { currentLocation, formattedDistance } = useDistanceCalculation(
    alert?.location
  );

  const handleUpdateState = async (newState: ResponseState) => {
    if (!alert) return;
    setIsUpdating(true);
    try {
      // Mock API call to update status
      await new Promise(resolve => setTimeout(resolve, 600));
      setResponseState(newState);
    } catch (err) {
      console.error("Failed to update state", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async (resolution: ResolutionType) => {
    if (!alert) return;
    setIsUpdating(true);
    try {
      await emergencyResponseApi.resolveIncident(alert.id, resolution);
      navigate("/volunteer/dashboard", { replace: true });
    } catch (err) {
      console.error("Failed to resolve alert", err);
      navigate("/volunteer/dashboard", { replace: true }); // Mock fallback
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCall = () => {
    if (alert?.userPhone) {
      window.open(`tel:${alert.userPhone}`);
    } else {
      console.warn("No phone number available");
    }
  };

  const handleNavigate = () => {
    navigate(`/volunteer/map/${alert?.id}`);
  };

  if (isLoading) return <LoadingState fullScreen message="Loading active response..." />;
  if (error || !alert) return <ErrorState message={error || "Alert not found"} onRetry={() => navigate("/volunteer/dashboard")} />;

  return (
    <div className="h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      
      {/* Top Banner */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white border-b shadow-sm pt-safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Active Response</h1>
              <p className="text-xs font-semibold text-red-600 tracking-wider">
                {responseState.replace("_", " ")}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Distance</p>
            <p className="text-lg font-black text-gray-900">{formattedDistance || "--"}</p>
          </div>
        </div>
      </div>

      {/* Map Background */}
      <div className="flex-1 w-full h-full relative z-0 pt-20">
        <InteractiveMap
          center={alert.location}
          zoom={16}
          emergencyLocation={alert.location}
          userLocation={currentLocation || undefined}
        />
      </div>

      {/* Bottom Action Menu */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-safe-bottom bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
        <ResponseActionMenu
          currentState={responseState}
          onCall={handleCall}
          onNavigate={handleNavigate}
          onUpdateState={handleUpdateState}
          onResolveClick={() => setShowResolutionDialog(true)}
          isUpdating={isUpdating}
        />
      </div>

      {/* Resolution Dialog */}
      {showResolutionDialog && (
        <ResolutionDialog
          onResolve={handleResolve}
          onCancel={() => setShowResolutionDialog(false)}
          isSubmitting={isUpdating}
        />
      )}
      
    </div>
  );
}
