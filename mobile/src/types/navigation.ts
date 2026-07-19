export interface Coords {
  latitude: number;
  longitude: number;
}

export type RouteProfile = "foot-walking" | "driving-car";

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteSummary {
  geometry: [number, number][]; // coordinates for MapLibre polyline [[lng, lat], ...]
  distance: number;             // meters
  duration: number;             // seconds
  waypoints: Coords[];          // direct waypoints used
}
