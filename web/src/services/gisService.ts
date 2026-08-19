import { calculateDistance } from "../utils/geo";
import axios from "axios";
import type { Coords, HelpCenter, RouteDetails, Incident } from "../types/gis";

// OSRM Public Routing URL (Free, zero-cost routing fallback)
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/foot"; // Using foot (pedestrian) path for safety walking routes

// Nominatim Geocoding API
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Overpass API Interpreter URL (Using lenient server to avoid 429 rate limit)
const OVERPASS_BASE_URL = "https://lz4.overpass-api.de/api/interpreter";

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
        addressdetails: 1,
        limit: 7,
      },
    });

    return response.data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error("Geocoding search failed:", error);
    return [];
  }
}

/**
 * Reverse geocodes coordinates to a human-readable display name using OpenStreetMap Nominatim
 */
export async function reverseGeocode(coords: Coords): Promise<string> {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      headers,
      params: {
        lat: coords.lat,
        lon: coords.lng,
        format: "json",
        zoom: 18,
      },
    });
    return response.data.display_name || "Unknown Address";
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return `Location at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
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
      distance: calculateDistance(start, end),
      duration: calculateDistance(start, end) / 1.2, // ~1.2 m/s pedestrian speed
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
      node["amenity"~"university|college"](around:${radiusMeters},${center.lat},${center.lng});
      way["amenity"~"university|college"](around:${radiusMeters},${center.lat},${center.lng});
      node["leisure"="park"](around:${radiusMeters},${center.lat},${center.lng});
      way["leisure"="park"](around:${radiusMeters},${center.lat},${center.lng});
      node["amenity"~"community_centre|library"](around:${radiusMeters},${center.lat},${center.lng});
      way["amenity"~"community_centre|library"](around:${radiusMeters},${center.lat},${center.lng});
    );
    out body center;
  `;

  let centers: HelpCenter[] = [];
  try {
    const response = await axios.post(OVERPASS_BASE_URL, `data=${encodeURIComponent(query)}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
      timeout: 10000,
    });

    const elements = response.data.elements || [];
    centers = elements.map((el: any): HelpCenter => {
      const lat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : center.lat);
      const lng = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : center.lng);
      
      let type: HelpCenter["type"] = "hospital";
      let name = el.tags?.name || "";
      const lowerName = name.toLowerCase();

      if (el.tags?.amenity === "police") {
        if (lowerName.includes("women") || lowerName.includes("mahila") || lowerName.includes("female") || lowerName.includes("girl")) {
          type = "women_police";
        } else {
          type = "police";
        }
        if (!name) name = type === "women_police" ? "Women's Police Station" : "Police Station";
      } else if (el.tags?.amenity === "hospital") {
        type = "hospital";
        if (!name) name = "Hospital/Clinic";
      } else if (el.tags?.amenity === "university" || el.tags?.amenity === "college") {
        type = "safe_college";
        if (!name) name = "Safe Educational Campus";
      } else if (el.tags?.leisure === "park" || el.tags?.amenity === "community_centre" || el.tags?.amenity === "library") {
        type = "safe_gathering";
        if (!name) name = "Safe Public Gathering Spot";
      }

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
        distance: calculateDistance(center, { lat, lng }),
      };
    });
  } catch (error) {
    console.error("Overpass API failed, returning offline mock centers:", error);
    centers = getMockHelpCenters(center);
  }

  // Generate 3-4 fake volunteers near the user
  const volunteers = getNearbyVolunteers(center);
  return [...centers, ...volunteers];
}

export function getNearbyVolunteers(center: Coords): HelpCenter[] {
  const volunteerNames = ["Priya Sharma", "Rahul Verma", "Anita Desai", "Sunita Rao", "Kavya Singh"];
  const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const volunteers: HelpCenter[] = [];

  for (let i = 0; i < count; i++) {
    // Offset by roughly 200m to 1000m
    const latOffset = (Math.random() - 0.5) * 0.015;
    const lngOffset = (Math.random() - 0.5) * 0.015;
    
    volunteers.push({
      id: `volunteer-${i}`,
      name: `${volunteerNames[i % volunteerNames.length]} (Verified Volunteer)`,
      type: "volunteer",
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset,
      phone: "+91" + Math.floor(1000000000 + Math.random() * 9000000000).toString(),
      distance: calculateDistance(center, { lat: center.lat + latOffset, lng: center.lng + lngOffset }),
      address: "⭐ 4.9 Rating | Active Responder",
    });
  }
  return volunteers;
}

/**
 * Static mock incidents for danger zones (Reported incidents)
 */
export async function getReportedIncidents(center: Coords): Promise<Incident[]> {
  const query = `
    [out:json][timeout:15];
    (
      way["highway"]["lit"="no"](around:2000,${center.lat},${center.lng});
      way["highway"]["lit"="false"](around:2000,${center.lat},${center.lng});
    );
    out body center;
  `;

  let incidents: Incident[] = [];
  try {
    const response = await axios.post(OVERPASS_BASE_URL, `data=${encodeURIComponent(query)}`, {
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      timeout: 10000,
    });

    const elements = response.data.elements || [];
    incidents = elements.map((el: any, index: number): Incident => {
      const lat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : center.lat);
      const lng = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : center.lng);
      return {
        id: `dark-street-${el.id || index}`,
        title: "Unlit / Dark Street",
        description: "Satellite/OSM data indicates this street lacks proper lighting. Avoid walking alone at night.",
        lat,
        lng,
        severity: "medium",
        createdAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("Failed to fetch unlit streets:", err);
  }

  // Always append some mock local reported incidents for demonstration
  const mockIncidents: Incident[] = [
    {
      id: "inc-1",
      title: "Suspicious Activity",
      description: "Reported by community users: Suspicious group hanging around this corner.",
      lat: center.lat + 0.003,
      lng: center.lng - 0.004,
      severity: "medium",
      createdAt: new Date().toISOString(),
    },
    {
      id: "inc-2",
      title: "Unsafe Gathering / Harassment Area",
      description: "Multiple reports of active public intoxication and catcalling near the park entrance.",
      lat: center.lat - 0.005,
      lng: center.lng + 0.003,
      severity: "high",
      createdAt: new Date().toISOString(),
    },
  ];

  return [...incidents.slice(0, 5), ...mockIncidents]; // Cap unlit streets to top 5 to avoid clutter
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
