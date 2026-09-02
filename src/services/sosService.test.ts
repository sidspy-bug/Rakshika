import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getActiveSos,
  createOrGetActiveSos,
  appendSosLocation,
  setSosEvidenceUrl,
  syncSosToFirebase,
  stopSos,
  getSosHistory,
  clearAllSosDataForTesting,
  ACTIVE_SOS_KEY,
} from "./sosService";
import * as firestore from "firebase/firestore";

// In-memory localStorage mock for node test runner
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true, configurable: true });

// Mock Firebase Firestore methods
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, collection, id) => ({ path: `${collection}/${id}`, id })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getFirestore: vi.fn(),
}));

vi.mock("./firebase", () => ({
  auth: { currentUser: { uid: "test-user-123", email: "user@test.com" } },
  db: {},
  storage: {},
}));

describe("Local-First SOS Service (Problem #1)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearAllSosDataForTesting();
    vi.clearAllMocks();
    (firestore.setDoc as any).mockReset();
    (firestore.setDoc as any).mockResolvedValue(undefined);
    if (typeof navigator !== "undefined") {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    }
  });

  afterEach(() => {
    localStorageMock.clear();
    clearAllSosDataForTesting();
  });

  describe("Case 1: Normal Operation (Local Creation + Sync Success)", () => {
    it("should create local active SOS immediately with a stable client-generated ID and sync to Firebase", async () => {
      // 1. Activate SOS
      const incident = createOrGetActiveSos({
        userId: "user-1",
        userEmail: "priya@example.com",
        userPhone: "+919876543210",
      });

      // Local SOS exists and is ACTIVE immediately
      expect(incident.id).toMatch(/^sos_\d+_[a-z0-9]+$/);
      expect(incident.status).toBe("ACTIVE");
      expect(incident.syncStatus).toBe("PENDING");

      // Verify persisted in localStorage synchronously
      const stored = JSON.parse(localStorage.getItem(ACTIVE_SOS_KEY)!);
      expect(stored.id).toBe(incident.id);
      expect(stored.status).toBe("ACTIVE");

      // 2. Synchronize to Firebase
      (firestore.setDoc as any).mockResolvedValueOnce(undefined);
      const syncResult = await syncSosToFirebase(incident.id);

      expect(syncResult.success).toBe(true);
      expect(syncResult.incident?.status).toBe("ACTIVE");
      expect(syncResult.incident?.syncStatus).toBe("SYNCED");

      // Verify firestore.setDoc was called with matching document ID (idempotency)
      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: incident.id, path: `sos_records/${incident.id}` }),
        expect.objectContaining({
          id: incident.id,
          userId: "user-1",
          status: "ACTIVE",
        }),
        { merge: true }
      );
    });
  });

  describe("Case 2: No Internet / Offline Activation", () => {
    it("should keep SOS ACTIVE locally even when offline", async () => {
      // Simulate offline environment
      if (typeof navigator !== "undefined") {
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      }

      const incident = createOrGetActiveSos();
      expect(incident.status).toBe("ACTIVE");

      const syncResult = await syncSosToFirebase(incident.id);
      expect(syncResult.success).toBe(false);

      // Crucial: SOS status MUST STILL BE ACTIVE locally
      const activeSos = getActiveSos();
      expect(activeSos).not.toBeNull();
      expect(activeSos?.id).toBe(incident.id);
      expect(activeSos?.status).toBe("ACTIVE");
      expect(activeSos?.syncStatus).toBe("FAILED");
      expect(activeSos?.syncError).toContain("offline");

      if (typeof navigator !== "undefined") {
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      }
    });
  });

  describe("Case 3: Firebase Server Error / Unavailable", () => {
    it("should remain ACTIVE locally when Firebase throws an unhandled server error", async () => {
      const incident = createOrGetActiveSos();

      // Simulate Firestore rejected error (e.g. 503 Service Unavailable or network down)
      (firestore.setDoc as any).mockRejectedValueOnce(new Error("Firebase backend unavailable (503)"));

      const syncResult = await syncSosToFirebase(incident.id);
      expect(syncResult.success).toBe(false);

      // SOS must NOT fail locally
      const activeSos = getActiveSos();
      expect(activeSos).not.toBeNull();
      expect(activeSos?.id).toBe(incident.id);
      expect(activeSos?.status).toBe("ACTIVE");
      expect(activeSos?.syncStatus).toBe("FAILED");
      expect(activeSos?.syncError).toContain("Firebase backend unavailable");
    });
  });

  describe("Case 4: Firebase Request Timeout", () => {
    it("should catch timeout and maintain ACTIVE local SOS status without throwing", async () => {
      const incident = createOrGetActiveSos();

      // Simulate Firestore rejection matching timeout
      (firestore.setDoc as any).mockRejectedValueOnce(new Error("Firebase sync request timed out (5000ms)"));

      const syncResult = await syncSosToFirebase(incident.id);
      expect(syncResult.success).toBe(false);

      const activeSos = getActiveSos();
      expect(activeSos?.status).toBe("ACTIVE");
      expect(activeSos?.syncStatus).toBe("FAILED");
    });
  });

  describe("Case 5: Application Reload / Memory Recovery", () => {
    it("should restore active SOS state after page reload or remount from localStorage", () => {
      // 1. Establish active SOS
      const originalIncident = createOrGetActiveSos({
        userId: "user-99",
        userEmail: "ananya@example.com",
        userPhone: "+919123456780",
      });

      appendSosLocation({ lat: 28.6139, lng: 77.2090 });
      setSosEvidenceUrl("https://storage.googleapis.com/evidence-test.webm");

      // 2. Simulate application reload / fresh instance reading localStorage
      const recoveredSos = getActiveSos();
      expect(recoveredSos).not.toBeNull();
      expect(recoveredSos?.id).toBe(originalIncident.id);
      expect(recoveredSos?.status).toBe("ACTIVE");
      expect(recoveredSos?.userId).toBe("user-99");
      expect(recoveredSos?.locationHistory).toHaveLength(1);
      expect(recoveredSos?.locationHistory[0].lat).toBe(28.6139);
      expect(recoveredSos?.evidenceUrl).toBe("https://storage.googleapis.com/evidence-test.webm");
    });
  });

  describe("Case 6: Duplicate Activation Prevention", () => {
    it("should return existing active incident and NOT create duplicate records if called repeatedly", () => {
      // First activation
      const first = createOrGetActiveSos({ userId: "user-1" });
      const firstId = first.id;

      // Second activation attempt while first is active
      const second = createOrGetActiveSos({ userId: "user-1" });
      expect(second.id).toBe(firstId);

      // Third activation attempt
      const third = createOrGetActiveSos({ userId: "user-1" });
      expect(third.id).toBe(firstId);

      // Verify only 1 active SOS exists in localStorage
      const stored = JSON.parse(localStorage.getItem(ACTIVE_SOS_KEY)!);
      expect(stored.id).toBe(firstId);
    });
  });

  describe("Case 7: SOS Stop / Cancellation", () => {
    it("should mark incident as CANCELLED, archive to history, and clear active key", async () => {
      const incident = createOrGetActiveSos();
      expect(getActiveSos()).not.toBeNull();

      const stopped = await stopSos("CANCELLED");
      expect(stopped?.status).toBe("CANCELLED");
      expect(stopped?.resolvedAt).toBeDefined();

      // Active SOS must now be null
      expect(getActiveSos()).toBeNull();
      expect(localStorage.getItem(ACTIVE_SOS_KEY)).toBeNull();

      // History must contain archived incident
      const history = getSosHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(incident.id);
      expect(history[0].status).toBe("CANCELLED");
    });
  });
});
