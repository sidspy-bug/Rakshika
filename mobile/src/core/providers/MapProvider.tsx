import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LocationData, PermissionState, MapTheme } from "../../types/map";
import { Coords, RouteProfile, RouteSummary, Waypoint } from "../../types/navigation";
import LocationService from "../services/LocationService";
import NavigationService from "../services/NavigationService";
import OfflineMapService from "../services/OfflineMapService";

interface MapContextProps {
  userLocation: LocationData | null;
  permissionStatus: PermissionState;
  followUser: boolean;
  theme: MapTheme;
  isTracking: boolean;
  isOnline: boolean;
  error: string | null;
  
  // Navigation Routing States
  waypoints: Waypoint[];
  profile: RouteProfile;
  route: RouteSummary | null;
  isNavigating: boolean;
  isRouteLoading: boolean;

  // Cache settings
  activeOfflineCity: string | null;
  setActiveOfflineCity: (cityId: string | null) => void;

  setTheme: (theme: MapTheme) => void;
  setFollowUser: (follow: boolean) => void;
  setProfile: (profile: RouteProfile) => void;
  requestMapPermissions: () => Promise<PermissionState>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;

  // Waypoint modifiers
  addWaypoint: (point: Omit<Waypoint, "id">) => void;
  removeWaypoint: (id: string) => void;
  clearWaypoints: () => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  recalculateRoute: () => Promise<void>;
}

const MapContext = createContext<MapContextProps | undefined>(undefined);
const TELEMETRY_STORAGE_KEY = "rakshika-offline-telemetry";
const BACKEND_URL = "http://localhost:8000/api/v1/locations/update"; // Gateway URL

