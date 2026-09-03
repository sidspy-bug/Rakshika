/**
 * SOS Service
 *
 * Provides a local-first SOS state machine and persistence layer.
 *
 * Core architectural principle:
 * "Firebase should synchronize the SOS, not determine whether the SOS exists."
 *
 * The local SOS state is established and persisted synchronously BEFORE any
 * network/Firebase operations are attempted. If Firebase fails, times out,
 * or is completely unreachable, the SOS remains active locally.
 */

import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { sosAuditLogger } from "./sosAuditLogger";
import { cloudAuthService } from "./cloudAuthService";

export type SosStatus = "ACTIVE" | "CANCELLED" | "RESOLVED";
export type SosSyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface SosLocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface SilentCheckInRecord {
  promptedAt: string;
  respondedAt?: string;
  responded: boolean;
  status: "SAFE" | "UNANSWERED" | "PENDING";
}

export interface SosIncident {
  /** Unique client-generated incident identifier (idempotent for sync) */
  id: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  status: SosStatus;
  syncStatus: SosSyncStatus;
  activatedAt: string;
  resolvedAt?: string;
  lastSyncAttempt?: string;
  syncError?: string;
  locationHistory: SosLocationPoint[];
  evidenceUrl?: string;
  evidenceChunks?: Array<{
    index: number;
    sha256: string;
    sizeBytes: number;
    capturedAt: string;
    storageUrl?: string;
  }>;
  silentCheckIns?: SilentCheckInRecord[];
  isGhostMode?: boolean;
  lastKnownLocation?: SosLocationPoint;
  gpsSource?: "LIVE" | "CACHED" | "UNAVAILABLE";
}

/** Storage keys */
export const ACTIVE_SOS_KEY = "rakshika_active_sos";
export const SOS_HISTORY_KEY = "rakshika_sos_history";
export const LAST_KNOWN_LOCATION_KEY = "rakshika_last_known_location";

/** In-memory lock to prevent concurrent duplicate activations */
let isCreatingSos = false;
let isSyncing = false;

/**
 * Generates a unique, client-side incident ID.
 * Example: `sos_1724912345678_k9x2ab`
 */
export function generateIncidentId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `sos_${timestamp}_${randomSuffix}`;
}

/**
 * Retrieves current active SOS incident from local storage, if one exists and has status "ACTIVE".
 * Returns null if no active incident exists or if parsing fails.
 */
export function getActiveSos(): SosIncident | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SOS_KEY);
    if (!raw) return null;
    const incident = JSON.parse(raw) as SosIncident;
    if (incident && incident.status === "ACTIVE" && incident.id) {
      return incident;
    }
    return null;
  } catch (err) {
    console.error("[SosService] Failed to read active SOS from localStorage:", err);
    return null;
  }
}

/**
 * Creates and persists a new active SOS incident locally.
 * If an active SOS already exists, returns the existing active incident
 * without creating a duplicate record (idempotent activation).
 */
export function createOrGetActiveSos(userData?: {
  userId?: string;
  userEmail?: string;
  userPhone?: string;
}): SosIncident {
  // 1. Check for existing active SOS
  const existing = getActiveSos();
  if (existing) {
    console.log(`[SosService] Existing active SOS found (${existing.id}). Reusing.`);
    return existing;
  }

  // Prevent synchronous race condition if multiple triggers fire simultaneously
  if (isCreatingSos) {
    const fallback = getActiveSos();
    if (fallback) return fallback;
  }
  isCreatingSos = true;

  try {
    // 2. Resolve user identity from cloudAuthService, params, or profile
    let userId = userData?.userId;
    let userEmail = userData?.userEmail;
    let userPhone = userData?.userPhone;

    const cloudUser = cloudAuthService.getCloudUser();
    if (!cloudUser.isDemoMode) {
      userId = userId || cloudUser.uid;
      userEmail = userEmail || cloudUser.email;
    }

    if (!userId || !userEmail || !userPhone) {
      try {
        const profileRaw = localStorage.getItem("user_profile");
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          userId = userId || (cloudUser.isDemoMode ? "local-user" : profile.uid || "local-user");
          userEmail = userEmail || (cloudUser.isDemoMode ? "demo@rakshika.local" : profile.email || "user@rakshika.app");
          userPhone = userPhone || profile.phone || "";
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    const incidentId = generateIncidentId();
    const incident: SosIncident = {
      id: incidentId,
      userId: userId || (cloudUser.isDemoMode ? "local-user" : "authenticated-user"),
      userEmail: userEmail || (cloudUser.isDemoMode ? "demo@rakshika.local" : "user@rakshika.app"),
      userPhone: userPhone || "",
      status: "ACTIVE",
      syncStatus: cloudUser.isDemoMode ? "SYNCED" : "PENDING",
      activatedAt: new Date().toISOString(),
      locationHistory: [],
    };

    // 3. Persist synchronously to local storage BEFORE any async operation
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(incident));
    sosAuditLogger.setActiveIncident(incident.id);
    sosAuditLogger.log(
      "SOS_LIFECYCLE",
      "CRITICAL",
      `Active SOS locally established with ID: ${incident.id}`,
      { userId: incident.userId, phone: incident.userPhone, isOnline: navigator.onLine, isDemoMode: cloudUser.isDemoMode }
    );
    console.log(`[SosService] Active SOS established locally with ID: ${incident.id} (DemoMode: ${cloudUser.isDemoMode})`);

    return incident;
  } finally {
    isCreatingSos = false;
  }
}

/**
 * Appends a new GPS coordinate breadcrumb to the active SOS incident in local storage.
 */
export function appendSosLocation(coords: { lat: number; lng: number }): SosIncident | null {
  try {
    const active = getActiveSos();
    if (!active) return null;

    const point: SosLocationPoint = {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: new Date().toISOString(),
    };

    active.locationHistory.push(point);
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(active));
    sosAuditLogger.log(
      "GPS_TELEMETRY",
      "INFO",
      `GPS Fix Recorded: (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}) | Total Points: ${active.locationHistory.length}`
    );
    return active;
  } catch (err) {
    console.error("[SosService] Failed to append location to active SOS:", err);
    return null;
  }
}

