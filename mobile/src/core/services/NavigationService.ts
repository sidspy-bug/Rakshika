import axios from "axios";
import { Coords, RouteProfile, RouteSummary } from "../../types/navigation";

// OpenRouteService fallback credentials (mock/placeholder or real env config)
const ORS_API_KEY = ""; 
const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1";

/**
 * Calculates geodesic distance between two points in meters using the Haversine formula
 */
export function calculateDistance(p1: Coords, p2: Coords): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (p1.latitude * Math.PI) / 180;
  const phi2 = (p2.latitude * Math.PI) / 180;
  const deltaPhi = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const deltaLambda = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Evaluates whether a user's location is deviated from the route path (drift > threshold meters)
 */
export function isUserDeviated(
  userLoc: Coords,
  pathGeometry: [number, number][], // Array of [longitude, latitude]
  thresholdMeters: number = 50
): boolean {
  if (pathGeometry.length < 2) return false;

  let minDistance = Infinity;

  // Local Flat-Earth Cartesian projection around user location
  const latRadian = (userLoc.latitude * Math.PI) / 180;
  const metersPerDegreeLat = 111132.954 - 559.822 * Math.cos(2 * latRadian) + 1.175 * Math.cos(4 * latRadian);
  const metersPerDegreeLng = 111412.84 * Math.cos(latRadian) - 93.5 * Math.cos(3 * latRadian);

  const projectToCartesian = (coord: { latitude: number; longitude: number }) => ({
    x: coord.longitude * metersPerDegreeLng,
    y: coord.latitude * metersPerDegreeLat,
  });

  const u = projectToCartesian(userLoc);

  for (let i = 0; i < pathGeometry.length - 1; i++) {
    const p1 = projectToCartesian({ longitude: pathGeometry[i][0], latitude: pathGeometry[i][1] });
    const p2 = projectToCartesian({ longitude: pathGeometry[i + 1][0], latitude: pathGeometry[i + 1][1] });

    // Vector operations
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) continue;

    // Projection factor t constrained to [0, 1] segment
    let t = ((u.x - p1.x) * dx + (u.y - p1.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * dx;
    const projY = p1.y + t * dy;

    const dist = Math.sqrt((u.x - projX) * (u.x - projX) + (u.y - projY) * (u.y - projY));
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance > thresholdMeters;
}

/**
 * Fetch routing directions using OpenRouteService with OSRM and Geodesic fallbacks
 */
export async function getRoute(waypoints: Coords[], profile: RouteProfile): Promise<RouteSummary> {
  if (waypoints.length < 2) {
    throw new Error("At least 2 waypoints are required to route.");
  }

  // 1. Try OpenRouteService if API Key is set
  if (ORS_API_KEY) {
    try {
      const orsProfile = profile === "driving-car" ? "driving-car" : "foot-walking";
      const coordinates = waypoints.map((w) => [w.longitude, w.latitude]);

      const response = await axios.post(
        `${ORS_BASE_URL}/${orsProfile}/geojson`,
        { coordinates },
        {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 7000,
        }
      );

      const feature = response.data.features[0];
      const coords: [number, number][] = feature.geometry.coordinates; // [[lng, lat], ...]
      const dist = feature.properties.summary.distance; // meters
      const duration = feature.properties.summary.duration; // seconds

      return {
        geometry: coords,
        distance: dist,
        duration: duration,
        waypoints,
      };
    } catch (err) {
      console.warn("ORS route request failed. Retrying with OSRM fallback:", err);
    }
  }

  // 2. Fallback to Open Source Routing Machine (OSRM)
  try {
    const osrmProfile = profile === "driving-car" ? "driving" : "foot";
    const coordinateString = waypoints.map((w) => `${w.longitude},${w.latitude}`).join(";");
    const url = `${OSRM_BASE_URL}/${osrmProfile}/${coordinateString}?geometries=geojson&overview=full`;

    const response = await axios.get(url, { timeout: 6000 });
    const route = response.data.routes[0];
    const coords: [number, number][] = route.geometry.coordinates; // [[lng, lat], ...]

    return {
      geometry: coords,
      distance: route.distance,
      duration: route.duration,
      waypoints,
    };
  } catch (err) {
    console.error("OSRM route request failed. Retrying with straight-line fallback:", err);
  }

  // 3. Fallback to Geodesic (Straight line path)
  console.log("Completely offline: generating straight-line geodesic route segments.");
  const pathCoords: [number, number][] = waypoints.map((w) => [w.longitude, w.latitude]);
  
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
  }

  // Assume average walking speed = 1.3 m/s, driving = 10 m/s
  const speed = profile === "driving-car" ? 10 : 1.3;
  const estimatedDuration = totalDistance / speed;

  return {
    geometry: pathCoords,
    distance: totalDistance,
    duration: estimatedDuration,
    waypoints,
  };
}
export default { getRoute, calculateDistance, isUserDeviated };
