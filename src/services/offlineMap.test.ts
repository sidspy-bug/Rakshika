import { describe, it, expect } from "vitest";
import { latLngToTile, getTileUrlsInBBox, OFFLINE_CITIES } from "./offlineMapService";

describe("Offline Map Service Tests", () => {
  describe("latLngToTile", () => {
    it("should calculate correct Mercator tile coordinates for Delhi at zoom 12", () => {
      // Delhi: Lat 28.6139, Lng 77.2090
      const zoom = 12;
      const tile = latLngToTile(28.6139, 77.2090, zoom);
      
      expect(tile.x).toBeGreaterThan(0);
      expect(tile.y).toBeGreaterThan(0);
      expect(tile.x).toBe(2926);
      expect(tile.y).toBe(1707);
    });

    it("should calculate correct Mercator tile coordinates for Mumbai at zoom 15", () => {
      // Mumbai: Lat 18.9750, Lng 72.8258
      const zoom = 15;
      const tile = latLngToTile(18.9750, 72.8258, zoom);
      
      expect(tile.x).toBe(23012);
      expect(tile.y).toBe(14624);
    });
  });

  describe("getTileUrlsInBBox", () => {
    it("should generate a valid non-empty array of tile url strings matching the bounding box", () => {
      const city = OFFLINE_CITIES[0]; // Delhi NCR BBox
      const urls = getTileUrlsInBBox(city.bbox);

      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toMatch(/^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/Canvas\/World_Dark_Gray_Base\/MapServer\/tile\/\d+\/\d+\/\d+$/);
    });

    it("should contain tiles in the range of zoom levels 12 to 15", () => {
      const city = OFFLINE_CITIES[1]; // Mumbai
      const urls = getTileUrlsInBBox(city.bbox);
      
      // Verify that zoom levels are in the URL path
      const zoomMatches = urls.map(url => {
        const match = url.match(/\/tile\/(\d+)\//);
        return match ? parseInt(match[1]) : 0;
      });

      expect(zoomMatches.every(z => z >= 12 && z <= 15)).toBe(true);
      expect(zoomMatches).toContain(12);
      expect(zoomMatches).toContain(15);
    });
  });
});
