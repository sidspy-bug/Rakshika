import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Shield, Map, LifeBuoy, Users, Settings, ShieldAlert, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { getActiveSos, stopSos, type SosIncident } from "../../services/sosService";
import { dispatchEngine } from "../../services/dispatchEngine";

export function AppLayout() {
  const navigate = useNavigate();
  const [activeSos, setActiveSos] = useState<SosIncident | null>(() => getActiveSos());

  const navItems = [
    { to: "/", icon: Shield, label: "Safety" },
    { to: "/map", icon: Map, label: "Safe Map" },
    { to: "/ai", icon: LifeBuoy, label: "Advisor" },
    { to: "/community", icon: Users, label: "Volunteers" },
    { to: "/profile", icon: Settings, label: "Profile" },
  ];

  // Poll / listen for active SOS transitions
  useEffect(() => {
    const checkActive = () => {
      const active = getActiveSos();
      setActiveSos(active);
    };

    checkActive();
    const interval = setInterval(checkActive, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStopActiveSos = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stopSos("CANCELLED");
    dispatchEngine.clearState();
    setActiveSos(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 max-w-[600px] mx-auto border-x border-slate-200 overflow-hidden relative">
      {/* Persistent Active SOS Banner */}
      {activeSos && (
        <div
          onClick={() => navigate("/sos")}
          className="bg-[#D32F2F] text-white px-4 py-2.5 flex items-center justify-between border-b border-red-800 shadow-md cursor-pointer z-50"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-white flex-shrink-0" />
            <div>
              <span className="font-extrabold text-xs tracking-wider uppercase block">
                EMERGENCY SOS ACTIVE
              </span>
              <span className="text-[10px] text-red-100 font-mono">
                ID: {activeSos.id.slice(-6)} • Tap to view telemetry
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => navigate("/sos")}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-900 text-white rounded-md text-[10px] font-bold border border-red-700 active:scale-95 transition-all"
            >
              Open
            </button>
            <button
              onClick={handleStopActiveSos}
              className="px-2.5 py-1 bg-white text-red-700 hover:bg-slate-100 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-xs border border-red-200 active:scale-95 transition-all"
            >
              <X className="w-3 h-3" /> Stop SOS
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[76px]">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-[72px] bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 select-none shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-14 py-1.5 gap-1 transition-all rounded-lg active:scale-95",
                isActive
                  ? "text-[#D32F2F] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
