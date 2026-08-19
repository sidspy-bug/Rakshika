import { useState, useEffect, useRef } from "react";
import type { Coords } from "../types/gis";

// Default coordinate: Connaught Place, New Delhi (India Focus)
export const DEFAULT_COORDS: Coords = {
  lat: 28.6139,
  lng: 77.209,
};

export function useUserLocation() {
  const [location, setLocation] = useState<Coords>(DEFAULT_COORDS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSimulatingRef = useRef(isSimulating);
  
  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      if (!isSimulatingRef.current) {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setError(null);
      }
      setLoading(false);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Geolocation watch error, using fallback/default coords:", error.message);
      setError(error.message);
      setLoading(false);
    };

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationTimerRef.current !== null) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []); // Empty dependency array, doesn't re-run on isSimulating change

  /**
   * Starts a mock trip simulation along a provided route polyline.
   * Walks node by node every interval seconds.
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
        // Loop back or stop simulation
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
    }, 1500); // Step every 1.5 seconds
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
