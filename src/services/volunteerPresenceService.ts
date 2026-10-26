/**
 * Real-Time Volunteer Presence & Cross-Device Emergency Mesh Service
 *
 * Implements real-time peer volunteer discovery and cloud dispatch using Firebase Firestore.
 * Capabilities:
 * 1. Automatically registers and publishes device presence in Firestore (`/volunteers/{deviceId}`).
 * 2. Real-time live listener (`onSnapshot`) for other Rakshika devices within range.
 * 3. Real-time SOS alert listener: When ANY device triggers SOS, all other peer devices
 *    receive instant alerts with live distance and turn-by-turn driving route navigation!
 */

import { db, auth } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { cloudAuthService } from "./cloudAuthService";
import { calculateDistance } from "../utils/geo";
import { getActiveSos } from "./sosService";

export interface VolunteerPeer {
  id: string;
  name: string;
  role: string;
  phone?: string;
  coords: { lat: number; lng: number };
  lastActive: string;
  isAvailable: boolean;
  distanceMeters?: number;
}

export interface ActiveSosAlert {
  id: string; // incidentId
  victimId: string;
  victimName: string;
  victimPhone?: string;
  coords: { lat: number; lng: number };
  activatedAt: string;
  updatedAt: string;
  status: "ACTIVE" | "RESOLVED" | "CANCELLED";
  distanceMeters?: number;
  evidenceUrl?: string;
}

const DEVICE_ID_KEY = "rakshika_device_unique_id";
const PRESENCE_HEARTBEAT_MS = 20000; // 20s heartbeat

class VolunteerPresenceService {
  private deviceId: string;
  private currentCoords: { lat: number; lng: number } | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * Returns or generates a persistent device UUID
   */
  getOrCreateDeviceId(): string {
    if (typeof localStorage === "undefined") {
      return "dev_" + Math.random().toString(36).substring(2, 9);
    }
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = "device_" + Math.random().toString(36).substring(2, 8) + "_" + Date.now().toString().slice(-4);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  /**
   * Resolves a human-friendly device or user name
   */
  getDeviceDisplayName(): string {
    try {
      const profileRaw = localStorage.getItem("user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.fullName || p.name) return p.fullName || p.name;
      }
    } catch {}
    const shortId = this.deviceId.slice(-4).toUpperCase();
    return `Rakshika Volunteer #${shortId}`;
  }

  /**
   * Initializes presence publisher and background heartbeat
   */
  async initPresence(coords?: { lat: number; lng: number }): Promise<void> {
    if (coords) this.currentCoords = coords;
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Ensure Firebase authentication is established
    await cloudAuthService.ensureAuthenticated().catch(() => {});

    // Initial presence push
    if (this.currentCoords) {
      await this.publishPresence(this.currentCoords).catch(() => {});
    }

    // Set up continuous 20s heartbeat
    this.heartbeatTimer = setInterval(() => {
      if (this.currentCoords && typeof navigator !== "undefined" && navigator.onLine) {
        this.publishPresence(this.currentCoords).catch(() => {});
      }
    }, PRESENCE_HEARTBEAT_MS);
  }

  /**
   * Updates location and immediately syncs to Firestore
   */
  async updateLocation(coords: { lat: number; lng: number }): Promise<void> {
    this.currentCoords = coords;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      await this.publishPresence(coords).catch(() => {});
    }
  }

  /**
   * Writes presence record to Firestore /volunteers collection
   */
  async publishPresence(coords: { lat: number; lng: number }): Promise<void> {
    try {
      const now = new Date().toISOString();
      const volunteerDoc = doc(db, "volunteers", this.deviceId);

      await setDoc(
        volunteerDoc,
        {
          id: this.deviceId,
          name: this.getDeviceDisplayName(),
          role: "Community Responder",
          coords: {
            lat: coords.lat,
            lng: coords.lng,
          },
          lastActive: now,
          isAvailable: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("[VolunteerPresence] Failed to publish presence:", err);
    }
  }

  /**
   * Sets presence to offline upon exit
   */
  async setOffline(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    try {
      const volunteerDoc = doc(db, "volunteers", this.deviceId);
      await deleteDoc(volunteerDoc);
    } catch {}
  }

  /**
   * Subscribes to real-time live peer volunteers from Firestore
   */
  subscribeVolunteers(
    myCoords: { lat: number; lng: number },
    onUpdate: (volunteers: VolunteerPeer[]) => void
  ): () => void {
    try {
      const colRef = collection(db, "volunteers");

      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const now = Date.now();
          const list: VolunteerPeer[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Exclude current device
            if (data.id === this.deviceId) return;

            // Exclude stale devices (inactive for > 10 minutes)
            const lastActiveTime = data.lastActive ? new Date(data.lastActive).getTime() : 0;
            if (now - lastActiveTime > 10 * 60 * 1000) return;

            if (data.coords?.lat && data.coords?.lng) {
              const dist = calculateDistance(myCoords, {
                lat: data.coords.lat,
                lng: data.coords.lng,
              });

              list.push({
                id: data.id || docSnap.id,
                name: data.name || "Volunteer Responder",
                role: data.role || "Community Guard",
                phone: data.phone,
                coords: {
                  lat: data.coords.lat,
                  lng: data.coords.lng,
                },
                lastActive: data.lastActive || new Date().toISOString(),
                isAvailable: data.isAvailable !== false,
                distanceMeters: Math.round(dist),
              });
            }
          });

          // Sort by closest distance first
          list.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
          onUpdate(list);
        },
        (error) => {
          console.warn("[VolunteerPresence] Error listening to volunteers:", error);
          onUpdate([]);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn("[VolunteerPresence] Subscription setup failed:", err);
      return () => {};
    }
  }

  /**
   * Subscribes to real-time active SOS emergencies from Firestore
   */
  subscribeActiveSosAlerts(
    myCoords: { lat: number; lng: number },
    onAlerts: (alerts: ActiveSosAlert[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, "sos_records"),
        where("status", "==", "ACTIVE")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const activeSos = getActiveSos();
          const alerts: ActiveSosAlert[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Don't alert if the active SOS was created on this same device!
            if (activeSos && activeSos.id === docSnap.id) return;
            if (data.userId && data.userId === this.deviceId) return;

            let coords = data.coords || data.currentLocation;
            if (!coords && data.locationHistory && data.locationHistory.length > 0) {
              const lastLoc = data.locationHistory[data.locationHistory.length - 1];
              coords = { lat: lastLoc.lat, lng: lastLoc.lng };
            }

            if (coords?.lat && coords?.lng) {
              const dist = calculateDistance(myCoords, {
                lat: coords.lat,
                lng: coords.lng,
              });

              alerts.push({
                id: docSnap.id,
                victimId: data.userId || "unknown",
                victimName: data.userEmail?.split("@")[0] || data.userName || "Rakshika User in Distress",
                victimPhone: data.userPhone,
                coords: {
                  lat: coords.lat,
                  lng: coords.lng,
                },
                activatedAt: data.activatedAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
                status: "ACTIVE",
                distanceMeters: Math.round(dist),
                evidenceUrl: data.evidenceUrl,
              });
            }
          });

          // Sort by nearest victim first
          alerts.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
          onAlerts(alerts);
        },
        (error) => {
          console.warn("[VolunteerPresence] Error listening to SOS alerts:", error);
          onAlerts([]);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn("[VolunteerPresence] SOS Subscription setup failed:", err);
      return () => {};
    }
  }
}

export const volunteerPresenceService = new VolunteerPresenceService();
