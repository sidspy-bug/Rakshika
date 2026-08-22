/**
 * VolunteerDashboardScreen
 *
 * Central hub for verified volunteers.
 * Manages availability, shows location status, active alerts, and quick actions.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  User,
  History,
  AlertTriangle,
  Bell,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { AvailabilityToggle } from "../../components/volunteer/AvailabilityToggle";
import { LocationStatusCard } from "../../components/volunteer/LocationStatusCard";
import { EmergencyCard } from "../../components/emergency/EmergencyCard";
import { useVolunteer } from "../../store/volunteerStore";
import { emergencyResponseApi } from "../../services/emergencyResponseApi";
import { useUserLocation } from "../../hooks/useUserLocation";
import type { SOSAlert } from "../../types/emergency";

export function VolunteerDashboardScreen() {
  const navigate = useNavigate();
  const { profile } = useVolunteer();
  const { location } = useUserLocation();
  
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      try {
        const alerts = await emergencyResponseApi.getActiveAlerts(
          location?.lat || 0,
          location?.lng || 0
        );
        if (isMounted) setActiveAlerts(alerts);
      } catch (err) {
        console.error("Failed to fetch dashboard alerts:", err);
      } finally {
        if (isMounted) setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();
    // Poll every 10 seconds for demo purposes
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[600px] mx-auto border-x border-gray-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 pt-safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Rakshika</h1>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
                Responder
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/volunteer/alerts")}>
              <Bell className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/volunteer/profile")}>
              <User className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 space-y-6 overflow-y-auto pb-safe-bottom">
        {/* Welcome & Status */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">
                  Hi, {profile?.fullName?.split(" ")[0] ?? "Volunteer"}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {profile?.organization ?? "Rakshika Network"}
                </p>
              </div>
            </div>
            <StatusBadge
              status={profile?.verificationStatus ?? "PENDING"}
              variant="verification"
              size="sm"
            />
          </div>

          <AvailabilityToggle />
        </motion.div>

        {/* Location Status */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <LocationStatusCard />
        </motion.div>

        {/* Active Alerts Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
              Active Alerts
            </h3>
            <button 
              onClick={() => navigate("/volunteer/alerts")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoadingAlerts ? (
            <div className="bg-gray-100 rounded-2xl h-24 animate-pulse" />
          ) : activeAlerts.length > 0 ? (
            <div className="space-y-3">
              {activeAlerts.slice(0, 2).map((alert) => (
                <EmergencyCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 border-dashed p-6 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900 text-sm">No Active Alerts</p>
              <p className="text-xs text-gray-500 mt-1">
                Your area is currently safe. Stay alert!
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate("/volunteer/history")}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left hover:border-blue-200 transition-colors group"
          >
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <History className="w-5 h-5" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Response History</p>
            <p className="text-xs text-gray-500 mt-0.5">{profile?.responseCount ?? 0} total</p>
          </button>
          
          <button
            onClick={() => navigate("/volunteer/safety")}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-left hover:border-amber-200 transition-colors group"
          >
            <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Safety Guidelines</p>
            <p className="text-xs text-gray-500 mt-0.5">Review protocols</p>
          </button>
        </motion.div>

      </main>
    </div>
  );
}
