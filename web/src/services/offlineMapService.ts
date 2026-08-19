import type { BBox, OfflineCity } from "../types/offline";

// Bbox limits for MVP (smaller areas to keep download sizes around 2-3MB per city for zoom levels 12-15)
export const OFFLINE_CITIES: OfflineCity[] = [
  {
    id: "delhi-central",
    name: "Delhi NCR (Central & South)",
    bbox: {
      minLat: 28.54,
      maxLat: 28.65,
      minLng: 77.15,
      maxLng: 77.27,
    },
    sizeEstimate: "2.4 MB",
    totalTiles: 185,
  },
  {
    id: "mumbai-south",
    name: "Mumbai (South & Bandra)",
    bbox: {
      minLat: 18.90,
      maxLat: 19.06,
      minLng: 72.80,
      maxLng: 72.88,
    },
    sizeEstimate: "1.9 MB",
    totalTiles: 140,
  },
  {
    id: "bengaluru-central",
    name: "Bengaluru (MG Road & Koramangala)",
    bbox: {
      minLat: 12.91,
      maxLat: 12.99,
      minLng: 77.56,
      maxLng: 77.65,
    },
    sizeEstimate: "2.1 MB",
    totalTiles: 160,
  },
];

// Constants for zoom levels cached for offline use
const MIN_ZOOM = 12;
const MAX_ZOOM = 15;

// Base url for OSM / CartoDB tiles
const TILE_URL_PATTERN = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const SUBDOMAINS = ["a", "b", "c", "d"];

/**
 * Calculates tile X and Y indices for a given lat/lng and zoom level
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * Generates all tile urls required to cover a specific bounding box and zoom range
 */
export function getTileUrlsInBBox(bbox: BBox): string[] {
  const urls: string[] = [];

  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    // Top-left and bottom-right tile coordinates
    const startTile = latLngToTile(bbox.maxLat, bbox.minLng, z); // maxLat is top
    const endTile = latLngToTile(bbox.minLat, bbox.maxLng, z);   // minLat is bottom

    const minX = Math.min(startTile.x, endTile.x);
    const maxX = Math.max(startTile.x, endTile.x);
    const minY = Math.min(startTile.y, endTile.y);
    const maxY = Math.max(startTile.y, endTile.y);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Choose subdomain cyclically to simulate standard browser loading
        const subdomain = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
        const url = TILE_URL_PATTERN
          .replace("{s}", subdomain)
          .replace("{z}", z.toString())
          .replace("{x}", x.toString())
          .replace("{y}", y.toString());
        urls.push(url);
      }
    }
  }

  return urls;
}

export function getCustomOfflineRegions(): OfflineCity[] {
  const raw = localStorage.getItem("rakshika-custom-offline-regions");
  return raw ? JSON.parse(raw) : [];
}

export function saveCustomOfflineRegions(regions: OfflineCity[]) {
  localStorage.setItem("rakshika-custom-offline-regions", JSON.stringify(regions));
}

export function getAllOfflineCities(): OfflineCity[] {
  return [...OFFLINE_CITIES, ...getCustomOfflineRegions()];
}

export async function downloadCustomArea(
  center: { lat: number; lng: number },
  areaName: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<string> {
  const customId = `custom-${Date.now()}`;
  
  // Calculate approx 40-50km box (±0.36 degrees)
  const offset = 0.36;
  const customCity: OfflineCity = {
    id: customId,
    name: areaName || `Offline Area (${center.lat.toFixed(2)}, ${center.lng.toFixed(2)})`,
    bbox: {
      minLat: center.lat - offset,
      maxLat: center.lat + offset,
      minLng: center.lng - offset,
      maxLng: center.lng + offset,
    },
    sizeEstimate: "~15 MB",
    totalTiles: 1360,
    isCustom: true,
  };

  const customRegions = getCustomOfflineRegions();
  customRegions.push(customCity);
  saveCustomOfflineRegions(customRegions);

  await downloadCity(customId, onProgress);
  return customId;
}

/**
 * Downloads all tiles for a city and saves them into the browser's Cache Storage
 */
export async function downloadCity(
  cityId: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  const city = getAllOfflineCities().find((c) => c.id === cityId);
  if (!city) throw new Error("City not found");

  const urls = getTileUrlsInBBox(city.bbox);
  const cacheName = `rakshika-map-${cityId}`;
  const cache = await caches.open(cacheName);

  let downloadedCount = 0;
  const batchSize = 6; // Batch requests to prevent network jamming

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (url) => {
        try {
          // Fetch map tile with a timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(url, {
            signal: controller.signal,
            headers: { "Cache-Control": "max-age=31536000" }, // Cache for 1 year
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn(`Failed to cache tile URL: ${url}`, err);
        } finally {
          downloadedCount++;
          onProgress(downloadedCount, urls.length);
        }
      })
    );
  }

  // Set download meta in localStorage
  localStorage.setItem(`city-downloaded-${cityId}`, "true");
}

/**
 * Purges the Cache Storage for a specific city
 */
export async function deleteCity(cityId: string): Promise<void> {
  const cacheName = `rakshika-map-${cityId}`;
  await caches.delete(cacheName);
  localStorage.removeItem(`city-downloaded-${cityId}`);

  // If it's a custom city, remove from custom list
  let customRegions = getCustomOfflineRegions();
  if (customRegions.some((r) => r.id === cityId)) {
    customRegions = customRegions.filter((r) => r.id !== cityId);
    saveCustomOfflineRegions(customRegions);
  }
}

/**
 * Checks if a city has been fully downloaded
 */
export function isCityDownloaded(cityId: string): boolean {
  return localStorage.getItem(`city-downloaded-${cityId}`) === "true";
}

/**
 * Estimates storage usage across all downloaded maps in bytes
 */
export async function getOfflineStorageEstimate(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}

/**
 * Intercepts an offline tile request and fetches the binary blob from any active offline cache database
 */
export async function getCachedTileUrl(originalUrl: string): Promise<string | null> {
  // Normalize subdomain differences in cached keys
  const cleanUrl = originalUrl.replace(/\/\/([a-d])\./, "//{s}.");
  
  const cacheKeys = getAllOfflineCities().map((c) => `rakshika-map-${c.id}`);
  
  for (const cacheName of cacheKeys) {
    try {
      const cache = await caches.open(cacheName);
      // Scan cached keys
      const requests = await cache.keys();
      const match = requests.find((req) => {
        const normalizedReqUrl = req.url.replace(/\/\/([a-d])\./, "//{s}.");
        return normalizedReqUrl === cleanUrl;
      });

      if (match) {
        const cachedResponse = await cache.match(match);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          return URL.createObjectURL(blob);
        }
      }
    } catch (err) {
      console.warn(`Error searching cache ${cacheName}:`, err);
    }
  }

  return null;
}
