import { useState, useEffect, useCallback, useRef } from "react";
import type { Coords, HelpCenter, Incident } from "../types/gis";
import type { RouteProfile, RouteSummary, Waypoint } from "../types/navigation";
import { getRoute, isUserDeviated } from "../services/navigationService";
import { calculateRouteSafetyScore } from "../utils/geo";

interface UseNavigationProps {
  userLocation: Coords;
  helpCenters?: HelpCenter[];
  incidents?: Incident[];
}

export function useNavigation({ userLocation, helpCenters = [], incidents = [] }: UseNavigationProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [profile, setProfile] = useState<RouteProfile>("foot-walking");
  const [route, setRoute] = useState<RouteSummary | null>(null);
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastRecalculationRef = useRef<number>(0);
  const RECALC_COOLDOWN_MS = 8000; // 8 seconds limit

  // 1. Calculate route based on waypoints list
  const calculateRoutePath = useCallback(async (currentWaypoints: Waypoint[], currentProfile: RouteProfile) => {
    if (currentWaypoints.length < 1) {
      setRoute(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Stitch user location as the starting point of the navigation route
      const fullCoordsList: Coords[] = [
        { lat: userLocation.lat, lng: userLocation.lng },
        ...currentWaypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
      ];

      const routeData = await getRoute(fullCoordsList, currentProfile);
      
      // Calculate safety scores
      if (routeData) {
        routeData.safetyScore = calculateRouteSafetyScore(routeData, helpCenters, incidents);
        if (routeData.alternativeRoutes) {
          routeData.alternativeRoutes.forEach(alt => {
            alt.safetyScore = calculateRouteSafetyScore(alt, helpCenters, incidents);
          });
          
          // Optionally, sort alternative routes by safety score if profile is foot-walking
          if (currentProfile === "foot-walking") {
            const allRoutes = [routeData, ...routeData.alternativeRoutes];
            allRoutes.sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0));
            
            // Re-assign highest safety score to primary route
            const bestRoute = allRoutes[0];
            bestRoute.alternativeRoutes = allRoutes.slice(1);
            setRoute(bestRoute);
            return;
          }
        }
      }
      
      setRoute(routeData);
    } catch (err: any) {
      console.error("Navigation routing failure:", err);
      setError("Unable to calculate navigation route.");
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [userLocation, helpCenters, incidents]);

  // Recalculate route when waypoints or profile selections change
  useEffect(() => {
    if (waypoints.length > 0) {
      calculateRoutePath(waypoints, profile);
    } else {
      setRoute(null);
    }
  }, [waypoints, profile, calculateRoutePath]);

  // 2. Auto-Recalculate route upon GPS deviations
  useEffect(() => {
    if (!isNavigating || !route || route.geometry.length === 0 || !userLocation) return;

    // Check if user is deviated from the route path geometry line (>50 meters)
    const deviated = isUserDeviated(userLocation, route.geometry, 50);
    
    if (deviated) {
      const now = Date.now();
      if (now - lastRecalculationRef.current > RECALC_COOLDOWN_MS) {
        console.warn("GPS deviation detected! Triggering auto-recalculation.");
        lastRecalculationRef.current = now;
        
        // Triggers recalculation by calling calculateRoutePath with same targets
        calculateRoutePath(waypoints, profile);
      }
    }
  }, [userLocation, isNavigating, route, waypoints, profile, calculateRoutePath]);

  // Waypoint operations
  const addWaypoint = (point: Omit<Waypoint, "id">) => {
    const newWaypoint: Waypoint = {
      ...point,
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    setRoute(null);
    setIsNavigating(false);
  };

  const startNavigation = () => {
    if (route) {
      setIsNavigating(true);
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
  };

  return {
    waypoints,
    profile,
    route,
    isNavigating,
    loading,
    error,
    setProfile,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    startNavigation,
    stopNavigation,
    recalculateRoute: () => calculateRoutePath(waypoints, profile),
  };
}
