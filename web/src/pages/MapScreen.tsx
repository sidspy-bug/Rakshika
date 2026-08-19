import { useState, useEffect, useRef } from "react";
import { Search, Shield, AlertTriangle, Navigation, MapPin, X, HelpCircle, Activity, Sparkles, HardDrive } from "lucide-react";
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



export function MapScreen() {
  const {
    location: userLocation,
    isSimulating,
    startTripSimulation,
    stopSimulation,
  } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<HelpCenter | Incident | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Network and Offline Maps States
  const { isOnline } = useNetworkStatus();
  const [showOfflineManager, setShowOfflineManager] = useState(false);

  // Use our new route navigation hook
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
  } = useNavigation({ userLocation });


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
      console.log("Device offline: Queueing GPS telemetry breadcrumb locally.");
      enqueueLocation(telemetryPayload);
    }
  }, [userLocation, isOnline]);


  const {
    helpCenters,
    incidents,
    loading: isGisLoading,
  } = useGisData({ userLocation, destination: null });


  // Handle address geocoding searches
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddress(searchQuery);
        setSuggestions(results);
      } catch (err) {
        console.error("Suggestions error:", err);
      } finally {
        setSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectSuggestion = (place: { name: string; lat: number; lng: number }) => {
    addWaypoint({ name: place.name, lat: place.lat, lng: place.lng });
    setSearchQuery(place.name); // Keep searched address displayed in search bar
    setSuggestions([]);
    
    // Display floating card for selected target location
    setSelectedPoi({
      id: `target-${Date.now()}`,
      name: place.name,
      type: "police", // Display as safe target
      lat: place.lat,
      lng: place.lng,
      address: place.name,
    });
  };

  const handleClearDestination = () => {
    clearWaypoints();
    setSearchQuery("");
    setSuggestions([]);
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


  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) {
      return `${mins} mins`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs} hr ${remainingMins} mins`;
  };

  // Determine safety rating based on severity of nearby incidents
  const getSafetyIndex = () => {
    if (incidents.length === 0) return 100;
    const highSeverity = incidents.filter(i => i.severity === "high").length;
    const mediumSeverity = incidents.filter(i => i.severity === "medium").length;
    
    // Deduct safety percentage
    const deduction = (highSeverity * 25) + (mediumSeverity * 10);
    return Math.max(100 - deduction, 50);
  };

  const safetyScore = getSafetyIndex();

  return (
    <div className="relative h-full w-full bg-[#111112] overflow-hidden flex flex-col font-sans text-white">
      
      {/* Top Search Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 max-w-lg mx-auto">
        
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600/90 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-2xl backdrop-blur-md border border-amber-500/20 animate-in slide-in-from-top-3 duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100" />
            <span>Offline Mode Active &bull; Using downloaded map packages</span>
          </div>
        )}

        <div className="relative bg-black/80 backdrop-blur-md rounded-2xl border border-gray-800 shadow-2xl flex items-center px-4 py-2.5 transition-all focus-within:border-emerald-500/50">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search safe targets, hospitals, police..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSimulating}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder-gray-500"
          />
          {searchQuery && (
            <button 
              onClick={handleClearDestination}
              className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestion Dropdown */}
        {suggestions.length > 0 && (
          <div className="bg-black/90 border border-gray-800 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-900 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {suggestions.map((place, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSuggestion(place)}
                className="w-full text-left px-4 py-3 hover:bg-emerald-600/10 hover:text-emerald-400 transition-colors flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs font-medium leading-normal line-clamp-2">{place.name}</span>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="bg-black/90 border border-gray-800 rounded-2xl p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            Searching OpenStreetMap data...
          </div>
        )}
      </div>

      {/* Main Interactive Map Component */}
      <InteractiveMap
        userLocation={userLocation}
        destination={null}
        waypoints={waypoints}
        helpCenters={helpCenters}
        incidents={incidents}
        route={route}
        isLoading={isGisLoading || isRouteLoading}
        onMarkerSelect={(poi) => setSelectedPoi(poi)}
        onClearDestination={handleClearDestination}
        isSimulating={isSimulating}
      />


      {/* Floating Info Overlay (POI detail card) */}
      {selectedPoi && (
        <div className="absolute top-20 left-4 right-4 z-10 max-w-sm mx-auto animate-in slide-in-from-top-4 duration-300">
          <GlassCard className="p-4 border border-gray-800 bg-black/85 text-white shadow-2xl relative">
            <button 
              onClick={() => setSelectedPoi(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                'severity' in selectedPoi 
                  ? (selectedPoi.severity === "high" ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500")
                  : (selectedPoi.type === "police" ? "bg-emerald-500/20 text-emerald-500" : 
                     selectedPoi.type === "women_police" ? "bg-rose-500/20 text-rose-500" :
                     selectedPoi.type === "safe_college" ? "bg-indigo-500/20 text-indigo-500" :
                     selectedPoi.type === "safe_gathering" ? "bg-green-500/20 text-green-500" :
                     selectedPoi.type === "volunteer" ? "bg-amber-500/20 text-amber-500" :
                     "bg-teal-500/20 text-teal-500")
              }`}>
                {'severity' in selectedPoi ? <AlertTriangle className="w-5 h-5" /> : 
                 (selectedPoi as HelpCenter).type === "volunteer" ? <Sparkles className="w-5 h-5" /> :
                 (selectedPoi as HelpCenter).type === "safe_gathering" || (selectedPoi as HelpCenter).type === "safe_college" ? <HelpCircle className="w-5 h-5" /> :
                 <Shield className="w-5 h-5" />
                }
              </div>
              <div className="flex-1 pr-6">
                <h4 className="font-bold text-sm leading-tight">{selectedPoi.name || ( 'title' in selectedPoi ? selectedPoi.title : "Help Center" )}</h4>
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {'severity' in selectedPoi ? `Reported Danger (${selectedPoi.severity})` : `${(selectedPoi as HelpCenter).type.replace("_", " ")}`}
                </p>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  {'description' in selectedPoi ? selectedPoi.description : (selectedPoi.address || "Certified safe zone listed on OSM.")}
                </p>
                {!('severity' in selectedPoi) && (selectedPoi as HelpCenter).phone && (
                  <a href={`tel:${(selectedPoi as HelpCenter).phone}`} className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-500/30 transition-colors">
                    <span>📞</span> Call: {(selectedPoi as HelpCenter).phone}
                  </a>
                )}
                <div className="mt-3.5 flex gap-2">
                  <Button 
                    size="sm"
                    className="text-xs font-bold py-1 h-8"
                    onClick={() => {
                      addWaypoint({
                        name: selectedPoi.name || ('title' in selectedPoi ? selectedPoi.title : "Reported Place"),
                        lat: selectedPoi.lat,
                        lng: selectedPoi.lng,
                      });
                      setSelectedPoi(null);
                    }}
                  >
                    Add Stop
                  </Button>

                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Bottom Sheet - Floating Overlays */}
      <div className="absolute bottom-4 left-4 right-4 z-10 max-w-md mx-auto">
        {isSimulating ? (
          <GlassCard className="border border-gray-800 bg-black/85 text-white p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <span className="font-bold text-sm tracking-wide uppercase text-emerald-400">Trip Active (Demo)</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  98% Safe Route
                </div>
              </div>
              <div>
                <h3 className="font-bold text-base line-clamp-1">Simulating Walk to Destination</h3>
                <p className="text-xs text-gray-400 mt-1">Sharing real-time coordinates with your emergency contacts...</p>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full animate-[progress_15s_infinite_linear]" style={{ width: "65%" }}></div>
              </div>
              <Button variant="danger" className="w-full font-bold h-11" onClick={handleStopTrip}>
                Stop Trip & Cancel Alert
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
          <GlassCard className="border border-gray-800 bg-black/85 text-white p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500 fill-current" /> Safe Walk Mode
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Check safe paths and nearby helpers</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-800/30 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>

              <div className="text-xs text-gray-500 leading-normal flex items-start gap-2 bg-gray-950/30 p-3 rounded-xl border border-gray-900/50">
                <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>Search for a destination above. We will fetch pedestrian routing maps, highlight secure hospitals/police stations, and map known threats.</span>
              </div>

              <Button 
                className="w-full font-bold h-11" 
                onClick={() => searchInputRef.current?.focus()}
              >
                Find Safe Route
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
      {/* Floating Offline Maps Trigger Button */}
      <button
        onClick={() => setShowOfflineManager(true)}
        className="absolute top-20 right-4 z-10 w-12 h-12 rounded-full bg-black/85 border border-gray-800 text-emerald-400 hover:text-emerald-300 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Manage Offline Maps"
      >
        <HardDrive className="w-5 h-5" />
      </button>

      {/* Offline Maps Modal Overlay */}
      {showOfflineManager && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <OfflineManager 
            userLocation={userLocation}
            onClose={() => setShowOfflineManager(false)} 
          />
        </div>
      )}
    </div>
  );
}
