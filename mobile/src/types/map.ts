export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type MapTheme = "light" | "dark" | "system";

export type PermissionState = "granted" | "denied" | "undetermined" | "disabled";

export interface MapStyle {
  version: number;
  sources: Record<string, any>;
  layers: Record<string, any>[];
}
