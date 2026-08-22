import { calculateDistance } from "../utils/geo";
import axios from "axios";
import type { Coords } from "../types/gis";
import type { RouteProfile, RouteSummary } from "../types/navigation";

// Read API key from environment config
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || "";
const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";

// OSRM Base Urls
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1";

/**
 * Main routing service wrapper. Uses OpenRouteService with OSRM and straight-line fallbacks.
 */
export async function getRoute(waypoints: Coords[], profile: RouteProfile): Promise<RouteSummary> {
  if (waypoints.length < 2) {
    throw new Error("Route requires at least 2 waypoints");
  }

  // 1. If Offline, trigger straight-line fallback immediately
  if (!navigator.onLine) {
    console.warn("Offline detected. Using straight-line path fallback.");
    return getStraightLineFallback(waypoints);
  }

  // 2. If ORS key exists, try querying OpenRouteService
  if (ORS_API_KEY) {
    try {
      const orsProfile = profile === "foot-walking" ? "foot-walking" : "driving-car";
      const response = await axios.post(
        `${ORS_BASE_URL}/${orsProfile}`,
        {
          coordinates: waypoints.map((w) => [w.lng, w.lat]), // ORS expects [lng, lat]
        },
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      const route = response.data.routes[0];
      if (route) {
        // ORS returns GeoJSON coordinates as [lng, lat] -> Flip to [lat, lng] for Leaflet
        const geometry: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );
        return {
          geometry,
          distance: route.summary.distance, // meters
          duration: route.summary.duration, // seconds
          waypoints,
        };
      }
    } catch (err) {
      console.warn("OpenRouteService failed, falling back to OSRM router:", err);
    }
  }

  // 3. OSRM Fallback (No-token, open-source fallback)
  try {
    const osrmProfile = profile === "foot-walking" ? "foot" : "driving";
    const coordsString = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const url = `${OSRM_BASE_URL}/${osrmProfile}/${coordsString}`;

    const response = await axios.get(url, {
      params: {
        overview: "full",
        geometries: "geojson",
        alternatives: 3, // Request alternative routes
      },
      timeout: 8000,
    });

    const routes = response.data.routes;
    if (routes && routes.length > 0) {
      // Map main route
      const mainGeometry: [number, number][] = routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      );
      
      const mainRouteSummary: RouteSummary = {
        geometry: mainGeometry,
        distance: routes[0].distance,
        duration: routes[0].duration,
        waypoints,
      };

      // Map alternative routes if they exist
      if (routes.length > 1) {
        mainRouteSummary.alternativeRoutes = routes.slice(1).map((r: any) => ({
          geometry: r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
          distance: r.distance,
          duration: r.duration,
          waypoints,
        }));
      }

      return mainRouteSummary;
    }
  } catch (err) {
    console.warn("OSRM routing failed, falling back to straight-line:", err);
  }

  // 4. Ultimate Fallback: Straight-line connects
  return getStraightLineFallback(waypoints);
}

/**
 * Fallback connecting all coordinates using straight-line geodesic distances
 */
function getStraightLineFallback(waypoints: Coords[]): RouteSummary {
  const geometry: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
  
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
  }

  // Pedestrian average: 1.2 m/s, Vehicle average: 10 m/s
  const speed = 1.2;
  const duration = totalDistance / speed;

  return {
    geometry,
    distance: totalDistance,
    duration,
    waypoints,
  };
}


/**
 * Checks if user is deviated from route.
 * Calculates perpendicular distance to all route segments.
 * Returns true if minimum distance > thresholdMeters.
 */
export function isUserDeviated(userLoc: Coords, routeGeometry: [number, number][], thresholdMeters: number = 50): boolean {
  if (routeGeometry.length < 2) return false;

  let minDistance = Infinity;

  // Approximate scales for local flat-earth grid coordinates in meters
  const latScale = 111132;
  const lngScale = 40075000 * Math.cos((userLoc.lat * Math.PI) / 180) / 360;

  // User point C
  const cx = userLoc.lng * lngScale;
  const cy = userLoc.lat * latScale;

  for (let i = 0; i < routeGeometry.length - 1; i++) {
    const p1 = routeGeometry[i];
    const p2 = routeGeometry[i + 1];

    // Segment points A and B
    const ax = p1[1] * lngScale;
    const ay = p1[0] * latScale;
    const bx = p2[1] * lngScale;
    const by = p2[0] * latScale;

    // Vectors
    const abx = bx - ax;
    const aby = by - ay;
    const acx = cx - ax;
    const acy = cy - ay;

    // Projection factor t
    const abLenSq = abx * abx + aby * aby;
    let t = abLenSq === 0 ? 0 : (acx * abx + acy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t)); // Clamp to segment boundaries

    // Closest point P on segment
    const px = ax + t * abx;
    const py = ay + t * aby;

    // Distance from C to P
    const dx = cx - px;
    const dy = cy - py;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistance) {
      minDistance = distSq;
    }
  }

  const distance = Math.sqrt(minDistance);
  return distance > thresholdMeters;
}
