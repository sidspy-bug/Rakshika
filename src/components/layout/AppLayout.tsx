import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Shield, Map, MessageSquare, Users, Settings, ShieldAlert, X, Eye } from "lucide-react";
import { cn } from "../../utils/cn";
import { getActiveSos, stopSos, type SosIncident } from "../../services/sosService";
import { dispatchEngine } from "../../services/dispatchEngine";

export function AppLayout() {
  const navigate = useNavigate();
  const [activeSos, setActiveSos] = useState<SosIncident | null>(() => getActiveSos());

  const navItems = [
    { to: "/", icon: Shield, label: "Safe" },
    { to: "/map", icon: Map, label: "Map" },
    { to: "/ai", icon: MessageSquare, label: "AI Help" },
    { to: "/community", icon: Users, label: "Community" },
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
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 max-w-[600px] mx-auto border-x border-gray-200 overflow-hidden relative">
      {/* Persistent Active SOS Banner */}
      {activeSos && (
        <div
          onClick={() => navigate("/sos")}
          className="bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2.5 flex items-center justify-between shadow-lg cursor-pointer z-50 animate-pulse"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white flex-shrink-0 animate-bounce" />
            <div>
              <span className="font-black text-xs tracking-wider uppercase block">
                🚨 SOS Active & Recording
              </span>
              <span className="text-[10px] text-white/80 font-mono">
                ID: {activeSos.id.slice(-6)} • Tap to manage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => navigate("/sos")}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold"
            >
              Open
            </button>
            <button
              onClick={handleStopActiveSos}
              className="px-2.5 py-1 bg-white text-red-600 hover:bg-gray-100 rounded-lg text-[10px] font-black flex items-center gap-1 shadow"
            >
              <X className="w-3 h-3" /> Stop SOS
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[80px]">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-[80px] bg-white/80 backdrop-blur-lg border-t border-gray-200 flex items-center justify-around px-4 z-40">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-16 gap-1 transition-colors",
                isActive ? "text-[#D32F2F]" : "text-gray-400 hover:text-gray-600"
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
