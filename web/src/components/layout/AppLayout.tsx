import { Outlet, NavLink } from "react-router-dom";
import { Shield, Map, MessageSquare, Users, Settings } from "lucide-react";
import { cn } from "../../utils/cn";

export function AppLayout() {
  const navItems = [
    { to: "/", icon: Shield, label: "Safe" },
    { to: "/map", icon: Map, label: "Map" },
    { to: "/ai", icon: MessageSquare, label: "AI Help" },
    { to: "/community", icon: Users, label: "Community" },
    { to: "/profile", icon: Settings, label: "Profile" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 max-w-[600px] mx-auto border-x border-gray-200 overflow-hidden relative">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-[80px]">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 h-[80px] bg-white/80 backdrop-blur-lg border-t border-gray-200 flex items-center justify-around px-4 z-50">
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
