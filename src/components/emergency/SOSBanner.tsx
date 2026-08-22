/**
 * SOSBanner Component
 *
 * Persistent banner shown across all screens when an active SOS is nearby.
 * Tapping the banner navigates to the alert details screen.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useEmergencyAlerts } from "../../hooks/useEmergencyAlerts";

export function SOSBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAlerts } = useEmergencyAlerts();

  // Don't show the banner if we are already on the alert screen or active response screen
  if (
    location.pathname.includes("/volunteer/alert/") ||
    location.pathname.includes("/volunteer/response/")
  ) {
    return null;
  }

  const alert = activeAlerts[0]; // Show the first active alert

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe-top pb-2 bg-gradient-to-b from-[#D32F2F]/10 to-transparent pointer-events-none"
        >
          <button
            onClick={() => navigate(`/volunteer/alert/${alert.id}`)}
            className="w-full max-w-lg mx-auto bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-2xl p-4 shadow-lg shadow-red-500/30 flex items-center gap-4 transition-colors pointer-events-auto active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-black text-sm uppercase tracking-wider mb-0.5">
                SOS Alert Nearby
              </h3>
              <p className="text-red-100 text-xs font-medium">
                {alert.distance
                  ? `~${Math.round(alert.distance)}m away`
                  : "Tap to view details"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-200" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
