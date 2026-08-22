import { useState, useEffect, useCallback, useRef } from "react";
import type { Coords, HelpCenter, RouteDetails, Incident } from "../types/gis";
import { getNearbyHelpCenters, getRoute, getReportedIncidents, getNearbyVolunteers } from "../services/gisService";
import { calculateDistance } from "../utils/geo";

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
  const [lastFetchLocation, setLastFetchLocation] = useState<Coords | null>(null);

  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;

  // 1. Fetch public infrastructure POIs & realistic incidents
  const fetchNearbyData = useCallback(async (coords: Coords) => {
    setLoadingCenters(true);
    setError(null);
    try {
      const [centers, localIncidents] = await Promise.all([
        getNearbyHelpCenters(coords),
        getReportedIncidents(coords),
      ]);
      
      // Get stable volunteers
      const volunteers = getNearbyVolunteers(coords, false);
      
      setHelpCenters([...centers, ...volunteers]);
      setIncidents(localIncidents);
    } catch (err: any) {
      console.warn("Failed to fetch GIS POIs:", err);
      setError("Failed to load safety centers.");
      // Fallback
      const volunteers = getNearbyVolunteers(coords, false);
      setHelpCenters(volunteers);
    } finally {
      setLoadingCenters(false);
    }
  }, []);

  // 2. 30-Second Volunteer Refresh Timer (Gently updates volunteer beacons without re-querying Overpass)
  useEffect(() => {
    const interval = setInterval(() => {
      if (userLocationRef.current) {
        const updatedVolunteers = getNearbyVolunteers(userLocationRef.current, true);
        setHelpCenters((prevCenters) => {
          // Keep static help centers (police, hospitals, etc.) and swap only volunteers
          const nonVolunteers = prevCenters.filter((c) => c.type !== "volunteer");
          return [...nonVolunteers, ...updatedVolunteers];
        });
      }
    }, 30000); // Exactly 30 seconds

    return () => clearInterval(interval);
  }, []);

  // 3. Recalculate route when start or end coordinates change
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

  // 4. Update POIs when user location is available and moved significantly (> 500 meters)
  useEffect(() => {
    if (userLocation) {
      if (!lastFetchLocation) {
        fetchNearbyData(userLocation);
        setLastFetchLocation(userLocation);
      } else {
        const distance = calculateDistance(userLocation, lastFetchLocation);
        if (distance > 500) {
          fetchNearbyData(userLocation);
          setLastFetchLocation(userLocation);
        }
      }
    }
  }, [userLocation, lastFetchLocation, fetchNearbyData]);

  // 5. Update route path when destination is set or updated
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

