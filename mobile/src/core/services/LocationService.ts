import * as Location from "expo-location";
import { LocationData, PermissionState } from "../../types/map";

export class LocationService {
  /**
   * Verifies if system location services (GPS) are enabled on the device
   */
  static async isGpsEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (err) {
      console.error("GPS availability check failed:", err);
      return false;
    }
  }

  /**
   * Requests foreground location permissions from the user
   */
  static async requestPermissions(): Promise<PermissionState> {
    try {
      // 1. Check GPS enabled
      const gpsEnabled = await this.isGpsEnabled();
      if (!gpsEnabled) {
        return "disabled";
      }

      // 2. Request Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === Location.PermissionStatus.GRANTED) {
        return "granted";
      } else if (status === Location.PermissionStatus.DENIED) {
        return "denied";
      }
      return "undetermined";
    } catch (err) {
      console.error("Permission request failed:", err);
      return "denied";
    }
  }

  /**
   * Fetches single current location fix
   */
  static async getCurrentLocation(): Promise<LocationData> {
    const gpsEnabled = await this.isGpsEnabled();
    if (!gpsEnabled) {
      throw new Error("GPS_DISABLED");
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error("PERMISSION_DENIED");
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  }

  /**
   * Subscribes to live position changes
   */
  static async watchLocation(
    onLocation: (location: LocationData) => void,
    onError: (error: Error) => void
  ): Promise<Location.LocationSubscription> {
    const gpsEnabled = await this.isGpsEnabled();
    if (!gpsEnabled) {
      throw new Error("GPS_DISABLED");
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      throw new Error("PERMISSION_DENIED");
    }

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5s
        distanceInterval: 5, // Or every 5 meters
      },
      (location) => {
        onLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        });
      }
    );
  }
}
export default LocationService;
