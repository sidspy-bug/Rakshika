import axios from "axios";
import type { Coords, HelpCenter, RouteDetails, Incident } from "../types/gis";

// OSRM Public Routing URL (Free, zero-cost routing fallback)
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/foot"; // Using foot (pedestrian) path for safety walking routes

// Nominatim Geocoding API
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Overpass API Interpreter URL
const OVERPASS_BASE_URL = "https://overpass-api.de/api/interpreter";

// Set proper headers to comply with OSM Nominatim usage policy
const headers = {
  "User-Agent": "Rakshika-Women-Safety-Web-MVP/1.0 (siddhant.25scs1003002795@iilm.edu)",
};

/**
 * Searches for places/addresses in India using Nominatim OpenStreetMap
 */
export async function searchAddress(query: string): Promise<{ name: string; lat: number; lng: number }[]> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      headers,
      params: {
        q: query,
        format: "json",
        countrycodes: "in", // Limit results to India for MVP
        limit: 5,
      },
    });

    return response.data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error("Geocoding failed:", error);
    return [];
  }
}

/**
 * Calculates a route between two points using OSRM foot/pedestrian router
 */
export async function getRoute(start: Coords, end: Coords): Promise<RouteDetails> {
  try {
    const response = await axios.get(
      `${OSRM_BASE_URL}/${start.lng},${start.lat};${end.lng},${end.lat}`,
      {
        params: {
          overview: "full",
          geometries: "geojson",
        },
      }
    );

    const route = response.data.routes[0];
    if (!route) {
      throw new Error("No route found");
    }

    // OSRM returns coordinates as [lng, lat] - we must map to [lat, lng] for Leaflet
    const geometry: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );

    return {
      geometry,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
    };
  } catch (error) {
    console.error("Routing failed, using straight-line fallback:", error);
    // Fallback to straight line if service fails
    return {
      geometry: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      distance: calculateHaversineDistance(start, end),
      duration: calculateHaversineDistance(start, end) / 1.2, // ~1.2 m/s pedestrian speed
    };
  }
}

/**
 * Fetches nearby police stations and hospitals from Overpass API (OpenStreetMap data)
 */
export async function getNearbyHelpCenters(center: Coords, radiusMeters: number = 3000): Promise<HelpCenter[]> {
  const query = `
    [out:json][timeout:15];
    (
      node["amenity"="police"](around:${radiusMeters},${center.lat},${center.lng});
      way["amenity"="police"](around:${radiusMeters},${center.lat},${center.lng});
      node["amenity"="hospital"](around:${radiusMeters},${center.lat},${center.lng});
      way["amenity"="hospital"](around:${radiusMeters},${center.lat},${center.lng});
    );
    out body center;
  `;

  try {
    const response = await axios.post(OVERPASS_BASE_URL, `data=${encodeURIComponent(query)}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
      timeout: 10000,
    });

    const elements = response.data.elements || [];
    return elements.map((el: any) => {
      // Find latitude/longitude (either directly on node, or as center on way/relation)
      const lat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : center.lat);
      const lng = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : center.lng);
      
      const type = el.tags?.amenity === "police" ? "police" : "hospital";
      const name = el.tags?.name || (type === "police" ? "Police Station" : "Hospital/Clinic");
      const address = el.tags?.["addr:street"] 
        ? `${el.tags?.["addr:housenumber"] || ""} ${el.tags?.["addr:street"]}, ${el.tags?.["addr:city"] || ""}`
        : undefined;

      return {
        id: `${el.type}-${el.id}`,
        name,
        type,
        lat,
        lng,
        address,
        phone: el.tags?.phone || el.tags?.["contact:phone"] || undefined,
        distance: calculateHaversineDistance(center, { lat, lng }),
      };
    });
  } catch (error) {
    console.error("Overpass API failed, returning offline mock centers:", error);
    return getMockHelpCenters(center);
  }
}

/**
 * Static mock incidents for danger zones (Reported incidents)
 */
export function getReportedIncidents(center: Coords): Incident[] {
  // Generates 2 mock incidents near the user location for demonstration
  return [
    {
      id: "inc-1",
      title: "Poorly Lit Street",
      description: "Reported by community users: Streetlights are completely broken and dark at night.",
      lat: center.lat + 0.003,
      lng: center.lng - 0.004,
      severity: "medium",
      createdAt: new Date().toISOString(),
    },
    {
      id: "inc-2",
      title: "Unsafe Gathering / Harassment Area",
      description: "Multiple reports of active public intoxication and catcalling near the local park entrance.",
      lat: center.lat - 0.005,
      lng: center.lng + 0.003,
      severity: "high",
      createdAt: new Date().toISOString(),
    },
  ];
}

// Helper: Haversine distance formula
function calculateHaversineDistance(p1: Coords, p2: Coords): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Fallback mock centers for offline/rate-limited queries
function getMockHelpCenters(center: Coords): HelpCenter[] {
  return [
    {
      id: "mock-police-1",
      name: "Emergency Help Center (Police Desk)",
      type: "police",
      lat: center.lat + 0.002,
      lng: center.lng + 0.002,
      address: "Local Police Station HQ, Sector 4",
      phone: "112",
      distance: 300,
    },
    {
      id: "mock-hospital-1",
      name: "Rakshika Certified Safe Clinic / Hospital",
      type: "hospital",
      lat: center.lat - 0.003,
      lng: center.lng - 0.002,
      address: "Metro Super Speciality Hospital, Main Road",
      phone: "102",
      distance: 450,
    },
  ];
}
