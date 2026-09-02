/**
 * Guardian Anchor Service (Pre-Trip Dead-Man's Timer)
 *
 * Designed for situations where a user is about to enter an unlit,
 * remote, or zero-connectivity zone (e.g. rural road, late-night cab):
 *
 * 1. The user sets a safety timer (e.g. 15, 30, 45 minutes) before losing signal.
 * 2. Start location, destination, and timer expiry are anchored locally and to Firestore.
 * 3. Fail-Safe: If the phone is smashed, turned off, or submerged in water,
 *    the server never receives a "Safe Arrival" ping. When timer expires,
 *    the cloud automatically alerts guardians with the last known coordinates!
 */

import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export interface GuardianAnchor {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  destinationName?: string;
  startLocation?: { lat: number; lng: number };
  status: "ACTIVE" | "ARRIVED_SAFE" | "EXPIRED_ALERTED" | "CANCELLED";
  emergencyContacts: { name: string; phone: string }[];
}

const ACTIVE_ANCHOR_KEY = "rakshika_active_guardian_anchor";
const ANCHOR_HISTORY_KEY = "rakshika_guardian_anchor_history";

export const guardianAnchorService = {
  /**
   * Retrieves the currently active Guardian Anchor, if one exists
   */
  getActiveAnchor(): GuardianAnchor | null {
    try {
      const raw = localStorage.getItem(ACTIVE_ANCHOR_KEY);
      if (!raw) return null;
      const anchor = JSON.parse(raw) as GuardianAnchor;
      if (anchor.status === "ACTIVE") {
        // Check if expired locally
        if (new Date(anchor.expiresAt).getTime() <= Date.now()) {
          anchor.status = "EXPIRED_ALERTED";
          localStorage.setItem(ACTIVE_ANCHOR_KEY, JSON.stringify(anchor));
        }
        return anchor;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Starts a new pre-trip Guardian Anchor timer
   */
  async startAnchor(
    durationMinutes: number,
    destinationName?: string,
    currentLocation?: { lat: number; lng: number }
  ): Promise<GuardianAnchor> {
    const user = auth.currentUser;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

    // Read configured emergency contacts
    let contacts: { name: string; phone: string }[] = [];
    try {
      const contactsRaw = localStorage.getItem("rakshika-emergency-contacts");
      if (contactsRaw) {
        contacts = JSON.parse(contactsRaw).map((c: any) => ({
          name: c.name || "Emergency Contact",
          phone: c.phone || "",
        }));
      }
    } catch {}

    const anchor: GuardianAnchor = {
      id: `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user?.uid || "local-user",
      userName: user?.displayName || "Rakshika User",
      userPhone: user?.phoneNumber || "",
      durationMinutes,
      startedAt: now.toISOString(),
      expiresAt,
      destinationName: destinationName || "Destination",
      startLocation: currentLocation,
      status: "ACTIVE",
      emergencyContacts: contacts,
    };

    // 1. Persist locally first
    localStorage.setItem(ACTIVE_ANCHOR_KEY, JSON.stringify(anchor));
    console.log(`[GuardianAnchor] ⚓ Anchor started for ${durationMinutes} mins (Expires: ${expiresAt})`);

    // 2. Sync to cloud Firestore (best-effort)
    const isOnline = typeof navigator === "undefined" || navigator.onLine;
    if (isOnline) {
      try {
        await setDoc(doc(db, "guardian_anchors", anchor.id), anchor, { merge: true });
        console.log(`[GuardianAnchor] Anchor synced to Cloud: ${anchor.id}`);
      } catch (err) {
        console.warn("[GuardianAnchor] Could not sync anchor to Cloud:", err);
      }
    }

    return anchor;
  },

  /**
   * Safe Arrival: User checks in safely before the timer expires
   */
  async checkInSafe(): Promise<GuardianAnchor | null> {
    const anchor = this.getActiveAnchor();
    if (!anchor) return null;

    anchor.status = "ARRIVED_SAFE";
    this.archiveAnchor(anchor);
    localStorage.removeItem(ACTIVE_ANCHOR_KEY);

    // Sync safe resolution to cloud
    const isOnline = typeof navigator === "undefined" || navigator.onLine;
    if (isOnline) {
      try {
        await setDoc(
          doc(db, "guardian_anchors", anchor.id),
          { status: "ARRIVED_SAFE", resolvedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch {}
    }

    console.log(`[GuardianAnchor] ✅ User checked in safely. Anchor resolved.`);
    return anchor;
  },

  /**
   * Cancel anchor
   */
  async cancelAnchor(): Promise<void> {
    const anchor = this.getActiveAnchor();
    if (anchor) {
      anchor.status = "CANCELLED";
      this.archiveAnchor(anchor);
    }
    localStorage.removeItem(ACTIVE_ANCHOR_KEY);
  },

  archiveAnchor(anchor: GuardianAnchor): void {
    try {
      const raw = localStorage.getItem(ANCHOR_HISTORY_KEY);
      const history: GuardianAnchor[] = raw ? JSON.parse(raw) : [];
      history.unshift(anchor);
      localStorage.setItem(ANCHOR_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
    } catch {}
  },
};
