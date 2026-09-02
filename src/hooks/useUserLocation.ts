import { useState, useEffect, useRef } from "react";
import type { Coords } from "../types/gis";
import { Geolocation } from "@capacitor/geolocation";

// Default coordinate fallback if no location has ever been fixed
export const DEFAULT_COORDS: Coords = {
  lat: 28.6139,
  lng: 77.209,
};

const STORAGE_KEY = "rakshika_user_last_location";

export function getStoredLocation(): Coords {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to parse stored location:", err);
  }
  return DEFAULT_COORDS;
}

export function saveStoredLocation(coords: Coords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch (err) {
    console.warn("Failed to save location to storage:", err);
  }
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coords>(getStoredLocation());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const watchIdRef = useRef<number | string | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSimulatingRef = useRef(isSimulating);

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  const updateLocation = (coords: Coords) => {
    if (!isSimulatingRef.current) {
      setLocation(coords);
      saveStoredLocation(coords);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    // 1. Request immediate high-accuracy position via Capacitor Native / Browser
    Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    })
      .then((position) => {
        if (!cancelled && position?.coords) {
          updateLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      })
      .catch((err) => {
        console.warn("Capacitor getCurrentPosition failed, falling back to browser watch:", err);
        // Fallback to browser HTML5 Geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!cancelled) {
                updateLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
              }
            },
            (err) => {
              if (!cancelled) setError(err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      });

    // 2. Setup continuous high-accuracy location watch
    const setupWatch = async () => {
      try {
        const id = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          },
          (position, err) => {
            if (err) {
              console.warn("Capacitor watchPosition error:", err);
              return;
            }
            if (!cancelled && position?.coords) {
              updateLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            }
          }
        );
        watchIdRef.current = id;
      } catch (err) {
        console.warn("Setting up Capacitor watch failed, fallback to browser watch:", err);
        if (navigator.geolocation) {
          const browserWatchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (!cancelled) {
                updateLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
              }
            },
            (err) => {
              if (!cancelled) setError(err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
          watchIdRef.current = browserWatchId;
        }
      }
    };

    setupWatch();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        if (typeof watchIdRef.current === "string") {
          Geolocation.clearWatch({ id: watchIdRef.current });
        } else if (typeof watchIdRef.current === "number") {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
      if (simulationTimerRef.current !== null) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  /**
   * Starts a mock trip simulation along a provided route polyline.
   */
  const startTripSimulation = (polyline: [number, number][], onStep?: (coords: Coords) => void) => {
    if (polyline.length < 2) return;

    setIsSimulating(true);
    setLoading(false);

    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
    }

    let currentIndex = 0;
    setLocation({ lat: polyline[0][0], lng: polyline[0][1] });

    simulationTimerRef.current = setInterval(() => {
      currentIndex += 1;
      if (currentIndex >= polyline.length) {
        clearInterval(simulationTimerRef.current!);
        setIsSimulating(false);
        return;
      }

      const nextCoords: Coords = {
        lat: polyline[currentIndex][0],
        lng: polyline[currentIndex][1],
      };

      setLocation(nextCoords);
      if (onStep) onStep(nextCoords);
    }, 1500);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
    }
  };

  return {
    location,
    error,
    loading,
    isSimulating,
    startTripSimulation,
    stopSimulation,
  };
}
