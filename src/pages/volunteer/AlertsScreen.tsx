/**
 * AlertsScreen
 *
 * Displays a list of all active and resolved alerts in the vicinity.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Filter, ShieldAlert } from "lucide-react";
import { EmergencyCard } from "../../components/emergency/EmergencyCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { emergencyResponseApi } from "../../services/emergencyResponseApi";
import { useUserLocation } from "../../hooks/useUserLocation";
import type { SOSAlert } from "../../types/emergency";
import { cn } from "../../utils/cn";

type TabType = "ACTIVE" | "RESOLVED";

export function AlertsScreen() {
  const navigate = useNavigate();
  const { location } = useUserLocation();
  const [activeTab, setActiveTab] = useState<TabType>("ACTIVE");
  
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAlerts = async () => {
      try {
        // In a real app, we'd have a separate endpoint or parameter for resolved alerts
        // For MVP, we fetch all active alerts
        const data = await emergencyResponseApi.getActiveAlerts(
          location?.lat || 0,
          location?.lng || 0
        );
        
        // Mocking some resolved history for demo
        if (isMounted) {
          const resolvedMock = localStorage.getItem("rakshika_mock_active_alert");
          const allAlerts = [...data];
          if (resolvedMock) {
            const parsed = JSON.parse(resolvedMock) as SOSAlert;
            if (parsed.status === "RESOLVED" && !allAlerts.find((a) => a.id === parsed.id)) {
              allAlerts.push(parsed);
            }
          }
          setAlerts(allAlerts);
        }
      } catch (err) {
        console.error("Failed to fetch alerts", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchAlerts();
    return () => { isMounted = false; };
  }, [location]);

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === "ACTIVE") {
      return alert.status === "PENDING" || alert.status === "ALERTED" || alert.status === "ACCEPTED";
    }
    return alert.status === "RESOLVED" || alert.status === "DECLINED";
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[600px] mx-auto border-x border-gray-200">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 pt-safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="font-bold text-gray-900 text-lg">Alerts List</h1>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 py-2 gap-4 border-t border-gray-50">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={cn(
              "pb-3 text-sm font-bold flex-1 border-b-2 transition-colors",
              activeTab === "ACTIVE" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("RESOLVED")}
            className={cn(
              "pb-3 text-sm font-bold flex-1 border-b-2 transition-colors",
              activeTab === "RESOLVED" 
                ? "border-emerald-600 text-emerald-600" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            History
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto pb-safe-bottom">
        {isLoading ? (
          <LoadingState message="Loading alerts..." />
        ) : filteredAlerts.length > 0 ? (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <EmergencyCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No Alerts Found</h3>
            <p className="text-sm text-gray-500 max-w-[250px]">
              {activeTab === "ACTIVE" 
                ? "There are no active emergencies in your vicinity right now." 
                : "You haven't responded to any emergencies yet."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
