import { useState, useEffect, useCallback } from "react";
import type { Coords, HelpCenter, RouteDetails, Incident } from "../types/gis";
import { getNearbyHelpCenters, getRoute, getReportedIncidents } from "../services/gisService";

interface UseGisDataProps {
  userLocation: Coords;
  destination: Coords | null;
}

export function useGisData({ userLocation, destination }: UseGisDataProps) {
  const [helpCenters, setHelpCenters] = useState<HelpCenter[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [route, setRoute] = useState<RouteDetails | null>(null);
  
  const [loadingCenters, setLoadingCenters] = useState<boolean>(false);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch help centers and incidents near the user location
  const fetchNearbyData = useCallback(async (coords: Coords) => {
    setLoadingCenters(true);
    setError(null);
    try {
      const [centers, localIncidents] = await Promise.all([
        getNearbyHelpCenters(coords),
        Promise.resolve(getReportedIncidents(coords)),
      ]);
      setHelpCenters(centers);
      setIncidents(localIncidents);
    } catch (err: any) {
      console.error("Failed to fetch GIS POIs:", err);
      setError("Failed to load safety centers.");
    } finally {
      setLoadingCenters(false);
    }
  }, []);

  // Recalculate route when start or end coordinates change
  const fetchRouteDetails = useCallback(async (start: Coords, end: Coords) => {
    setLoadingRoute(true);
    try {
      const routeData = await getRoute(start, end);
      setRoute(routeData);
    } catch (err: any) {
      console.error("Failed to compute route:", err);
      setRoute(null);
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  // Update POIs when user location is available
  useEffect(() => {
    if (userLocation) {
      fetchNearbyData(userLocation);
    }
  }, [userLocation, fetchNearbyData]);

  // Update route path when destination is set or updated
  useEffect(() => {
    if (userLocation && destination) {
      fetchRouteDetails(userLocation, destination);
    } else {
      setRoute(null);
    }
  }, [userLocation, destination, fetchRouteDetails]);

  // Force refetch nearby centers
  const refreshHelpCenters = () => {
    if (userLocation) {
      fetchNearbyData(userLocation);
    }
  };

  return {
    helpCenters,
    incidents,
    route,
    loading: loadingCenters || loadingRoute,
    loadingCenters,
    loadingRoute,
    error,
    refreshHelpCenters,
  };
}
