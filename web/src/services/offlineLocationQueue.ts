import type { QueuedLocation } from "../types/offline";
import { api } from "./api";

const STORAGE_KEY = "rakshika-offline-locations";

/**
 * Retrieves the current queue of offline coordinates
 */
export function getQueuedLocations(): QueuedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read location queue:", err);
    return [];
  }
}

/**
 * Appends a new coordinate update to the offline queue
 */
export function enqueueLocation(loc: QueuedLocation): void {
  try {
    const queue = getQueuedLocations();
    queue.push(loc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to enqueue location update:", err);
  }
}

/**
 * Clears the queue entirely
 */
export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Iterates through the queued breadcrumbs, pushing them to the backend API.
 * Cleans successfully uploaded coordinates from the queue.
 */
export async function syncOfflineLocations(): Promise<void> {
  const queue = getQueuedLocations();
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} queued offline location(s)...`);
  const unsynced: QueuedLocation[] = [];

  for (const loc of queue) {
    try {
      await api.post("/location/update", {
        emergencyId: loc.emergencyId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy || null,
        speed: loc.speed || null,
        heading: loc.heading || null,
        batteryLevel: loc.batteryLevel || null,
      });
    } catch (err) {
      console.warn("Failed to upload offline breadcrumb:", err);
      // Keep unsynced item for next retry
      unsynced.push(loc);
    }
  }

  if (unsynced.length === 0) {
    clearQueue();
    console.log("All offline locations synced successfully.");
  } else {
    // Save only unsynced locations
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unsynced));
    console.log(`${unsynced.length} location updates remain in queue.`);
  }
}