/**
 * Updates the recorded evidence URL in the active SOS incident.
 */
export function setSosEvidenceUrl(evidenceUrl: string): SosIncident | null {
  try {
    const active = getActiveSos();
    if (!active) return null;

    active.evidenceUrl = evidenceUrl;
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(active));
    return active;
  } catch (err) {
    console.error("[SosService] Failed to set evidence URL:", err);
    return null;
  }
}

/**
 * Synchronizes the local SOS incident with Firebase Firestore.
 *
 * CRITICAL RELIABILITY PROPERTY:
 * If this synchronization fails, times out, or throws an error, the local
 * SOS state remains "ACTIVE" and `syncStatus` is marked as "FAILED" or "PENDING".
 * An error is never thrown to the caller to avoid disrupting the emergency UX.
 */
export async function syncSosToFirebase(incidentId?: string): Promise<{
  success: boolean;
  incident: SosIncident | null;
}> {
  const active = getActiveSos();
  const targetIncident = incidentId && active?.id !== incidentId
    ? null // We primarily sync active SOS
    : active;

  if (!targetIncident) {
    return { success: false, incident: null };
  }

  // Prevent multiple concurrent sync operations
  if (isSyncing) {
    return { success: false, incident: targetIncident };
  }
  isSyncing = true;

  try {
    targetIncident.lastSyncAttempt = new Date().toISOString();

    // Gating: If user is in Demo Mode or unauthenticated, bypass cloud completely!
    if (!cloudAuthService.isCloudSyncEnabled()) {
      targetIncident.syncStatus = "SYNCED";
      targetIncident.syncError = undefined;
      localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(targetIncident));
      sosAuditLogger.log(
        "FIREBASE_CLOUD",
        "INFO",
        `On-Device Vault Mode: Cloud sync safely bypassed (Demo Mode). Incident ${targetIncident.id} secured in local disk vault.`
      );
      console.log(`[SosService] Demo Mode: Cloud sync safely bypassed for SOS ${targetIncident.id}.`);
      return { success: true, incident: targetIncident };
    }

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      targetIncident.syncStatus = "FAILED";
      targetIncident.syncError = "Device is currently offline";
      localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(targetIncident));
      return { success: false, incident: targetIncident };
    }

    // Attempt real Firebase sync with 5-second timeout safeguard
    const syncPromise = setDoc(
      doc(db, "sos_records", targetIncident.id),
      {
        id: targetIncident.id,
        userId: targetIncident.userId,
        userEmail: targetIncident.userEmail,
        userPhone: targetIncident.userPhone,
        status: targetIncident.status,
        activatedAt: targetIncident.activatedAt,
        resolvedAt: targetIncident.resolvedAt || null,
        locationHistory: targetIncident.locationHistory,
        evidenceUrl: targetIncident.evidenceUrl || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firebase sync request timed out (5000ms)")), 5000)
    );

    await Promise.race([syncPromise, timeoutPromise]);

    targetIncident.syncStatus = "SYNCED";
    targetIncident.syncError = undefined;
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(targetIncident));
    sosAuditLogger.log("FIREBASE_CLOUD", "SUCCESS", `SOS incident ${targetIncident.id} synced to Firestore database.`);
    console.log(`[SosService] SOS ${targetIncident.id} successfully synced to Firebase.`);

    return { success: true, incident: targetIncident };
  } catch (err: any) {
    console.warn(`[SosService] Firebase sync failed for SOS ${targetIncident.id}:`, err?.message || err);
    targetIncident.syncStatus = "FAILED";
    targetIncident.syncError = err?.message || "Unknown synchronization error";
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(targetIncident));
    sosAuditLogger.log("FIREBASE_CLOUD", "WARN", `Firebase sync offline/deferred: ${targetIncident.syncError}`);
    // Notice: SOS status is still "ACTIVE"
    return { success: false, incident: targetIncident };
  } finally {
    isSyncing = false;
  }
}

