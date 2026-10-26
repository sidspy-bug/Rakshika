import { useState, useEffect } from "react";
import { Shield, MapPin, Search, Star, PhoneCall, ShieldAlert, Car, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { useUserLocation } from "../hooks/useUserLocation";
import {
  volunteerPresenceService,
  type VolunteerPeer,
  type ActiveSosAlert,
} from "../services/volunteerPresenceService";

export function CommunityScreen() {
  const navigate = useNavigate();
  const { location: userLocation } = useUserLocation();

  const [realVolunteers, setRealVolunteers] = useState<VolunteerPeer[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveSosAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!userLocation) return;

    // 1. Publish own device presence
    volunteerPresenceService.initPresence(userLocation).catch(() => {});

    // 2. Subscribe to real peer volunteers
    const unsubVolunteers = volunteerPresenceService.subscribeVolunteers(
      userLocation,
      (list) => {
        setRealVolunteers(list);
      }
    );

    // 3. Subscribe to real-time Active SOS emergencies
    const unsubAlerts = volunteerPresenceService.subscribeActiveSosAlerts(
      userLocation,
      (alerts) => {
        setActiveAlerts(alerts);
      }
    );

    return () => {
      unsubVolunteers();
      unsubAlerts();
    };
  }, [userLocation.lat, userLocation.lng]);

  const handleRespondToAlert = (alert: ActiveSosAlert) => {
    navigate("/map", {
      state: {
        destination: {
          name: `🚨 Victim: ${alert.victimName}`,
          lat: alert.coords.lat,
          lng: alert.coords.lng,
        },
      },
    });
  };

  // Fallback demo guardians if only 1 device is currently running
  const fallbackVolunteers: VolunteerPeer[] = [
    { id: "vol-1", name: "Priya Sharma", role: "Verified Volunteer", coords: { lat: userLocation.lat + 0.002, lng: userLocation.lng + 0.003 }, lastActive: new Date().toISOString(), isAvailable: true, distanceMeters: 280 },
    { id: "vol-2", name: "Rahul Verma", role: "Community Safety Lead", coords: { lat: userLocation.lat - 0.004, lng: userLocation.lng + 0.002 }, lastActive: new Date().toISOString(), isAvailable: true, distanceMeters: 450 },
  ];

  const displayedVolunteers = realVolunteers.length > 0 ? realVolunteers : fallbackVolunteers;
  const filteredVolunteers = displayedVolunteers.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="pt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-950">Community Safety</h1>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            Live Cloud Mesh
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Cross-device volunteer presence and emergency network.</p>
      </header>

      {/* Real-time Emergency SOS Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white p-4 rounded-2xl shadow-xl border border-red-400 flex items-center justify-between animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-200 block">
                🚨 CRITICAL SOS DISPATCHED
              </span>
              <h3 className="text-sm font-black text-white">
                {activeAlerts[0].victimName}
              </h3>
              <p className="text-[11px] text-white/80">
                {activeAlerts[0].distanceMeters ? `${activeAlerts[0].distanceMeters}m away from you` : "In your immediate vicinity"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleRespondToAlert(activeAlerts[0])}
            className="px-3 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Car className="w-4 h-4 text-red-600" />
            <span>Respond</span>
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search peer volunteers by name or role..." 
          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
        />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Nearby Responders</h2>
          <span onClick={() => navigate("/map")} className="text-xs font-bold text-[#D32F2F] cursor-pointer hover:underline">View Map</span>
        </div>

        <div className="space-y-3">
          {filteredVolunteers.map((vol, idx) => (
            <GlassCard
              key={vol.id || idx}
              onClick={() => {
                navigate("/map", {
                  state: {
                    destination: {
                      name: `Volunteer: ${vol.name}`,
                      lat: vol.coords.lat,
                      lng: vol.coords.lng,
                    },
                  },
                });
              }}
              className="p-4 flex items-center gap-4 hover:border-gray-300 transition-colors cursor-pointer"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center text-xl font-bold text-sky-700">
                  {vol.name.charAt(0)}
                </div>
                {vol.isAvailable && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900">{vol.name}</h3>
                <p className="text-xs text-[#D32F2F] font-semibold">{vol.role}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {vol.distanceMeters ? (vol.distanceMeters < 1000 ? `${vol.distanceMeters}m` : `${(vol.distanceMeters / 1000).toFixed(1)} km`) : "Nearby"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-500" /> Live
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/map", {
                    state: {
                      destination: {
                        name: `Volunteer: ${vol.name}`,
                        lat: vol.coords.lat,
                        lng: vol.coords.lng,
                      },
                    },
                  });
                }}
                className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center hover:bg-sky-100 transition-colors"
                title="View Volunteer on Map"
              >
                <Car className="w-4 h-4" />
              </button>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
