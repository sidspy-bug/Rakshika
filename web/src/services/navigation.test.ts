import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateDistance, isUserDeviated } from "./navigationService";

describe("Navigation Service Math Tests", () => {
  describe("calculateDistance", () => {
    it("should calculate exact geodesic distance between two local coordinates (in meters)", () => {
      // Connaught Place to India Gate (~2.15 km)
      const p1 = { lat: 28.6304, lng: 77.2177 };
      const p2 = { lat: 28.6129, lng: 77.2295 };

      const dist = calculateDistance(p1, p2);
      expect(dist).toBeGreaterThan(2000);
      expect(dist).toBeLessThan(2300);
    });

    it("should return 0 distance for identical points", () => {
      const p = { lat: 28.6139, lng: 77.2090 };
      expect(calculateDistance(p, p)).toBe(0);
    });
  });

  describe("isUserDeviated", () => {
    // Simple segment path from (28.60, 77.20) to (28.62, 77.20)
    const routeGeometry: [number, number][] = [
      [28.60, 77.20],
      [28.61, 77.20],
      [28.62, 77.20]
    ];

    it("should return false if the user is directly on a route segment", () => {
      const userLoc = { lat: 28.605, lng: 77.20 };
      const deviated = isUserDeviated(userLoc, routeGeometry, 50);
      expect(deviated).toBe(false);
    });

    it("should return false if the user is slightly off but within the threshold (e.g. 20 meters)", () => {
      // Off by ~0.0001 deg longitude is roughly 10 meters in Delhi
      const userLoc = { lat: 28.615, lng: 77.2001 };
      const deviated = isUserDeviated(userLoc, routeGeometry, 50);
      expect(deviated).toBe(false);
    });

    it("should return true if the user deviates significantly beyond the threshold (e.g. 150 meters)", () => {
      // Off by 0.002 deg longitude is roughly 200 meters in Delhi
      const userLoc = { lat: 28.615, lng: 77.202 };
      const deviated = isUserDeviated(userLoc, routeGeometry, 50);
      expect(deviated).toBe(true);
    });
  });
});
