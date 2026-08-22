/**
 * VolunteerLayout
 *
 * Wrapper layout for verified volunteers, providing a bottom navigation bar.
 */

import { Outlet, NavLink } from "react-router-dom";
import { Shield, Bell, Map, User } from "lucide-react";
import { cn } from "../../utils/cn";
import { OfflineIndicator } from "../volunteer/OfflineIndicator";

export function VolunteerLayout() {
  // Checking for active alerts to show a dot on the Alerts tab
  const hasActiveAlerts = true; // In a real app, bind to store or useEmergencyAlerts

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 max-w-[600px] mx-auto border-x border-gray-200">
      <OfflineIndicator />
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      <nav className="bg-white border-t border-gray-200 pb-safe-bottom shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around px-2 py-2">
          <NavLink
            to="/volunteer/dashboard"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors",
                isActive ? "text-emerald-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )
            }
          >
            <Shield className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Home</span>
          </NavLink>

          <NavLink
            to="/volunteer/alerts"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors relative",
                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )
            }
          >
            <div className="relative">
              <Bell className="w-6 h-6 mb-1" />
              {hasActiveAlerts && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-bold">Alerts</span>
          </NavLink>

          <NavLink
            to="/volunteer/history"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors",
                isActive ? "text-purple-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )
            }
          >
            <Map className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">History</span>
          </NavLink>

          <NavLink
            to="/volunteer/profile"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-xl min-w-[64px] transition-colors",
                isActive ? "text-amber-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )
            }
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
