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

export interface CloudUser {
  uid: string;
  email: string;
  isDemoMode: boolean;
}

export const cloudAuthService = {
  /**
   * Returns true ONLY if a legitimate, authenticated Firebase user is signed in.
   * If running in Demo Mode or if the token is a bypass/mock token, returns false.
   */
  isCloudSyncEnabled(): boolean {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    
    // Explicit demo bypass or missing token
    if (!token || token === "demo-bypass-token" || token.startsWith("mock-token")) {
      return false;
    }

    // Check Firebase Auth instance
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid && !currentUser.isAnonymous) {
      return true;
    }

    // If currentUser is still restoring from persistence, check stored user_profile
    try {
      const profileRaw = localStorage.getItem("user_profile");
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
