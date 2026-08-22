/**
 * EmergencyAlertScreen
 *
 * Full-screen alert view for an incoming SOS.
 * Plays loud siren (via hook). Displays distance, coordinates, and timestamp.
 * Allows volunteer to ACCEPT or DECLINE.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  VolumeX,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { emergencyResponseApi } from "../../services/emergencyResponseApi";
import { useEmergencyAlerts } from "../../hooks/useEmergencyAlerts";
import type { SOSAlert, DeclineReason } from "../../types/emergency";
import { cn } from "../../utils/cn";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function EmergencyAlertScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { stopSiren } = useEmergencyAlerts();
  
  const [alert, setAlert] = useState<SOSAlert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Fetch alert details
  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    const fetchAlert = async () => {
      try {
        const data = await emergencyResponseApi.getAlertDetails(id);
        if (isMounted) setAlert(data);
      } catch (err) {
        if (isMounted) setError("Failed to load alert details");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchAlert();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Clean up siren when leaving
  useEffect(() => {
    return () => stopSiren();
  }, [stopSiren]);

  const handleMute = () => {
    stopSiren();
    setIsMuted(true);
  };

  const handleAccept = async () => {
    if (!alert) return;
    setIsProcessing(true);
    stopSiren();
    
    try {
      await emergencyResponseApi.acceptAlert(alert.id);
      navigate(`/volunteer/response/${alert.id}`, { replace: true });
    } catch (err) {
      console.error("Failed to accept alert:", err);
      // Fallback navigation even on error for MVP demo purposes
      navigate(`/volunteer/response/${alert.id}`, { replace: true });
    }
  };

  const handleDecline = async (reason: DeclineReason = "UNABLE_TO_RESPOND") => {
    if (!alert) return;
    setIsProcessing(true);
    stopSiren();
    
    try {
      await emergencyResponseApi.declineAlert(alert.id, reason);
      navigate("/volunteer/dashboard", { replace: true });
    } catch (err) {
      console.error("Failed to decline alert:", err);
      navigate("/volunteer/dashboard", { replace: true });
    }
  };

  if (isLoading) return <LoadingState fullScreen message="Loading alert details..." />;
  if (error || !alert) return <ErrorState message={error || "Alert not found"} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-[#D32F2F] flex flex-col relative overflow-hidden">
      {/* Animated background rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[800px] max-h-[800px] pointer-events-none opacity-20">
        <motion.div
          animate={{ scale: [1, 2], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-white rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-white rounded-full"
        />
      </div>

      {/* Header */}
      <header className="px-6 py-6 flex justify-between items-start relative z-10">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-bold tracking-wider uppercase">
            Live Alert
          </span>
        </div>
        
        {!isMuted && (
          <button 
            onClick={handleMute}
            className="w-10 h-10 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/30 transition-colors"
          >
            <VolumeX className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 flex flex-col justify-center relative z-10 pb-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-2xl mb-6">
            <AlertOctagon className="w-12 h-12 text-[#D32F2F] animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase mb-2">
            SOS Request
          </h1>
          <p className="text-red-100 text-lg font-medium">
            Emergency reported nearby
          </p>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-2xl mb-8"
        >
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Distance</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">
                {alert.distance ? `~${Math.round(alert.distance)}m` : "Unknown"}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Time</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">
                {formatTimeAgo(new Date(alert.timestamp))}
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D32F2F] mt-0.5 shrink-0" />
            <p className="text-sm text-red-900 font-medium leading-relaxed">
              A user in your vicinity has triggered an emergency SOS. Please respond if you are able to help safely.
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {showDeclineReason ? (
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <h3 className="font-bold text-gray-900 mb-4 text-center">Why are you declining?</h3>
              <div className="space-y-2 mb-4">
                <Button variant="secondary" className="w-full justify-start h-12" onClick={() => handleDecline("TOO_FAR")} disabled={isProcessing}>
                  Too far away
                </Button>
                <Button variant="secondary" className="w-full justify-start h-12" onClick={() => handleDecline("NOT_AVAILABLE")} disabled={isProcessing}>
                  Not available right now
                </Button>
                <Button variant="secondary" className="w-full justify-start h-12" onClick={() => handleDecline("OTHER")} disabled={isProcessing}>
                  Other reason
                </Button>
              </div>
              <Button variant="ghost" className="w-full text-gray-500" onClick={() => setShowDeclineReason(false)} disabled={isProcessing}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className={cn(
                  "w-full bg-white text-[#D32F2F] font-black text-xl py-5 rounded-full shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-95",
                  isProcessing && "opacity-70"
                )}
              >
                <CheckCircle2 className="w-7 h-7" />
                ACCEPT RESPONSE
              </button>
              
              <button
                onClick={() => setShowDeclineReason(true)}
                disabled={isProcessing}
                className="w-full bg-black/20 backdrop-blur-md text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-black/30 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                Decline
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
