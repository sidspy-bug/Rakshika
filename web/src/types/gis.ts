export interface Coords {
  lat: number;
  lng: number;
}

export const GIS_MARKER_TYPES = ["police", "hospital"] as const;

export type HelpCenterType = "police" | "hospital";

export interface HelpCenter {
  id: string;
  name: string;
  type: HelpCenterType;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  distance?: number; // in meters or km
}

export interface RouteDetails {
  geometry: [number, number][]; // Array of [lat, lng] points
  distance: number;             // Distance in meters
  duration: number;             // Duration in seconds
}

export type IncidentSeverity = "low" | "medium" | "high";

export interface Incident {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: IncidentSeverity;
  createdAt: string;
}