export const DELHI_FALLBACK: LocationData = {
  latitude: 28.6139,
  longitude: 77.2090,
  accuracy: 0,
  altitude: 0,
  heading: 0,
  speed: 0,
  timestamp: Date.now(),
};

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>("undetermined");
  const [followUser, setFollowUser] = useState(true);
  const [theme, setThemeState] = useState<MapTheme>("dark");
  const [isTracking, setIsTracking] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state values
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [profile, setProfileState] = useState<RouteProfile>("foot-walking");
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Offline maps active container
  const [activeOfflineCity, setActiveOfflineCity] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastRecalculationRef = useRef<number>(0);
  const RECALC_COOLDOWN_MS = 8000;

  // 1. Monitor Network status changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      if (online) {
        flushOfflineTelemetry();
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Queue Location Telemetry
  useEffect(() => {
    if (!userLocation) return;

    const payload = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      timestamp: new Date(userLocation.timestamp).toISOString(),
    };

    const streamTelemetry = async () => {
      const token = await AsyncStorage.getItem("rakshika-auth-token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (isOnline) {
        axios.post(BACKEND_URL, payload, { headers }).catch((err) => {
          console.warn("Failed to stream telemetry online. Queueing locally:", err);
          enqueueTelemetry(payload);
        });
      } else {
        enqueueTelemetry(payload);
      }
    };

    streamTelemetry();
  }, [userLocation, isOnline]);

  const enqueueTelemetry = async (payload: any) => {
    try {
      const raw = await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      await AsyncStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error("Failed to buffer coordinate logs:", err);
    }
  };

  const flushOfflineTelemetry = async () => {
    try {
      const raw = await AsyncStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (!raw) return;

      const queue = JSON.parse(raw);
      if (queue.length === 0) return;

      console.log(`Connection restored. Flushing ${queue.length} coordinates updates to backend...`);
      
      const token = await AsyncStorage.getItem("rakshika-auth-token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Batch sync or sequential post requests
      for (const payload of queue) {
        await axios.post(BACKEND_URL, payload, { headers });
      }

      await AsyncStorage.removeItem(TELEMETRY_STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to sync buffered coordinates breadcrumbs:", err);
    }
  };

  // 3. Request permissions and watches
  const requestMapPermissions = async (): Promise<PermissionState> => {
    const status = await LocationService.requestPermissions();
    setPermissionStatus(status);
    if (status === "granted") {
      setError(null);
      try {
        const loc = await LocationService.getCurrentLocation();
        setUserLocation(loc);
      } catch (err) {
        console.warn("Initial coordinates lookup failed:", err);
      }
    } else if (status === "denied") {
      setError("Location permission denied. Map features will be restricted.");
      setUserLocation(DELHI_FALLBACK);
    } else if (status === "disabled") {
      setError("GPS services are disabled. Turn on GPS.");
      setUserLocation(DELHI_FALLBACK);
    }
    return status;
  };

  const startTracking = async () => {
    if (isTracking) return;

    try {
      const status = await LocationService.requestPermissions();
      setPermissionStatus(status);

      if (status !== "granted") {
        setIsTracking(false);
        setUserLocation(DELHI_FALLBACK);
        return;
      }

      setError(null);
      setIsTracking(true);

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }

      subscriptionRef.current = await LocationService.watchLocation(
        (loc) => {
          setUserLocation(loc);
          // Evaluate GPS route deviation during active navigation
          evaluateDeviation(loc);
        },
        (err) => {
          setError(err.message);
        }
      );
    } catch (err: any) {
      setError(err.message || "Failed to start location tracker");
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setIsTracking(false);
  };

  // 4. Multi-destination Route calculation wrapper
  const calculateRoutePath = async (currentWaypoints: Waypoint[], currentProfile: RouteProfile) => {
    if (currentWaypoints.length < 1 || !userLocation) {
      setRoute(null);
      return;
    }

    setIsRouteLoading(true);
    try {
      const fullCoordsList: Coords[] = [
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        ...currentWaypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude })),
      ];

      const calculated = await NavigationService.getRoute(fullCoordsList, currentProfile);
      setRoute(calculated);
    } catch (err) {
      console.error("Navigation routing failed:", err);
      setError("Failed to calculate routing path");
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Recalculate route when waypoints list or profile selection changes
  useEffect(() => {
    if (waypoints.length > 0 && userLocation) {
      calculateRoutePath(waypoints, profile);
    } else {
      setRoute(null);
    }
  }, [waypoints, profile]);

  const evaluateDeviation = (userLoc: LocationData) => {
    if (!isNavigating || !route || route.geometry.length === 0) return;

    const deviated = NavigationService.isUserDeviated(
      { latitude: userLoc.latitude, longitude: userLoc.longitude },
      route.geometry,
      50
    );

    if (deviated) {
      const now = Date.now();
      if (now - lastRecalculationRef.current > RECALC_COOLDOWN_MS) {
        console.warn("User deviated >50m on mobile client. Recalculating path...");
        lastRecalculationRef.current = now;
        calculateRoutePath(waypoints, profile);
      }
    }
  };

  // Waypoints lists builders
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

  const setTheme = (selectedTheme: MapTheme) => {
    setThemeState(selectedTheme);
  };

  const setFollowUser = (follow: boolean) => {
    setFollowUser(follow);
  };

  const setProfile = (selectedProfile: RouteProfile) => {
    setProfileState(selectedProfile);
  };

  // Cleanup on destroy
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return (
    <MapContext.Provider
      value={{
        userLocation,
        permissionStatus,
        followUser,
        theme,
        isTracking,
        isOnline,
        error,
        
        waypoints,
        profile,
        route,
        isNavigating,
        isRouteLoading,
        
        activeOfflineCity,
        setActiveOfflineCity,

        setTheme,
        setFollowUser,
        setProfile,
        requestMapPermissions,
        startTracking,
        stopTracking,
        
        addWaypoint,
        removeWaypoint,
        clearWaypoints,
        startNavigation,
        stopNavigation,
        recalculateRoute: () => calculateRoutePath(waypoints, profile),
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export function useMap() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
}
export default MapProvider;
