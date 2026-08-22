/**
 * Navigation Launcher Service
 *
 * Opens native map applications (Google Maps, Apple Maps) for navigation.
 */

import { Capacitor } from "@capacitor/core";
import type { Coords } from "../types/gis";

export const navigationLauncher = {
  /**
   * Open the native maps application with turn-by-turn navigation
   */
  openNavigation(destination: Coords): void {
    const { lat, lng } = destination;

    if (Capacitor.getPlatform() === "ios") {
      // Apple Maps
      window.open(`maps://?daddr=${lat},${lng}&dirflg=d`, "_system");
    } else if (Capacitor.getPlatform() === "android") {
      // Google Maps Intent
      window.open(`google.navigation:q=${lat},${lng}&mode=w`, "_system");
    } else {
      // Fallback to web Google Maps (opens in new tab)
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, "_blank");
    }
  },

  /**
   * Open native maps to show a specific location without starting navigation
   */
  showLocation(location: Coords, label?: string): void {
    const { lat, lng } = location;
    const query = label ? `${lat},${lng}(${encodeURIComponent(label)})` : `${lat},${lng}`;

    if (Capacitor.getPlatform() === "ios") {
      window.open(`maps://?q=${query}`, "_system");
    } else if (Capacitor.getPlatform() === "android") {
      window.open(`geo:${lat},${lng}?q=${query}`, "_system");
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
    }
  }
};
