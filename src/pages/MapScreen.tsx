import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Shield,
  AlertTriangle,
  MapPin,
  X,
  Activity,
  HardDrive,
  Phone,
  ArrowRight,
  Sparkles,
  HeartPulse,
  Navigation,
  Pill,
  Building2,
  Users,
  Car,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { useCallback } from "react";
import {
  volunteerPresenceService,
  type VolunteerPeer,
  type ActiveSosAlert,
} from "../services/volunteerPresenceService";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { InteractiveMap } from "../components/map/InteractiveMap";
import { useUserLocation } from "../hooks/useUserLocation";
import { useGisData } from "../hooks/useGisData";
import { searchAddress } from "../services/gisService";
import type { Coords, HelpCenter, Incident } from "../types/gis";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { OfflineManager } from "../components/map/OfflineManager";
import { enqueueLocation } from "../services/offlineLocationQueue";
import { api } from "../services/api";
import { useNavigation } from "../hooks/useNavigation";
import { NavigationPanel } from "../components/map/NavigationPanel";
import { calculateDistance } from "../utils/geo";

export function MapScreen() {
  const {
    location: userLocation,
    isSimulating,
    startTripSimulation,
    stopSimulation,
  } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number; type?: string; distance?: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<HelpCenter | Incident | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSelectionRef = useRef(false);

  // Network and Offline Maps States
  const { isOnline } = useNetworkStatus();
  const [showOfflineManager, setShowOfflineManager] = useState(false);

  // Real-Time Cross-Device Peer Volunteers & Active SOS Alerts
  const [peerVolunteers, setPeerVolunteers] = useState<VolunteerPeer[]>([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState<ActiveSosAlert[]>([]);

  const {
    helpCenters,
    incidents,
    loading: isGisLoading,
  } = useGisData({ userLocation, destination: null });

  // Route navigation hook with safety scoring context
  const {
    waypoints,
    profile,
    route,
    isNavigating,
    loading: isRouteLoading,
    setProfile,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    startNavigation,
    stopNavigation,
  } = useNavigation({ userLocation, helpCenters, incidents });

  const routerLocation = useLocation();

  // Restore persisted map state on mount if returning to tab
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rakshika_active_map_state");
      if (saved && waypoints.length === 0 && !selectedPoi) {
        const parsed = JSON.parse(saved);
        if (parsed.waypoints && parsed.waypoints.length > 0) {
          parsed.waypoints.forEach((wp: Waypoint) => addWaypoint(wp));
        }
        if (parsed.selectedPoi) {
          setSelectedPoi(parsed.selectedPoi);
        }
        if (parsed.searchQuery) {
          setSearchQuery(parsed.searchQuery);
        }
      }
    } catch (err) {
      console.warn("Failed to restore map state:", err);
    }
  }, []);

  // Persist active map state when waypoints or selectedPoi change
  useEffect(() => {
    if (waypoints.length > 0 || selectedPoi) {
      try {
        localStorage.setItem(
          "rakshika_active_map_state",
          JSON.stringify({ waypoints, selectedPoi, searchQuery })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem("rakshika_active_map_state");
      } catch {}
    }
  }, [waypoints, selectedPoi, searchQuery]);

  // Auto-route to destination when redirected from AI Agent
  useEffect(() => {
    const navState = routerLocation.state as { destination?: { lat: number; lng: number; name: string } } | null;
    if (navState?.destination) {
      clearWaypoints();
      addWaypoint({
        name: navState.destination.name,
        lat: navState.destination.lat,
        lng: navState.destination.lng,
      });
      setSearchQuery(navState.destination.name);
      setSelectedPoi({
        id: `ai-target-${Date.now()}`,
        name: navState.destination.name,
        type: "police",
        lat: navState.destination.lat,
        lng: navState.destination.lng,
        address: navState.destination.name,
        distance: calculateDistance(userLocation, navState.destination),
      });
    }
  }, [routerLocation.state]);

  // Background telemetry tracking: Send updates when userLocation changes
  useEffect(() => {
    if (!userLocation) return;

    const telemetryPayload = {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      timestamp: new Date().toISOString(),
      emergencyId: null,
    };

    if (isOnline) {
      api.post("/location/update", telemetryPayload).catch((err) => {
        console.warn("Telemetry upload failed, buffer offline:", err);
        enqueueLocation(telemetryPayload);
      });
    } else {
      enqueueLocation(telemetryPayload);
    }
  }, [userLocation, isOnline]);

  // Real-Time Volunteer Presence Publishing & Cross-Device Emergency Mesh Subscription
  useEffect(() => {
    if (!userLocation) return;

    // 1. Publish own device presence in Firestore
    volunteerPresenceService.initPresence(userLocation).catch(() => {});
    volunteerPresenceService.updateLocation(userLocation).catch(() => {});

    // 2. Subscribe to real-time peer volunteers
    const unsubVolunteers = volunteerPresenceService.subscribeVolunteers(
      userLocation,
      (list) => {
        setPeerVolunteers(list);
      }
    );

    // 3. Subscribe to real-time Active SOS emergencies from other devices
    const unsubAlerts = volunteerPresenceService.subscribeActiveSosAlerts(
      userLocation,
      (alerts) => {
        setActiveSosAlerts(alerts);
        if (alerts.length > 0 && typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate([300, 100, 300, 100, 500]);
          } catch {}
        }
      }
    );

    return () => {
      unsubVolunteers();
      unsubAlerts();
    };
  }, [userLocation.lat, userLocation.lng]);

  // Handle Volunteer Response: Set driving route to victim and start turn-by-turn navigation!
  const handleRespondToSos = useCallback(
    (alert: ActiveSosAlert) => {
      clearWaypoints();
      addWaypoint({
        name: `🚨 Victim: ${alert.victimName}`,
        lat: alert.coords.lat,
        lng: alert.coords.lng,
      });
      setProfile("driving-car");
      startNavigation();
      setSelectedPoi({
        id: `sos-victim-${alert.id}`,
        name: `🚨 SOS: ${alert.victimName}`,
        type: "police",
        lat: alert.coords.lat,
        lng: alert.coords.lng,
        address: `Victim in distress (${alert.distanceMeters || 0}m away)`,
        distance: (alert.distanceMeters || 0) / 1000,
      });
    },
    [addWaypoint, clearWaypoints, setProfile, startNavigation]
  );

  // Fast location-biased search handling
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    // Concrete check: if the query matches the selected destination, bypass search to avoid redundant APIs and popups
    if (selectedPoi && trimmed === selectedPoi.name.trim()) {
      setSuggestions([]);
      return;
    }

    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

    const abortController = new AbortController();

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddress(trimmed, userLocation, helpCenters);
        if (!abortController.signal.aborted) {
          setSuggestions(results);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.warn("Search error:", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setSearching(false);
        }
      }
    }, 250); // 250ms fast debounce

    return () => {
      clearTimeout(delayDebounceFn);
      abortController.abort();
    };
  }, [searchQuery, userLocation, selectedPoi, helpCenters]);

  const handleSelectSuggestion = (place: { name: string; lat: number; lng: number; type?: string }) => {
    isSelectionRef.current = true;
    clearWaypoints();
    addWaypoint({ name: place.name, lat: place.lat, lng: place.lng });
    setSearchQuery(place.name);
    setSuggestions([]);
    setShowSuggestions(false);

    setSelectedPoi({
      id: `target-${Date.now()}`,
      name: place.name,
      type: "destination",
      lat: place.lat,
      lng: place.lng,
      address: place.name,
      distance: calculateDistance(userLocation, { lat: place.lat, lng: place.lng }),
    });
  };

  const handleMapTap = (coords: Coords, address: string) => {
    setSelectedPoi({
      id: `tap-${Date.now()}`,
      name: "Selected Map Pin",
      type: "destination",
      lat: coords.lat,
      lng: coords.lng,
      address: address || `Latitude: ${coords.lat.toFixed(4)}, Longitude: ${coords.lng.toFixed(4)}`,
      distance: calculateDistance(userLocation, coords),
    });
  };

  const handleClearDestination = () => {
    clearWaypoints();
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedPoi(null);
    stopSimulation();
  };

  const handleStartTrip = () => {
    if (!route || route.geometry.length === 0) return;
    startNavigation();
    startTripSimulation(route.geometry);
  };

  const handleStopTrip = () => {
    stopSimulation();
    stopNavigation();
    handleClearDestination();
  };

  const handleWalkSafelyHere = (poi: HelpCenter | Incident) => {
    clearWaypoints();
    addWaypoint({
      name: poi.name || ("title" in poi ? poi.title : "Safe Point"),
      lat: poi.lat,
      lng: poi.lng,
    });
    setSelectedPoi(null);
  };

  const formatDistance = (meters: number = 0) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="relative h-full w-full bg-[#111112] overflow-hidden flex flex-col font-sans text-white">
      {/* Top Search & Filter Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 max-w-lg mx-auto">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 shadow-xs border border-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
            <span>Offline Mode &bull; Using cached map routes</span>
          </div>
        )}

        {/* Search Input Box */}
        <div className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-xs flex items-center px-3.5 py-2 transition-all focus-within:border-emerald-500">
          <Search className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search destination, police, hospital, metro..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            disabled={isSimulating}
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-white placeholder-slate-400 py-1"
          />
          {searchQuery && (
            <button
              onClick={handleClearDestination}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowOfflineManager(true)}
            className="ml-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 hover:text-emerald-300 transition-colors"
            title="Offline Maps"
          >
            <HardDrive className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Suggestion Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden divide-y divide-slate-800 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            {suggestions.map((place, idx) => {
              const isPolice = place.type === "police" || place.type === "women_police";
              const isHospital = place.type === "hospital";
              const isMarket = place.type === "market";
              const isTransit = place.type === "transit";

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(place)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 hover:text-emerald-300 transition-colors flex items-center gap-3"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isPolice
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : isHospital
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isMarket
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : isTransit
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {isPolice ? (
                      <Shield className="w-3.5 h-3.5" />
                    ) : isHospital ? (
                      <HeartPulse className="w-3.5 h-3.5" />
                    ) : isMarket ? (
                      <Building2 className="w-3.5 h-3.5" />
                    ) : isTransit ? (
                      <Navigation className="w-3.5 h-3.5" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block truncate text-white">{place.name}</span>
                    <span className="text-[10px] text-gray-400 capitalize block">
                      {place.type === "women_police"
                        ? "Women Safety Cell & Mahila Thana"
                        : place.type === "police"
                        ? "Police Station / Security"
                        : place.type === "hospital"
                        ? "Emergency Hospital & Trauma Care"
                        : place.type === "market"
                        ? "Commercial Center & Market"
                        : place.type || "Location"}
                    </span>
                  </div>
                  {place.distance !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-400 shrink-0 font-medium">
                      {place.distance < 1000 ? `${Math.round(place.distance)}m` : `${(place.distance / 1000).toFixed(1)}km`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {searching && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2 shadow-xs">
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Searching nearby safe locations...
          </div>
        )}
      </div>

      {/* Floating Emergency Alert Banner for Volunteers */}
      {activeSosAlerts.length > 0 && (
        <div className="absolute top-24 left-3 right-3 z-40 bg-[#D32F2F] text-white p-3 rounded-lg shadow-md border border-red-700 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-900 flex items-center justify-center shrink-0 border border-red-700">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-100 block">
                EMERGENCY ALERT NEARBY
              </span>
              <h4 className="text-xs font-bold text-white">
                {activeSosAlerts[0].victimName}
              </h4>
              <p className="text-[10px] text-red-100">
                {activeSosAlerts[0].distanceMeters ? `${activeSosAlerts[0].distanceMeters}m away from your location` : "Immediate area"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleRespondToSos(activeSosAlerts[0])}
            className="px-3 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
          >
            <Car className="w-4 h-4 text-red-600" />
            <span>Start Driving</span>
          </button>
        </div>
      )}

      {/* Main Interactive Map Component */}
      <InteractiveMap
        userLocation={userLocation}
        destination={waypoints.length > 0 ? { lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng } : null}
        waypoints={waypoints}
        helpCenters={helpCenters}
        incidents={incidents}
        route={route}
        isLoading={isGisLoading || isRouteLoading}
        filterCategory={activeCategory}
        onMarkerSelect={(poi) => setSelectedPoi(poi)}
        onMapClick={handleMapTap}
        onClearDestination={handleClearDestination}
        isSimulating={isSimulating}
        volunteers={peerVolunteers}
        activeSosAlerts={activeSosAlerts}
        onRespondToSos={handleRespondToSos}
      />

      {/* Floating POI Detail Card (When user taps any marker or map pin) */}
      {selectedPoi && (
        <div className="absolute bottom-6 left-3 right-3 z-30 max-w-sm mx-auto animate-in slide-in-from-bottom-5 duration-200">
          <GlassCard className="p-4 border border-slate-800 bg-slate-900 text-white shadow-xl relative rounded-xl">
            <button
              onClick={() => setSelectedPoi(null)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  "severity" in selectedPoi
                    ? selectedPoi.severity === "high"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : (selectedPoi as HelpCenter).type === "volunteer"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : (selectedPoi as HelpCenter).type === "police" || (selectedPoi as HelpCenter).type === "women_police"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : (selectedPoi as HelpCenter).type === "hospital"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : (selectedPoi as HelpCenter).type === "pharmacy_24h"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                }`}
              >
                {"severity" in selectedPoi ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (selectedPoi as HelpCenter).type === "volunteer" ? (
                  <Users className="w-5 h-5" />
                ) : (selectedPoi as HelpCenter).type === "hospital" ? (
                  <HeartPulse className="w-5 h-5" />
                ) : (selectedPoi as HelpCenter).type === "pharmacy_24h" ? (
                  <Pill className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 pr-5">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm leading-tight line-clamp-1">
                    {selectedPoi.name || ("title" in selectedPoi ? selectedPoi.title : "Help Center")}
                  </h4>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    {"severity" in selectedPoi
                      ? `${selectedPoi.severity.toUpperCase()} RISK ZONE`
                      : (selectedPoi as HelpCenter).type.replace("_", " ")}
                  </span>
                  {"distance" in selectedPoi && selectedPoi.distance !== undefined && (
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {formatDistance(selectedPoi.distance)} away
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                  {"description" in selectedPoi
                    ? selectedPoi.description
                    : selectedPoi.address || "Verified emergency haven on OpenStreetMap grid."}
                </p>

                {/* Action Buttons */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="text-xs font-bold py-1.5 h-8 bg-emerald-700 hover:bg-emerald-600 flex items-center gap-1.5 rounded-lg active:scale-95"
                    onClick={() => handleWalkSafelyHere(selectedPoi)}
                  >
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                    <span>Safe Walk Here</span>
                  </Button>

                  {!("severity" in selectedPoi) && (selectedPoi as HelpCenter).phone && (
                    <a
                      href={`tel:${(selectedPoi as HelpCenter).phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 text-xs font-bold hover:bg-blue-600/30 border border-blue-500/30 transition-colors h-8"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call {(selectedPoi as HelpCenter).phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Bottom Sheet - Navigation / Simulation HUD */}
      {!selectedPoi && (
        <div className="absolute bottom-4 left-3 right-3 z-20 max-w-md mx-auto pointer-events-auto">
          {isSimulating ? (
            <GlassCard className="border border-emerald-800 bg-slate-900 text-white p-4 shadow-xl relative overflow-hidden rounded-xl">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs tracking-wide uppercase text-emerald-400">Live Trip Simulation</span>
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                    {route?.safetyScore || 96}% Safe Path
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm line-clamp-1">Simulating Safe Walk Along Lit Corridor</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Broadcasting live GPS breadcrumbs to emergency network...</p>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full animate-[progress_15s_infinite_linear]" style={{ width: "65%" }}></div>
                </div>
                <Button variant="danger" className="w-full font-bold h-10 text-xs rounded-lg" onClick={handleStopTrip}>
                  Stop Simulation & Reset
                </Button>
              </div>
            </GlassCard>
          ) : waypoints.length > 0 ? (
            <NavigationPanel
              waypoints={waypoints}
              profile={profile}
              route={route}
              loading={isRouteLoading}
              isNavigating={isNavigating}
              onProfileChange={setProfile}
              onRemoveWaypoint={removeWaypoint}
              onStartNavigation={handleStartTrip}
              onStopNavigation={handleStopTrip}
              onClear={handleClearDestination}
              isOnline={isOnline}
            />
          ) : (
            /* Sleek Mini Status Bar when idle - DOES NOT BLOCK CONTROLS OR MAP */
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 px-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-200 block truncate">
                    Rakshika Safe Grid Active
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {helpCenters.filter((c) => c.type === "volunteer").length} Volunteers live &bull; Tap map to route
                  </span>
                </div>
              </div>
              <button
                onClick={() => searchInputRef.current?.focus()}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
              >
                Safe Route
              </button>
            </div>
          )}
        </div>
      )}

      {/* Offline Maps Modal Overlay */}
      {showOfflineManager && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <OfflineManager userLocation={userLocation} onClose={() => setShowOfflineManager(false)} />
        </div>
      )}
    </div>
  );
}

