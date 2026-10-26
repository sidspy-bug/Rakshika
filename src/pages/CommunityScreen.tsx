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
        <div className="bg-[#D32F2F] text-white p-3.5 rounded-lg shadow-sm border border-red-700 flex items-center justify-between animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-900 flex items-center justify-center shrink-0 border border-red-700">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-100 block">
                CRITICAL SOS DISPATCHED
              </span>
              <h3 className="text-sm font-bold text-white">
                {activeAlerts[0].victimName}
              </h3>
              <p className="text-[11px] text-red-100">
                {activeAlerts[0].distanceMeters ? `${activeAlerts[0].distanceMeters}m away from you` : "In your immediate vicinity"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleRespondToAlert(activeAlerts[0])}
            className="px-3 py-2 bg-white text-red-700 hover:bg-slate-100 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer border border-red-200"
          >
            <Car className="w-4 h-4 text-red-700" />
            <span>Respond</span>
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search peer volunteers by name or role..." 
          className="w-full bg-white border border-slate-300 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F] text-slate-900 placeholder-slate-400 shadow-xs"
        />
      </div>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-900">Nearby Responders</h2>
          <span onClick={() => navigate("/map")} className="text-xs font-bold text-[#D32F2F] cursor-pointer hover:underline">View Map</span>
        </div>

        <div className="space-y-2.5">
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
              className="p-3.5 flex items-center gap-3.5 hover:border-slate-300 transition-colors cursor-pointer rounded-xl border border-slate-200 shadow-xs"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-sm font-bold text-slate-800">
                  {vol.name.charAt(0)}
                </div>
                {vol.isAvailable && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
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
