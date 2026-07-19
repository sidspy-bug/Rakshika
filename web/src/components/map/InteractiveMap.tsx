import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coords, HelpCenter, Incident, RouteDetails } from "../../types/gis";
import type { Waypoint } from "../../types/navigation";
import { Shield, Flame, Navigation, Crosshair, Loader2 } from "lucide-react";

interface InteractiveMapProps {
  userLocation: Coords;
  destination: Coords | null;
  waypoints?: Waypoint[];
  helpCenters: HelpCenter[];
  incidents: Incident[];
  route: RouteDetails | null;
  isLoading: boolean;
  onMarkerSelect?: (center: HelpCenter | Incident) => void;
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
  onMarkerSelect,
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
  const routePolylineRef = useRef<L.Polyline | null>(null);


  const [followUser, setFollowUser] = useState(true);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize Leaflet map centered at user location
    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 15,
      zoomControl: false, // Position custom zoom controls later
      attributionControl: false,
    });

    // Load CartoDB Dark Matter tiles with offline fallback support
    const OfflineTileLayer = L.TileLayer.extend({
      createTile: function (this: L.TileLayer, coords: L.Coords, done: L.DoneCallback) {
        const tile = document.createElement("img");
        L.DomEvent.on(tile, "load", L.Util.bind(done, null, null, tile));
        L.DomEvent.on(tile, "error", L.Util.bind(done, null, null, tile));

        const url = this.getTileUrl(coords);

        if (!navigator.onLine) {
          // Dynamic import to prevent circular compilation issues
          import("../../services/offlineMapService")
            .then((module) => {
              module.getCachedTileUrl(url).then((cachedBlobUrl) => {
                if (cachedBlobUrl) {
                  tile.src = cachedBlobUrl;
                } else {
                  // Fallback tile if map coordinate is missing from cache
                  tile.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:%23111112"><rect width="256" height="256" fill="%23111112"/><text x="50%" y="50%" fill="%23222" font-family="sans-serif" font-size="9" dominant-baseline="middle" text-anchor="middle">Offline Tile (Not Cached)</text></svg>`;
                }
              });
            })
            .catch((err) => {
              console.error("Failed to load offlineMapService:", err);
              tile.src = "";
            });
        } else {
          tile.src = url;
        }

        return tile;
      },
    });

    const baseTileLayer = new (OfflineTileLayer as any)(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
      }
    );
    baseTileLayer.addTo(map);


    // Add scale indicator at bottom-left
    L.control.scale({ position: "bottomleft" }).addTo(map);

    mapRef.current = map;

    // Track user drag to disable auto-centering
    map.on("dragstart", () => {
      setFollowUser(false);
    });

    // Create layer groups
    centersLayerGroupRef.current = L.layerGroup().addTo(map);
    incidentsLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);


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
          <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: pulseIcon }).addTo(map);
    }

    if (followUser && !isSimulating) {
      map.setView([userLocation.lat, userLocation.lng], map.getZoom(), { animate: true });
    }
  }, [userLocation, followUser, isSimulating]);

  // 3. Update Destination Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: "destination-marker",
        html: `
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-white font-bold">
              🏁
            </div>
            <div class="w-1 h-3 bg-rose-600"></div>
          </div>
        `,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
      });

      destinationMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup("<b>Destination</b><br/>Safe Walk target.");
      
      // Auto adjust map view to fit start + destination
      if (!isSimulating) {
        const bounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          [destination.lat, destination.lng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [destination]);

  // 3.5. Update Multi-Destination Waypoint Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = waypointsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp, idx) => {
        const isLast = idx === waypoints.length - 1;
        const markerColor = isLast ? "bg-rose-600" : "bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
        const markerIcon = isLast ? "🏁" : `${idx + 1}`;

        const icon = L.divIcon({
          className: "waypoint-marker",
          html: `
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 ${markerColor} rounded-full border-2 border-white flex items-center justify-center shadow-lg text-white text-xs font-bold transition-transform hover:scale-110">
                ${markerIcon}
              </div>
              <div class="w-1 h-3.5 ${isLast ? "bg-rose-600" : "bg-purple-600"}"></div>
            </div>
          `,
          iconSize: [32, 44],
          iconAnchor: [16, 44],
        });

        const popupContent = `
          <div class="font-sans text-gray-900 p-1">
            <h4 class="font-bold text-xs">${isLast ? "🏁 Final Destination" : `📍 Stop ${idx + 1}`}</h4>
            <p class="text-xs text-gray-500 mt-1">${wp.name}</p>
          </div>
        `;

        L.marker([wp.lat, wp.lng], { icon })
          .addTo(group)
          .bindPopup(popupContent);
      });

      // Fit map bounds to encompass user position and all waypoints
      if (!isSimulating) {
        const points = [
          [userLocation.lat, userLocation.lng] as [number, number],
          ...waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]),
        ];
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
    }
  }, [waypoints, userLocation, isSimulating]);


  // 4. Update Route Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (route && route.geometry.length > 0) {
      // Glow background path + primary path for visual flair
      routePolylineRef.current = L.polyline(route.geometry, {
        color: "#4CAF50", // Safe walk green
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Adjust map to fit route bounds if not active simulation
      if (!isSimulating) {
        const bounds = routePolylineRef.current.getBounds();
        map.fitBounds(bounds, { padding: [55, 55], animate: true });
      }
    }
  }, [route, isSimulating]);

  // 5. Update Nearby Help Centers Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = centersLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    helpCenters.forEach((center) => {
      const isPolice = center.type === "police";
      const iconColor = isPolice ? "bg-emerald-600" : "bg-teal-600";
      const iconEmoji = isPolice ? "🛡️" : "🏥";

      const icon = L.divIcon({
        className: "help-center-marker",
        html: `
          <div class="flex flex-col items-center cursor-pointer group">
            <div class="w-8 h-8 ${iconColor} rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-125">
              <span class="text-xs text-white">${iconEmoji}</span>
            </div>
            <div class="w-1 h-2 ${isPolice ? "bg-emerald-600" : "bg-teal-600"}"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const phoneText = center.phone ? `<br/><b>Phone:</b> <a href="tel:${center.phone}" class="text-blue-400 font-bold">${center.phone}</a>` : "";
      const addressText = center.address ? `<br/><span class="text-xs text-gray-400">${center.address}</span>` : "";
      
      const popupContent = `
        <div class="font-sans text-gray-900 p-1">
          <h4 class="font-bold text-sm flex items-center gap-1">
            ${isPolice ? "🛡️" : "🏥"} ${center.name}
          </h4>
          <p class="text-xs text-gray-500 mt-1 capitalize">${center.type} Center</p>
          ${addressText}
          ${phoneText}
        </div>
      `;

      L.marker([center.lat, center.lng], { icon })
        .addTo(group)
        .bindPopup(popupContent)
        .on("click", () => {
          if (onMarkerSelect) onMarkerSelect(center);
        });
    });
  }, [helpCenters, onMarkerSelect]);

  // 6. Update Danger Zone / Incident Markers
  useEffect(() => {
    const map = mapRef.current;
    const group = incidentsLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    incidents.forEach((incident) => {
      const color = incident.severity === "high" ? "bg-rose-600 animate-pulse" : "bg-amber-600";
      const icon = L.divIcon({
        className: "incident-marker",
        html: `
          <div class="flex flex-col items-center cursor-pointer">
            <div class="w-8 h-8 ${color} rounded-full border-2 border-white flex items-center justify-center shadow-lg">
              <span class="text-xs">⚠️</span>
            </div>
            <div class="w-1 h-2 ${incident.severity === "high" ? "bg-rose-600" : "bg-amber-600"}"></div>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });

      const popupContent = `
        <div class="font-sans text-gray-900 max-w-[200px]">
          <h4 class="font-bold text-sm text-red-600 flex items-center gap-1">⚠️ Danger Area</h4>
          <p class="font-semibold text-xs mt-1 text-gray-800">${incident.title}</p>
          <p class="text-[11px] text-gray-500 mt-1">${incident.description}</p>
          <span class="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white bg-red-500">
            Severity: ${incident.severity}
          </span>
        </div>
      `;

      L.marker([incident.lat, incident.lng], { icon })
        .addTo(group)
        .bindPopup(popupContent)
        .on("click", () => {
          if (onMarkerSelect) onMarkerSelect(incident);
        });
    });
  }, [incidents, onMarkerSelect]);

  // Map utilities click handlers
  const handleRecenter = () => {
    const map = mapRef.current;
    if (map) {
      setFollowUser(true);
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div className="relative w-full h-full bg-[#1C1C1E] overflow-hidden flex-1">
      {/* Real Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Action Controls */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col gap-2">
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-gray-800 backdrop-blur-md transition-colors ${
            followUser ? "bg-blue-600 text-white border-blue-500" : "bg-black/75 text-gray-300 hover:bg-black/90"
          }`}
          title="Recenter Location"
        >
          <Navigation className="w-5 h-5 fill-current" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl overflow-hidden shadow-lg border border-gray-800 bg-black/75 text-gray-300 divide-y divide-gray-800 backdrop-blur-md">
          <button
            onClick={handleZoomIn}
            className="w-12 h-12 flex items-center justify-center hover:bg-black/90 text-lg font-bold"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-12 h-12 flex items-center justify-center hover:bg-black/90 text-lg font-bold"
          >
            −
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black/85 text-white px-4 py-2 rounded-full border border-gray-800 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Recalculating safe route...</span>
        </div>
      )}
    </div>
  );
}
