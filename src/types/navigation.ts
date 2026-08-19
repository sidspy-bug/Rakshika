import type { Coords } from "./gis";

export type RouteProfile = "foot-walking" | "driving-car";

export const ROUTE_PROFILES = ["foot-walking", "driving-car"] as const;

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteSummary {
  geometry: [number, number][]; // coordinates for Leaflet polyline
  distance: number;             // meters
  duration: number;             // seconds
  waypoints: Coords[];          // direct waypoints used
}

export interface NavigationState {
  waypoints: Waypoint[];
  profile: RouteProfile;
  route: RouteSummary | null;
  isNavigating: boolean;
  isRecalculating: boolean;
  deviationCount: number;
}
