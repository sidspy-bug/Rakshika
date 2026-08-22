import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCachedTileUrl } from "../../services/offlineMapService";
import type { Coords, HelpCenter, Incident } from "../../types/gis";
import type { RouteSummary, Waypoint } from "../../types/navigation";
import { Shield, Navigation, Loader2, Plus, Minus, Layers, AlertTriangle } from "lucide-react";

interface InteractiveMapProps {
  userLocation: Coords;
  destination: Coords | null;
  waypoints?: Waypoint[];
  helpCenters: HelpCenter[];
  incidents: Incident[];
  route: RouteSummary | null;
  isLoading: boolean;
  filterCategory?: string;
  onMarkerSelect?: (center: HelpCenter | Incident) => void;
  onMapClick?: (coords: Coords, address: string) => void;
  onClearDestination?: () => void;
  isSimulating: boolean;
}

export function InteractiveMap({
  userLocation,
  destination,
  waypoints = [],
  helpCenters,
  incidents,
  route,
  isLoading,
  filterCategory = "all",
  onMarkerSelect,
  onMapClick,
  isSimulating,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Keep track of layers to clear them dynamically
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const centersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const dangerHalosLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.LayerGroup | null>(null);

  const [followUser, setFollowUser] = useState(true);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    const OfflineTileLayer = L.TileLayer.extend({
      createTile: function (this: L.TileLayer, coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement("img");
        L.DomEvent.on(tile, "load", L.Util.bind(done, null, null, tile));
        L.DomEvent.on(tile, "error", L.Util.bind(done, null, null, tile));

        const url = this.getTileUrl(coords);

        if (!navigator.onLine) {
          getCachedTileUrl(url)
            .then((cachedBlobUrl) => {
              if (cachedBlobUrl) {
                tile.src = cachedBlobUrl;
              } else {
                tile.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:%23111112"><rect width="256" height="256" fill="%23111112"/><text x="50%" y="50%" fill="%23222" font-family="sans-serif" font-size="9" dominant-baseline="middle" text-anchor="middle">Offline Tile</text></svg>`;
              }
            })
            .catch((err) => {
              console.error("Failed to load tile from cache:", err);
              tile.src = "";
            });
        } else {
          tile.src = url;
        }

        return tile;
      },
    });

    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const tileTheme = isDarkMode ? "dark_all" : "dark_all"; // CartoDB dark matter highlights emergency nodes vividly

    const baseTileLayer = new (OfflineTileLayer as any)(
      `https://{s}.basemaps.cartocdn.com/${tileTheme}/{z}/{x}/{y}{r}.png`,
      {
        maxZoom: 20,
      }
    );
    baseTileLayer.addTo(map);

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
    dangerHalosLayerGroupRef.current = L.layerGroup().addTo(map);
    centersLayerGroupRef.current = L.layerGroup().addTo(map);
    incidentsLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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

  // 5. Update Help Centers & Volunteers Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = centersLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const filtered = helpCenters.filter((center) => {
      if (filterCategory === "all") return true;
      if (filterCategory === "police") return center.type === "police" || center.type === "women_police";
      if (filterCategory === "hospital") return center.type === "hospital";
      if (filterCategory === "pharmacy_24h") return center.type === "pharmacy_24h";
      if (filterCategory === "transit_station") return center.type === "transit_station";
      if (filterCategory === "volunteer") return center.type === "volunteer";
      if (filterCategory === "safe_haven") return center.type !== "volunteer";
      return true;
    });

    filtered.forEach((center) => {
      let iconColor = "bg-teal-600 shadow-[0_0_10px_rgba(13,148,136,0.5)]";
      let iconEmoji = "🏥";
      let labelBadge = "Help Center";

      switch (center.type) {
        case "police":
          iconColor = "bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)]";
          iconEmoji = "🛡️";
          labelBadge = "Police Post";
          break;
        case "women_police":
          iconColor = "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.7)]";
          iconEmoji = "♀️👮‍♀️";
          labelBadge = "Mahila Thana";
          break;
        case "hospital":
          iconColor = "bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.6)]";
          iconEmoji = "🏥";
          labelBadge = "24/7 Hospital";
          break;
        case "pharmacy_24h":
          iconColor = "bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.6)]";
          iconEmoji = "💊";
          labelBadge = "24/7 Medical";
          break;
        case "transit_station":
          iconColor = "bg-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.6)]";
          iconEmoji = "🚆";
          labelBadge = "Transit Hub";
          break;
        case "atm_bank":
          iconColor = "bg-emerald-700";
          iconEmoji = "🏧";
          labelBadge = "Guarded ATM";
          break;
        case "safe_college":
          iconColor = "bg-indigo-600";
          iconEmoji = "🎓";
          labelBadge = "Campus Safe Zone";
          break;
        case "volunteer":
          iconColor = "bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.7)]";
          iconEmoji = "🙋‍♀️";
          labelBadge = "Active Volunteer (30s Live)";
          break;
        case "destination":
          iconColor = "bg-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.6)]";
          iconEmoji = "📍";
          labelBadge = "Target";
          break;
        default:
          iconColor = "bg-teal-600";
          iconEmoji = "🛡️";
          labelBadge = "Safe Haven";
          break;
      }

      const icon = L.divIcon({
        className: "help-center-marker",
        html: `
          <div class="flex flex-col items-center cursor-pointer group transition-transform duration-200 hover:scale-125">
            <div class="w-8 h-8 ${iconColor} rounded-full border-2 border-white flex items-center justify-center text-xs">
              ${iconEmoji}
            </div>
            <div class="w-1 h-2 ${iconColor.split(" ")[0]}"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      L.marker([center.lat, center.lng], { icon })
        .addTo(group)
        .on("click", () => {
          if (onMarkerSelect) onMarkerSelect(center);
        });
    });
  }, [helpCenters, filterCategory, onMarkerSelect]);

  // 6. Update Danger Zone Halos & Incident Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = incidentsLayerGroupRef.current;
    const halosGroup = dangerHalosLayerGroupRef.current;
    if (!map || !group || !halosGroup) return;

    group.clearLayers();
    halosGroup.clearLayers();

    if (filterCategory !== "all" && filterCategory !== "incidents") {
      return; // Filtered out
    }

    incidents.forEach((incident) => {
      const isHigh = incident.severity === "high";
      const color = isHigh ? "bg-rose-600 shadow-[0_0_14px_rgba(225,29,72,0.8)]" : "bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.6)]";
      const circleColor = isHigh ? "#e11d48" : "#d97706";

      // Draw danger zone radius halo
      L.circle([incident.lat, incident.lng], {
        radius: isHigh ? 180 : 120,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: "4, 4",
      }).addTo(halosGroup);

      const icon = L.divIcon({
        className: "incident-marker",
        html: `
          <div class="flex flex-col items-center cursor-pointer group transition-transform duration-200 hover:scale-125">
            <div class="w-8 h-8 ${color} rounded-full border-2 border-white flex items-center justify-center text-xs animate-pulse">
              ⚠️
            </div>
            <div class="w-1 h-2 ${isHigh ? "bg-rose-600" : "bg-amber-600"}"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      L.marker([incident.lat, incident.lng], { icon })
        .addTo(group)
        .on("click", () => {
          if (onMarkerSelect) onMarkerSelect(incident);
        });
    });
  }, [incidents, filterCategory, onMarkerSelect]);

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
      <div className="absolute right-4 top-36 z-30 flex flex-col gap-2.5">
        {/* Recenter Location Button */}
        <button
          onClick={handleRecenter}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-2xl border backdrop-blur-xl transition-all active:scale-95 ${
            followUser
              ? "bg-blue-600 text-white border-blue-400 shadow-blue-500/40"
              : "bg-black/80 text-gray-300 border-gray-800 hover:bg-black/95 hover:text-white"
          }`}
          title="Recenter GPS Position"
        >
          <Navigation className={`w-5 h-5 fill-current ${followUser ? "animate-pulse" : ""}`} />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-black/80 text-gray-300 divide-y divide-gray-800/80 backdrop-blur-xl">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-11 h-10 flex items-center justify-center hover:bg-white/10 text-white font-bold transition-colors active:bg-white/20"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-11 h-10 flex items-center justify-center hover:bg-white/10 text-white font-bold transition-colors active:bg-white/20"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-black/90 text-white px-4 py-2 rounded-full border border-emerald-500/30 text-xs font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Syncing safe paths & helpers...</span>
        </div>
      )}
    </div>
  );
}

