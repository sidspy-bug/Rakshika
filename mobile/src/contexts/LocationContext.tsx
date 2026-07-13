import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import locationService from '../services/locationService';
import { useAuth } from './AuthContext';

interface LocationContextType {
  location: Location.LocationObject | null;
  errorMsg: string | null;
  isTracking: boolean;
  startTracking: (emergencyId?: string) => Promise<void>;
  stopTracking: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watcher, setWatcher] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          // Provide mock location fallback so demo UI still loads
          setMockLocation();
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (e) {
        console.warn("Failed to get location, falling back to mock", e);
        setMockLocation();
      }
    })();

    return () => {
      if (watcher) watcher.remove();
    };
  }, []);

  const setMockLocation = () => {
    setLocation({
      coords: {
        latitude: 28.6139,
        longitude: 77.2090,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: 0,
        speed: 0
      },
      timestamp: Date.now()
    });
  };

  const startTracking = async (emergencyId?: string) => {
    if (isTracking) return;

    if (Platform.OS !== 'web') {
      try {
        let { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          let { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
          if (foreStatus !== 'granted') {
            setErrorMsg('Foreground location permission denied');
            return;
          }
        }
      } catch (e) {
        console.warn("Background permission not supported", e);
      }
    }

    setIsTracking(true);
    const trackingWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (newLocation) => {
        setLocation(newLocation);
        if (isAuthenticated) {
          try {
            await locationService.sendLocationUpdate({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy || undefined,
              speed: newLocation.coords.speed || undefined,
              heading: newLocation.coords.heading || undefined,
              emergencyId,
            });
          } catch (e) {
            console.warn("Failed to report location update", e);
          }
        }
      }
    );

    setWatcher(trackingWatcher);
  };

  const stopTracking = () => {
    if (watcher) {
      watcher.remove();
      setWatcher(null);
    }
    setIsTracking(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        errorMsg,
        isTracking,
        startTracking,
        stopTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
