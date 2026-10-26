/**
 * Cloud Auth & Mode Resolution Service
 *
 * Distinguishes between:
 * 1. Authenticated Mode: Real Firebase Auth user is signed in with a valid UID.
 *    -> All incident data, telemetry, video evidence, and master videos are synced to Firebase.
 * 2. Demo / Guest Mode: User bypassed login or is running without real credentials.
 *    -> Cloud operations are 100% bypassed to prevent unauthenticated Firestore permission
 *       denials, CORS errors, and 5000ms timeouts. All data is securely locked to on-device vault.
 */

import { auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";

export interface CloudUser {
  uid: string;
  email: string;
  isDemoMode: boolean;
}

export const cloudAuthService = {
  /**
   * Ensures the current client is authenticated with Firebase (via existing account or anonymous signin)
   */
  async ensureAuthenticated(): Promise<string> {
    if (auth.currentUser?.uid) {
      return auth.currentUser.uid;
    }
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;
    if (isOnline) {
      try {
        const cred = await signInAnonymously(auth);
        return cred.user.uid;
      } catch (err) {
        console.warn("[CloudAuth] Anonymous signin failed, using local device ID fallback:", err);
      }
    }
    let localId = typeof localStorage !== "undefined" ? localStorage.getItem("rakshika_device_id") : null;
    if (!localId && typeof localStorage !== "undefined") {
      localId = "dev_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem("rakshika_device_id", localId);
    }
    return localId || "local-user";
  },

  /**
   * Returns true if device is online and authenticated with Firebase (real or anonymous)
   */
  isCloudSyncEnabled(): boolean {
    const isOnline = typeof navigator !== "undefined" && navigator.onLine;
    if (!isOnline) return false;

    // Check Firebase Auth instance (both registered and anonymous users are valid cloud clients)
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid) {
      return true;
    }

    // Check stored user_profile
    try {
      const profileRaw = typeof localStorage !== "undefined" ? localStorage.getItem("user_profile") : null;
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.uid && !profile.uid.startsWith("mock-") && profile.uid !== "local-user") {
          return true;
        }
      }
    } catch {
      return false;
    }

    return false;
  },

  /**
   * Resolves current user metadata for cloud storage paths and documents
   */
  getCloudUser(): CloudUser {
    const isEnabled = this.isCloudSyncEnabled();
    const currentUser = auth.currentUser;

    if (isEnabled && currentUser) {
      return {
        uid: currentUser.uid,
        email: currentUser.email || "user@rakshika.app",
        isDemoMode: false,
      };
    }

    // Check stored profile fallback
    try {
      const profileRaw = typeof localStorage !== "undefined" ? localStorage.getItem("user_profile") : null;
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (isEnabled && profile.uid) {
          return {
            uid: profile.uid,
            email: profile.email || "user@rakshika.app",
            isDemoMode: false,
          };
        }
      }
    } catch {}

    // Default to isolated Demo / Local mode identity
    return {
      uid: "local-user",
      email: "demo@rakshika.local",
      isDemoMode: true,
    };
  },

  /**
   * Root cloud storage prefix for evidence: `sos_evidence/{uid}`
   */
  getStoragePrefix(): string {
    const user = this.getCloudUser();
    return `sos_evidence/${user.uid}`;
  },
};