/**
 * Stops or cancels the active SOS incident.
 * Updates local status to "CANCELLED" or "RESOLVED", archives the incident to history,
 * clears the active key, and asynchronously notifies Firebase.
 */
export async function stopSos(
  reason: "CANCELLED" | "RESOLVED" = "CANCELLED"
): Promise<SosIncident | null> {
  const active = getActiveSos();
  if (!active) {
    localStorage.removeItem(ACTIVE_SOS_KEY);
    return null;
  }

  active.status = reason;
  active.resolvedAt = new Date().toISOString();

  sosAuditLogger.log("SOS_LIFECYCLE", "INFO", `Active SOS ${active.id} stopped with status: ${reason}`);

  // 1. Archive to history list
  try {
    const historyRaw = localStorage.getItem(SOS_HISTORY_KEY);
    const history: SosIncident[] = historyRaw ? JSON.parse(historyRaw) : [];
    history.unshift(active);
    // Keep max 20 history items
    localStorage.setItem(SOS_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch (err) {
    console.warn("[SosService] Failed to archive SOS to history:", err);
  }

  // 2. Remove from active SOS storage
  localStorage.removeItem(ACTIVE_SOS_KEY);
  console.log(`[SosService] Active SOS ${active.id} stopped with status: ${reason}`);

  // 3. Asynchronously attempt to sync the resolution to Firebase ONLY if logged in and online
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!isOffline && cloudAuthService.isCloudSyncEnabled()) {
    try {
      await setDoc(
        doc(db, "sos_records", active.id),
        {
          status: reason,
          resolvedAt: active.resolvedAt,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`[SosService] Resolution for SOS ${active.id} synced to Firebase.`);
      sosAuditLogger.log("FIREBASE_CLOUD", "SUCCESS", `SOS resolution status (${reason}) synced to Firestore.`);
    } catch (err) {
      console.warn("[SosService] Failed to sync SOS cancellation to Firebase:", err);
    }
  }

  return active;
}

/**
 * Retrieves past SOS incidents history from local storage.
 */
export function getSosHistory(): SosIncident[] {
  try {
    const raw = localStorage.getItem(SOS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Deletes a specific SOS incident from local history
 */
export function deleteSosIncident(incidentId: string): void {
  try {
    const history = getSosHistory().filter((inc) => inc.id !== incidentId);
    localStorage.setItem(SOS_HISTORY_KEY, JSON.stringify(history));
    localStorage.removeItem(`rakshika_evidence_manifest_${incidentId}`);
  } catch (err) {
    console.warn("[SosService] Failed to delete incident:", err);
  }
}

/**
 * Clears all SOS incident history and cached logs
 */
export function clearAllSosHistory(): void {
  try {
    localStorage.removeItem(SOS_HISTORY_KEY);
    localStorage.removeItem(ACTIVE_SOS_KEY);
    localStorage.removeItem("rakshika_sos_blackbox_logs");
  } catch (err) {
    console.warn("[SosService] Failed to clear SOS history:", err);
  }
}

/**
 * Records a silent check-in event in the active SOS incident.
 */
export function recordSilentCheckIn(responded: boolean): SosIncident | null {
  try {
    const active = getActiveSos();
    if (!active) return null;

    if (!active.silentCheckIns) active.silentCheckIns = [];
    const now = new Date().toISOString();

    active.silentCheckIns.push({
      promptedAt: now,
      respondedAt: responded ? now : undefined,
      responded,
      status: responded ? "SAFE" : "UNANSWERED",
    });

    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(active));
    return active;
  } catch (err) {
    console.error("[SosService] Failed to record silent check-in:", err);
    return null;
  }
}

/**
 * Caches the user's latest GPS position for offline/GPS-failure fallback.
 */
export function cacheUserLocation(coords: { lat: number; lng: number }): void {
  try {
    const point: SosLocationPoint = {
      lat: coords.lat,
      lng: coords.lng,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(point));
  } catch {}
}

/**
 * Retrieves the cached last-known location as a fallback when live GPS fails.
 */
export function getCachedLastLocation(): SosLocationPoint | null {
  try {
    const raw = localStorage.getItem(LAST_KNOWN_LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Toggles or sets Ghost Mode on the active SOS incident.
 */
export function setGhostMode(isGhost: boolean): SosIncident | null {
  try {
    const active = getActiveSos();
    if (!active) return null;

    active.isGhostMode = isGhost;
    localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(active));
    return active;
  } catch {
    return null;
  }
}

/**
 * Utility for testing: clears all active and historical SOS state.
 */
export function clearAllSosDataForTesting(): void {
  localStorage.removeItem(ACTIVE_SOS_KEY);
  localStorage.removeItem(SOS_HISTORY_KEY);
  localStorage.removeItem(LAST_KNOWN_LOCATION_KEY);
  isCreatingSos = false;
  isSyncing = false;
}

