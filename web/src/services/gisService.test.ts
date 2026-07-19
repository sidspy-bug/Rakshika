/**
 * Automated test suite blueprint for gisService.ts
 * Designed for Vitest or Jest.
 * To run: npm install -D vitest, add test script to package.json, and run "npm run test"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { searchAddress, getRoute, getNearbyHelpCenters } from "./gisService";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GIS Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchAddress", () => {
    it("should fetch address search suggestions from Nominatim and format results", async () => {
      const mockData = [
        { display_name: "Delhi Hospital, India", lat: "28.6139", lon: "77.2090" },
        { display_name: "Delhi Police HQ, India", lat: "28.6239", lon: "77.2190" }
      ];
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const results = await searchAddress("Delhi");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("nominatim.openstreetmap.org/search"),
        expect.objectContaining({
          params: expect.objectContaining({ q: "Delhi" })
        })
      );
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        name: "Delhi Hospital, India",
        lat: 28.6139,
        lng: 77.2090
      });
    });

    it("should return empty array when geocoding api fails", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Network Error"));
      const results = await searchAddress("Delhi");
      expect(results).toEqual([]);
    });
  });

  describe("getRoute", () => {
    it("should calculate and map route geometry from OSRM", async () => {
      const start = { lat: 28.61, lng: 77.20 };
      const end = { lat: 28.62, lng: 77.21 };
      const mockRouteData = {
        routes: [
          {
            geometry: {
              coordinates: [
                [77.20, 28.61],
                [77.21, 28.62]
              ]
            },
            distance: 1500,
            duration: 900
          }
        ]
      };
      mockedAxios.get.mockResolvedValueOnce({ data: mockRouteData });

      const route = await getRoute(start, end);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("router.project-osrm.org/route/v1/foot/77.2,28.61;77.21,28.62"),
        expect.anything()
      );
      expect(route.distance).toBe(1500);
      expect(route.duration).toBe(900);
      // Flip coordinates for Leaflet format: [lat, lng]
      expect(route.geometry).toEqual([
        [28.61, 77.20],
        [28.62, 77.21]
      ]);
    });

    it("should fallback to straight-line route if OSRM fails", async () => {
      const start = { lat: 28.61, lng: 77.20 };
      const end = { lat: 28.62, lng: 77.21 };
      mockedAxios.get.mockRejectedValueOnce(new Error("OSRM Down"));

      const route = await getRoute(start, end);
      
      expect(route.geometry).toHaveLength(2);
      expect(route.geometry[0]).toEqual([start.lat, start.lng]);
      expect(route.geometry[1]).toEqual([end.lat, end.lng]);
      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
    });
  });

  describe("getNearbyHelpCenters", () => {
    it("should extract coordinates and tags from Overpass API elements", async () => {
      const center = { lat: 28.6139, lng: 77.2090 };
      const mockOverpassData = {
        elements: [
          {
            type: "node",
            id: 101,
            lat: 28.6145,
            lon: 77.2105,
            tags: { amenity: "police", name: "Police Station Section A" }
          },
          {
            type: "way",
            id: 202,
            center: { lat: 28.6120, lon: 77.2050 },
            tags: { amenity: "hospital", name: "Safe Hospital Complex" }
          }
        ]
      };
      mockedAxios.post.mockResolvedValueOnce({ data: mockOverpassData });

      const helpCenters = await getNearbyHelpCenters(center);

      expect(helpCenters).toHaveLength(2);
      expect(helpCenters[0]).toEqual(
        expect.objectContaining({
          id: "node-101",
          name: "Police Station Section A",
          type: "police",
          lat: 28.6145,
          lng: 77.2105
        })
      );
      expect(helpCenters[1]).toEqual(
        expect.objectContaining({
          id: "way-202",
          name: "Safe Hospital Complex",
          type: "hospital",
          lat: 28.6120,
          lng: 77.2050
        })
      );
    });

    it("should fallback to mock offline help centers if Overpass API times out", async () => {
      const center = { lat: 28.6139, lng: 77.2090 };
      mockedAxios.post.mockRejectedValueOnce(new Error("Timeout"));

      const helpCenters = await getNearbyHelpCenters(center);
      expect(helpCenters.length).toBeGreaterThan(0);
      expect(helpCenters[0].id).toContain("mock-");
    });
  });
});
