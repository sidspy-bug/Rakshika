import type { Coords } from "../types/gis";

/**
 * Calculates the Haversine distance between two coordinates in meters.
 * @param coord1 Starting coordinate
 * @param coord2 Ending coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coord1: Coords, coord2: Coords): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

import type { RouteSummary } from "../types/navigation";
import type { HelpCenter, Incident } from "../types/gis";

/**
 * Calculates a safety score (0-100) for a given route based on nearby safe havens and incidents.
 */
export function calculateRouteSafetyScore(route: RouteSummary, helpCenters: HelpCenter[], incidents: Incident[]): number {
  if (!route || route.geometry.length === 0) return 60; // Default daytime baseline

  let safeHavenCount = 0;
  let dangerZoneCount = 0;

  // Sample route every ~10 points to avoid heavy calculation
  const step = Math.max(1, Math.floor(route.geometry.length / 20));

  for (let i = 0; i < route.geometry.length; i += step) {
    const pt = route.geometry[i];
    const ptCoords: Coords = { lat: pt[0], lng: pt[1] };

    // Check safe havens within 250m
    helpCenters.forEach(center => {
      const dist = calculateDistance(ptCoords, center);
      if (dist < 250) {
        if (center.type === "police" || center.type === "women_police" || center.type === "hospital") safeHavenCount += 1.5;
        else if (center.type === "transit_station" || center.type === "fire_station") safeHavenCount += 1.0;
        else safeHavenCount += 0.5;
      }
    });

    // Check incidents/unlit streets within 150m
    incidents.forEach(incident => {
      const dist = calculateDistance(ptCoords, incident);
      if (dist < 150) dangerZoneCount++;
    });
  }

  // Base score 60
  // Each safe haven adds ~5 points
  // Each danger zone subtracts ~10 points
  let score = 60 + (safeHavenCount * 5) - (dangerZoneCount * 10);
  
  return Math.max(10, Math.min(100, Math.round(score)));
}
