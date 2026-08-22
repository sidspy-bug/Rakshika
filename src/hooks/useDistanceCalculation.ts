/**
 * useDistanceCalculation Hook
 *
 * Provides real-time distance calculation between current location
 * and a target location, with human-readable formatting.
 */

import { useState, useEffect } from "react";
import { useUserLocation } from "./useUserLocation";
import { calculateDistance } from "../utils/geo";
import type { Coords } from "../types/gis";

export function formatDistance(meters: number): string {
  if (meters < 10) return "Here";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function useDistanceCalculation(targetCoords?: Coords | null) {
  const { location, loading, error } = useUserLocation();
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (location && targetCoords) {
      const dist = calculateDistance(location, targetCoords);
      setDistance(dist);
    } else {
      setDistance(null);
    }
  }, [location, targetCoords]);

  return {
    distance,
    formattedDistance: distance !== null ? formatDistance(distance) : null,
    isCalculating: loading,
    error,
    currentLocation: location,
  };
}
