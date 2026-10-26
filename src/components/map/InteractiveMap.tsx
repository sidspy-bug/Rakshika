import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coords, HelpCenter, Incident } from "../../types/gis";
import type { RouteSummary, Waypoint } from "../../types/navigation";
import { Navigation, Loader2, Plus, Minus, Layers } from "lucide-react";

import type { VolunteerPeer, ActiveSosAlert } from "../../services/volunteerPresenceService";

interface InteractiveMapProps {
  userLocation?: Coords;
  center?: Coords;
  zoom?: number;
  emergencyLocation?: Coords;
  destination?: Coords | null;
  waypoints?: Waypoint[];
  helpCenters?: HelpCenter[];
  incidents?: Incident[];
  route?: RouteSummary | null;
  isLoading?: boolean;
  filterCategory?: string;
  onMarkerSelect?: (center: HelpCenter | Incident) => void;
  onMapClick?: (coords: Coords, address: string) => void;
  onClearDestination?: () => void;
  isSimulating?: boolean;
  volunteers?: VolunteerPeer[];
  activeSosAlerts?: ActiveSosAlert[];
  onRespondToSos?: (alert: ActiveSosAlert) => void;
}

export function InteractiveMap({
  userLocation = { lat: 28.6139, lng: 77.209 },
  center,
  zoom = 16,
  emergencyLocation,
  destination: _destination,
  waypoints = [],
  helpCenters = [],
  incidents: _incidents = [],
  route = null,
  isLoading = false,
  filterCategory: _filterCategory = "all",
  onMarkerSelect,
  onMapClick,
  isSimulating = false,
  volunteers = [],
  activeSosAlerts = [],
  onRespondToSos,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Keep track of layers to clear them dynamically
  const userMarkerRef = useRef<L.Marker | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const centersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const volunteersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sosAlertsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.LayerGroup | null>(null);
  const activeTileLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [followUser, setFollowUser] = useState(true);
  const [mapMode, setMapMode] = useState<"satellite" | "streets" | "dark">("satellite");

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = center
      ? [center.lat, center.lng]
      : emergencyLocation
      ? [emergencyLocation.lat, emergencyLocation.lng]
      : [userLocation.lat, userLocation.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 21,
    });

    // Create primary tile group
    activeTileLayerGroupRef.current = L.layerGroup().addTo(map);

    // Map Click Handler for tap-to-navigate
    map.on("click", async (e: L.LeafletMouseEvent) => {
      if (!onMapClick) return;
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };

      try {
        const { reverseGeocode } = await import("../../services/gisService");
        const address = await reverseGeocode(coords);
        onMapClick(coords, address);
      } catch (err) {
        onMapClick(coords, `Location at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }
    });

    map.on("dragstart", () => {
      setFollowUser(false);
    });

    // Create layer groups
    centersLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    volunteersLayerGroupRef.current = L.layerGroup().addTo(map);
    sosAlertsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 1.1 Dynamic Map Layer Switcher (Google Satellite Hybrid, Google Streets, Dark Mode)
  useEffect(() => {
    const group = activeTileLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (mapMode === "satellite") {
      // Real High-Resolution Google Satellite Imagery + Crisp Indian Road & Landmark Labels
      const satLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        maxNativeZoom: 20,
      });
      group.addLayer(satLayer);
    } else if (mapMode === "streets") {
      // Real Google Streets with full Indian road network, shops, and institutions
      const streetsLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 21,
        maxNativeZoom: 20,
      });
      group.addLayer(streetsLayer);
    } else {
      // High-Contrast Dark Canvas
      const darkBase = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 }
      );
      const darkRef = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16, opacity: 0.85 }
      );
      group.addLayer(darkBase);
      group.addLayer(darkRef);
    }
  }, [mapMode]);

  // 2. Update User Location Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pulseIcon = L.divIcon({
      className: "user-location-pulse",
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-9 h-9 bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-2xl flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: pulseIcon, zIndexOffset: 1000 }).addTo(map);
    }

    if (followUser && !isSimulating) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom(), { animate: true });
    }
  }, [userLocation, followUser, isSimulating]);

  // 3. Update Multi-Destination Waypoint Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = waypointsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp, idx) => {
        const isLast = idx === waypoints.length - 1;
        const markerColor = isLast ? "bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.6)]" : "bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]";
        const markerIcon = isLast ? "🏁" : `${idx + 1}`;

        const icon = L.divIcon({
          className: "waypoint-marker",
          html: `
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 ${markerColor} rounded-full border-2 border-white flex items-center justify-center shadow-2xl text-white text-xs font-bold transition-transform hover:scale-110">
                ${markerIcon}
              </div>
              <div class="w-1 h-3 ${isLast ? "bg-rose-600" : "bg-purple-600"}"></div>
            </div>
          `,
          iconSize: [32, 44],
          iconAnchor: [16, 44],
        });

        L.marker([wp.lat, wp.lng], { icon })
          .addTo(group)
          .bindPopup(`
            <div class="font-sans text-gray-900 p-1">
              <h4 class="font-bold text-xs">${isLast ? "🏁 Target Destination" : `📍 Stop ${idx + 1}`}</h4>
              <p class="text-xs text-gray-600 mt-1 font-medium">${wp.name}</p>
            </div>
          `);
      });

      if (!isSimulating) {
        const points = [
          [userLocation.lat, userLocation.lng] as [number, number],
          ...waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]),
        ];
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [60, 60], animate: true });
      }
    }
  }, [waypoints, userLocation, isSimulating]);

  // 4. Update Route Lines (Safe Route in Emerald + Alternatives in Dashed Gray)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.clearLayers();
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (route && route.geometry.length > 0) {
      const routesGroup = L.layerGroup().addTo(map);
      routePolylineRef.current = routesGroup;

      // Render alternative routes first
      if (route.alternativeRoutes && route.alternativeRoutes.length > 0) {
        route.alternativeRoutes.forEach((altRoute) => {
          L.polyline(altRoute.geometry, {
            color: "#94a3b8",
            weight: 5,
            opacity: 0.5,
            dashArray: "8, 8",
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routesGroup);
        });
      }

      // Safe Walk primary path (Glowing green with bold outline)
      L.polyline(route.geometry, {
        color: "#059669",
        weight: 8,
        opacity: 0.4,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(routesGroup);

      L.polyline(route.geometry, {
        color: "#10b981",
        weight: 5,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(routesGroup);

      if (!isSimulating) {
        const bounds = L.latLngBounds(route.geometry);
        map.fitBounds(bounds, { padding: [70, 70], animate: true });
      }
    }
  }, [route, isSimulating]);

  // 5. Highlight Real Safety Areas (Women Police / Mahila Thana, Police Stations, Hospitals)
  // Memoize stable key for real emergency facilities to prevent redraws when volunteers drift
  const emergencyCentersKey = useMemo(() => {
    return helpCenters
      .filter((c) => c.type === "police" || c.type === "women_police" || c.type === "hospital")
      .map((c) => `${c.id}-${c.lat.toFixed(4)}-${c.lng.toFixed(4)}`)
      .sort()
      .join("|");
  }, [helpCenters]);

  // 5. Highlight Real Safety Areas (Women Police / Mahila Thana, Police Stations, Hospitals)
  useEffect(() => {
    const map = mapRef.current;
    const group = centersLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const emergencyList = helpCenters.filter(
      (c) => c.type === "women_police" || c.type === "police" || c.type === "hospital"
    );

    emergencyList.forEach((center) => {
      const isWomenPolice = center.type === "women_police";
      const isPolice = center.type === "police";
      const isHospital = center.type === "hospital";

      let strokeColor = "#3b82f6"; // Police sapphire blue
      let fillColor = "#3b82f6";
      let badgeLabel = `🛡️ ${center.name}`;
      let badgeClass = "text-blue-300 border-blue-500/40 bg-blue-950/85";

      if (isWomenPolice) {
        strokeColor = "#f43f5e"; // Women Police neon rose
        fillColor = "#f43f5e";
        badgeLabel = `♀️ ${center.name}`;
        badgeClass = "text-rose-200 border-rose-500/60 bg-rose-950/90 font-extrabold shadow-[0_0_15px_rgba(244,63,94,0.45)]";
      } else if (isHospital) {
        strokeColor = "#10b981"; // Hospital emerald green
        fillColor = "#10b981";
        badgeLabel = `🏥 ${center.name}`;
        badgeClass = "text-emerald-200 border-emerald-500/40 bg-emerald-950/85";
      }

      // Render actual polygon compound if available, or tight circular safety zone (30-40m)
      let areaLayer: L.Polygon | L.Circle;

      if (center.polygon && center.polygon.length >= 3) {
        areaLayer = L.polygon(center.polygon, {
          color: strokeColor,
          weight: 2,
          fillColor,
          fillOpacity: isWomenPolice ? 0.22 : 0.16,
          className: "cursor-pointer transition-all",
        });
      } else {
        const radius = Math.min(center.radius || 30, 40);
        areaLayer = L.circle([center.lat, center.lng], {
          radius,
          color: strokeColor,
          weight: 2,
          fillColor,
          fillOpacity: isWomenPolice ? 0.22 : 0.16,
          className: "cursor-pointer transition-all",
        });
      }

      // Elegant tooltip on hover (non-permanent to avoid cluttering streets)
      areaLayer.bindTooltip(
        `<div class="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl border shadow-2xl ${badgeClass}">
          <span>${badgeLabel}</span>
        </div>`,
        {
          permanent: false,
          direction: "top",
          offset: [0, -10],
          className: "area-safe-badge",
          interactive: false,
        }
      );

      // Centered compact icon pin for clear landmark recognition
      const iconHtml = `<div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xl border-2 cursor-pointer transition-transform hover:scale-110 ${
        isWomenPolice
          ? "bg-rose-600 text-white border-white shadow-rose-500/60"
          : isPolice
          ? "bg-blue-600 text-white border-white shadow-blue-500/60"
          : "bg-emerald-600 text-white border-white shadow-emerald-500/60"
      }">${isWomenPolice ? "♀" : isPolice ? "🛡️" : "🏥"}</div>`;

      const centerMarker = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "facility-pin",
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
        interactive: true,
      });

      centerMarker.bindTooltip(
        `<div class="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-black/90 text-white border border-gray-700 shadow-xl">
          <span>${center.name}</span>
        </div>`,
        {
          permanent: false,
          direction: "top",
          offset: [0, -12],
        }
      );

      // Tap/Click interaction to select area and reveal detail action card
      const handleSelect = () => {
        if (onMarkerSelect) onMarkerSelect(center);
      };

      areaLayer.on("click", handleSelect);
      centerMarker.on("click", handleSelect);

      areaLayer.on("mouseover", () => {
        areaLayer.setStyle({
          fillOpacity: 0.40,
          weight: 3,
        });
      });

      areaLayer.on("mouseout", () => {
        areaLayer.setStyle({
          fillOpacity: isWomenPolice ? 0.22 : 0.16,
          weight: 2,
        });
      });

      areaLayer.addTo(group);
      centerMarker.addTo(group);
    });
  }, [emergencyCentersKey, onMarkerSelect]);

  // 6. Render Real-Time Peer Volunteers on Map
  useEffect(() => {
    const group = volunteersLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    volunteers.forEach((v) => {
      const vIcon = L.divIcon({
        className: "volunteer-marker-pin",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <span class="absolute w-8 h-8 rounded-full bg-cyan-400 opacity-40 animate-ping"></span>
            <div class="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold shadow-cyan-500/50">
              🛡️
            </div>
            <span class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([v.coords.lat, v.coords.lng], { icon: vIcon });
      marker.bindTooltip(
        `
        <div class="p-2 text-xs font-bold text-slate-900 bg-white rounded-lg shadow-sm border border-slate-200">
          <p class="font-bold text-slate-900 flex items-center gap-1">${v.name}</p>
          <p class="text-[10px] text-slate-500 mt-0.5">
            ${v.distanceMeters ? `${v.distanceMeters}m away • ` : ""}${v.role}
          </p>
          <span class="inline-block px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 mt-1">Live Online</span>
        </div>
        `,
        { permanent: false, direction: "top", offset: [0, -14] }
      );

      marker.addTo(group);
    });
  }, [volunteers]);

  // 7. Render Active SOS Emergency Victims on Map (Pulsing Red Radar)
  useEffect(() => {
    const group = sosAlertsLayerGroupRef.current;
    const map = mapRef.current;
    if (!group) return;

    group.clearLayers();

    activeSosAlerts.forEach((alert) => {
      const sosIcon = L.divIcon({
        className: "active-sos-victim-pin",
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            <span class="absolute w-14 h-14 rounded-full bg-red-600 opacity-60 animate-ping"></span>
            <span class="absolute w-10 h-10 rounded-full bg-red-500 opacity-80 animate-pulse"></span>
            <div class="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-800 border-2 border-white shadow-2xl flex items-center justify-center text-white text-lg font-black shadow-red-600/70">
              🚨
            </div>
            <span class="absolute -top-1 -right-1 px-1.5 py-0.2 bg-red-600 text-white font-black text-[9px] rounded-full border border-white animate-bounce shadow">SOS</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([alert.coords.lat, alert.coords.lng], { icon: sosIcon, zIndexOffset: 1000 });
      marker.bindPopup(
        `
        <div class="p-2.5 font-sans min-w-[210px] text-gray-900">
          <div class="flex items-center gap-1.5 text-red-600 font-black text-[11px] uppercase tracking-wider mb-1">
            <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            EMERGENCY SOS ACTIVE
          </div>
          <h4 class="font-extrabold text-sm text-gray-950">${alert.victimName}</h4>
          <p class="text-xs text-gray-600 mt-1 font-semibold">
            📍 Distance: <strong class="text-red-600">${alert.distanceMeters ? `${alert.distanceMeters} meters` : "Nearby"}</strong>
          </p>
          <button id="sos-btn-${alert.id}" class="mt-3 w-full py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all">
            🚗 Start Driving to Victim
          </button>
        </div>
        `
      );

      marker.on("popupopen", () => {
        const btn = document.getElementById(`sos-btn-${alert.id}`);
        if (btn && onRespondToSos) {
          btn.onclick = () => onRespondToSos(alert);
        }
      });

      marker.addTo(group);
    });

    // If there's an emergency alert, smoothly adjust view to show both user and victim
    if (activeSosAlerts.length > 0 && map && !isSimulating) {
      const nearest = activeSosAlerts[0];
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [nearest.coords.lat, nearest.coords.lng],
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17, animate: true });
    }
  }, [activeSosAlerts, userLocation, isSimulating, onRespondToSos]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (map) {
      setFollowUser(true);
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-full bg-[#111112] overflow-hidden flex-1 select-none">
      {/* Real Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Action Controls - Perfectly Positioned on Right Side (Unobstructed) */}
      <div className="absolute right-4 top-36 z-30 flex flex-col gap-2 select-none">
        {/* Map View / Satellite Mode Toggle Button */}
        <button
          onClick={() => {
            setMapMode((prev) => (prev === "satellite" ? "streets" : prev === "streets" ? "dark" : "satellite"));
          }}
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shadow-xs border transition-all active:scale-95 ${
            mapMode === "satellite"
              ? "bg-emerald-700 text-white border-emerald-600"
              : mapMode === "streets"
              ? "bg-blue-700 text-white border-blue-600"
              : "bg-slate-900 text-slate-200 border-slate-700 hover:text-white"
          }`}
          title={`Switch Map View (Current: ${mapMode})`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[8px] font-bold uppercase tracking-tight mt-0.5">
            {mapMode === "satellite" ? "Sat" : mapMode === "streets" ? "Map" : "Dark"}
          </span>
        </button>

        {/* Recenter Location Button */}
        <button
          onClick={handleRecenter}
          className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xs border transition-all active:scale-95 ${
            followUser
              ? "bg-blue-700 text-white border-blue-600"
              : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white"
          }`}
          title="Recenter GPS Position"
        >
          <Navigation className="w-4 h-4 fill-current" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-lg overflow-hidden shadow-xs border border-slate-700 bg-slate-900 text-slate-200 divide-y divide-slate-800">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-9 flex items-center justify-center hover:bg-slate-800 text-white font-bold transition-colors active:bg-slate-700"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-9 flex items-center justify-center hover:bg-slate-800 text-white font-bold transition-colors active:bg-slate-700"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Syncing safe paths & helpers...</span>
        </div>
      )}
    </div>
  );
}

