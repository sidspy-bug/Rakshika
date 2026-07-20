import { useState, useEffect } from "react";
import { Shield, MapPin, Search, Star, PhoneCall } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";

export function CommunityScreen() {
  const initialVolunteers = [
    { name: "Priya Sharma", role: "Verified Responder", baseDistance: 0.2, rating: 4.9, available: true },
    { name: "Rahul Verma", role: "Community Guard", baseDistance: 0.5, rating: 4.8, available: true },
    { name: "Anita Desai", role: "Medical Professional", baseDistance: 1.1, rating: 5.0, available: false },
  ];

  const [volunteers, setVolunteers] = useState(initialVolunteers.map(v => ({...v, distance: v.baseDistance.toFixed(1)})));

  useEffect(() => {
    // Simulate real-time movement of responders
    const interval = setInterval(() => {
      setVolunteers(prev => prev.map(v => {
        if (!v.available) return v;
        const variation = (Math.random() - 0.5) * 0.1;
        const newDist = Math.max(0.1, v.baseDistance + variation);
        return { ...v, distance: newDist.toFixed(1), baseDistance: newDist };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="pt-4">
        <h1 className="text-2xl font-bold text-gray-900">Community Safety</h1>
        <p className="text-sm text-gray-500 mt-1">Connect with verified volunteers nearby.</p>
      </header>

      {/* Emergency Broadcast */}
      <GlassCard className="bg-orange-50 border-orange-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900 text-sm">Active Broadcast in your area</h3>
            <p className="text-xs text-orange-800 mt-1">Suspicious activity reported near MG Road. Avoid poorly lit alleyways tonight.</p>
            <span className="text-[10px] font-bold text-orange-600 mt-2 block">10 mins ago • Verified by Police</span>
          </div>
        </div>
      </GlassCard>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search volunteers or help centers..." 
          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
        />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nearby Responders</h2>
          <span className="text-xs font-bold text-[#D32F2F] cursor-pointer">View Map</span>
        </div>

        <div className="space-y-3">
          {volunteers.map((vol, idx) => (
            <GlassCard key={idx} className="p-4 flex items-center gap-4 hover:border-gray-300 transition-colors cursor-pointer">
              <div className="relative">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
                  {vol.name.charAt(0)}
                </div>
                {vol.available && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">{vol.name}</h3>
                <p className="text-xs text-[#D32F2F] font-semibold">{vol.role}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {vol.distance} km</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {vol.rating}</span>
                </div>
              </div>

              {vol.available && (
                <button className="w-10 h-10 bg-red-50 text-[#D32F2F] rounded-full flex items-center justify-center hover:bg-red-100 transition-colors">
                  <PhoneCall className="w-4 h-4" />
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
