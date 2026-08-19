import { useState, useEffect, useRef } from "react";
import type { Coords } from "../types/gis";
import { enqueueLocation } from "../services/offlineLocationQueue";
import { api } from "../services/api";
import { DEFAULT_COORDS } from "./useUserLocation";

interface UseOfflineLocationProps {
  emergencyId: string | null;
  isOnline: boolean;
  isTracking: boolean;
}

export function useOfflineLocation({ emergencyId, isOnline, isTracking }: UseOfflineLocationProps) {
  const [location, setLocation] = useState<Coords>(DEFAULT_COORDS);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const handleSuccess = async (position: GeolocationPosition) => {
      const coords: Coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      
      setLocation(coords);
      setError(null);

      const payload = {
        emergencyId: emergencyId,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: position.coords.accuracy || null,
        speed: position.coords.speed || null,
        heading: position.coords.heading || null,
        timestamp: new Date().toISOString(),
      };

      if (isOnline) {
        // Online: Direct upload
        try {
          await api.post("/location/update", payload);
        } catch (err) {
          console.warn("Direct upload failed, saving to offline buffer:", err);
          enqueueLocation(payload);
        }
      } else {
        // Offline: Buffer in local queue
        console.log("Device offline: Queueing GPS breadcrumb locally.");
        enqueueLocation(payload);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Location update error:", error.message);
      setError(error.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [emergencyId, isOnline, isTracking]);

  return {
    location,
    error,
  };
}
