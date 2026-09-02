/**
 * AirTag-Style Crowdsourced BLE Mesh Relay Service
 *
 * Implements a decentralized, store-and-forward "Find My" safety mesh:
 * 1. Victim Device (Offline): Encrypts and broadcasts a 25-byte distress beacon.
 * 2. Bystander / Volunteer (Offline): Intercepts the beacon during a 1.5s drive-by
 *    pass, caches it locally in an encrypted buffer with hopCount incremented.
 * 3. Last-Mile Bridge: When any bystander device enters 4G/5G/Wi-Fi coverage,
 *    it automatically flushes all buffered emergency beacons to Firestore (`sos_mesh_relays`).
 */

import { registerPlugin } from "@capacitor/core";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  encryptSosBeacon,
  decryptSosBeacon,
  type SosBeaconPayload,
} from "./cryptoMeshService";

interface BleMeshNativePlugin {
  startAdvertising(options: { payload: string }): Promise<{ success: boolean; error?: string }>;
  stopAdvertising(): Promise<{ success: boolean }>;
  startScanning(): Promise<{ success: boolean; error?: string }>;
  stopScanning(): Promise<{ success: boolean }>;
  addListener(
    eventName: "onBeaconDetected",
    listenerFunc: (data: { ciphertext: string; rssi: number; deviceAddress?: string; timestamp: number }) => void
  ): Promise<{ remove: () => void }>;
}

const BleMesh = registerPlugin<BleMeshNativePlugin>("BleMeshPlugin");

export interface BufferedMeshPacket {
  packetId: string;
  ciphertext: string;
  decryptedPreview?: {
    incidentId: string;
    lat: number;
    lng: number;
    timestamp: string;
    urgency: string;
  };
  capturedAt: string;
  hopCount: number;
  rssi?: number;
  status: "BUFFERED" | "FORWARDING" | "FLUSHED_TO_CLOUD" | "EXPIRED";
}

export interface MeshStats {
  isScanning: boolean;
  isAdvertising: boolean;
  bufferedPacketsCount: number;
  totalPacketsRelayed: number;
  lastFlushTime?: string;
  nearbyBeaconsDetected: number;
}

const BUFFER_KEY = "rakshika_mesh_relay_buffer";
const STATS_KEY = "rakshika_mesh_stats";
const MAX_HOPS = 5;

class AirTagMeshRelayService {
  private isScanning = false;
  private isAdvertising = false;
  private activeBeaconCiphertext: string | null = null;
  private scanInterval: NodeJS.Timeout | null = null;
  private listeners: ((stats: MeshStats) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      // Auto-flush when device reconnects to internet
      window.addEventListener("online", () => {
        console.log("[AirTagMesh] Connection detected. Auto-flushing buffered emergency beacons...");
        this.flushBufferedBeaconsToCloud().catch((err) =>
          console.warn("[AirTagMesh] Auto-flush failed:", err)
        );
      });
    }
  }

  /**
   * Reads all currently buffered beacons from local offline storage
   */
  getBuffer(): BufferedMeshPacket[] {
    try {
      const raw = localStorage.getItem(BUFFER_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves updated buffer to local storage
   */
  private setBuffer(buffer: BufferedMeshPacket[]): void {
    try {
      localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
      this.notifyListeners();
    } catch (err) {
      console.warn("[AirTagMesh] Failed to persist mesh buffer:", err);
    }
  }

  /**
   * Gets aggregated mesh statistics
   */
  getStats(): MeshStats {
    const buffer = this.getBuffer();
    const relayedCount = parseInt(localStorage.getItem(STATS_KEY) || "0", 10);
    return {
      isScanning: this.isScanning,
      isAdvertising: this.isAdvertising,
      bufferedPacketsCount: buffer.filter((p) => p.status === "BUFFERED").length,
      totalPacketsRelayed: relayedCount,
      lastFlushTime: localStorage.getItem("rakshika_last_mesh_flush") || undefined,
      nearbyBeaconsDetected: buffer.length,
    };
  }

  /**
   * Victim Action: Begins advertising an encrypted distress beacon
   */
  async broadcastSosBeacon(payload: SosBeaconPayload): Promise<string> {
    const ciphertext = await encryptSosBeacon(payload);
    this.activeBeaconCiphertext = ciphertext;
    this.isAdvertising = true;

    console.log(`[AirTagMesh] 📡 Broadcasting encrypted SOS beacon: ${ciphertext.slice(0, 16)}...`);
    
    // 1. Hardware Bluetooth Radio Advertising (Over-The-Air BLE)
    try {
      await BleMesh.startAdvertising({ payload: ciphertext });
      console.log("[AirTagMesh] 📡 Native Hardware BLE beacon advertising engaged over physical radio.");
    } catch (nativeErr) {
      console.warn("[AirTagMesh] Native BLE advertising fallback:", nativeErr);
    }

    // 2. Broadcast locally via Web BroadcastChannel for multi-tab simulation
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("rakshika_mesh_channel");
      channel.postMessage({
        type: "SOS_BEACON_EMIT",
        ciphertext,
        timestamp: new Date().toISOString(),
      });
    }

    this.notifyListeners();
    return ciphertext;
  }

  /**
   * Stops active beacon broadcasting
   */
  stopBroadcasting(): void {
    this.isAdvertising = false;
    this.activeBeaconCiphertext = null;
    try {
      BleMesh.stopAdvertising().catch(() => {});
    } catch (ignored) {}
    this.notifyListeners();
    console.log("[AirTagMesh] Stopped broadcasting SOS beacon.");
  }

  /**
   * Bystander / Volunteer Action: Intercepts an encrypted SOS beacon in passing
   */
  async receiveInterceptedBeacon(
    ciphertext: string,
    rssi: number = -65
  ): Promise<BufferedMeshPacket | null> {
    if (!ciphertext || !ciphertext.startsWith("rk_")) return null;

    const buffer = this.getBuffer();

    // Deduplication check: Do not buffer if we already hold this active packet
    const existing = buffer.find((p) => p.ciphertext === ciphertext);
    if (existing) {
      existing.rssi = rssi;
      this.setBuffer(buffer);
      return existing;
    }

    const decrypted = await decryptSosBeacon(ciphertext);
    const hopCount = decrypted ? decrypted.hopCount + 1 : 1;

    if (hopCount > MAX_HOPS) {
      console.log(`[AirTagMesh] Dropping beacon (exceeded max hops: ${hopCount})`);
      return null;
    }

    const newPacket: BufferedMeshPacket = {
      packetId: `pkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ciphertext,
      decryptedPreview: decrypted
        ? {
            incidentId: decrypted.incidentId,
            lat: decrypted.lat,
            lng: decrypted.lng,
            timestamp: decrypted.timestamp,
            urgency: decrypted.urgency,
          }
        : undefined,
      capturedAt: new Date().toISOString(),
      hopCount,
      rssi,
      status: "BUFFERED",
    };

    buffer.unshift(newPacket);
    // Keep max 30 buffered packets
    this.setBuffer(buffer.slice(0, 30));

    console.log(
      `[AirTagMesh] 📥 Intercepted distress beacon in passing! Incident: ${
        decrypted?.incidentId || "Encrypted"
      } (Hop ${hopCount})`
    );

    // If device is currently online, attempt immediate flush
    if (typeof navigator !== "undefined" && navigator.onLine) {
      this.flushBufferedBeaconsToCloud().catch(() => {});
    }

    return newPacket;
  }

  /**
   * Starts background listener / scanner for nearby beacons
   */
  startMeshScanner(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    // 1. Hardware Bluetooth Radio Scanner (Over-The-Air BLE)
    try {
      BleMesh.startScanning().catch((err) =>
        console.warn("[AirTagMesh] Native BLE scan start error:", err)
      );
      BleMesh.addListener("onBeaconDetected", (data) => {
        console.log("[AirTagMesh] ⚡ Native BLE beacon received over the air:", data);
        if (data.ciphertext && data.ciphertext !== this.activeBeaconCiphertext) {
          this.receiveInterceptedBeacon(data.ciphertext, data.rssi || -60);
        }
      }).catch((err) => console.warn("[AirTagMesh] Native BLE listener add error:", err));
    } catch (nativeErr) {
      console.warn("[AirTagMesh] Native BLE scanner fallback:", nativeErr);
    }

    // 2. Listen on BroadcastChannel for multi-device / multi-window simulation
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("rakshika_mesh_channel");
      channel.onmessage = (event) => {
        if (event.data?.type === "SOS_BEACON_EMIT" && event.data?.ciphertext) {
          // Do not self-intercept our own active beacon
          if (event.data.ciphertext !== this.activeBeaconCiphertext) {
            this.receiveInterceptedBeacon(event.data.ciphertext, -55);
          }
        }
      };
    }

    // Periodic simulation scanner looking for nearby signals
    this.scanInterval = setInterval(() => {
      // Background heartbeat
      this.notifyListeners();
    }, 10000);

    this.notifyListeners();
    console.log("[AirTagMesh] 🔍 Started background mesh scanner.");
  }

  /**
   * Stops background scanner
   */
  stopMeshScanner(): void {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    try {
      BleMesh.stopScanning().catch(() => {});
    } catch (ignored) {}
    this.notifyListeners();
    console.log("[AirTagMesh] Stopped mesh scanner.");
  }

  /**
   * Last-Mile Flush: Flushes all buffered emergency beacons to Firebase Firestore
   */
  async flushBufferedBeaconsToCloud(): Promise<{ flushedCount: number; errors: number }> {
    const isOnline = typeof navigator === "undefined" || navigator.onLine;
    if (!isOnline) {
      return { flushedCount: 0, errors: 0 };
    }

    const buffer = this.getBuffer();
    const pending = buffer.filter((p) => p.status === "BUFFERED");
    if (pending.length === 0) return { flushedCount: 0, errors: 0 };

    console.log(`[AirTagMesh] 🚀 Flushing ${pending.length} buffered emergency beacon(s) to cloud...`);

    let flushedCount = 0;
    let errors = 0;

    for (const packet of pending) {
      try {
        const decrypted = await decryptSosBeacon(packet.ciphertext);
        const docId = decrypted ? decrypted.incidentId : packet.packetId;

        // Write relay receipt to Firestore collection
        await setDoc(
          doc(db, "sos_mesh_relays", `${docId}_relay_${packet.packetId}`),
          {
            incidentId: decrypted?.incidentId || "UNKNOWN",
            ciphertext: packet.ciphertext,
            lat: decrypted?.lat || null,
            lng: decrypted?.lng || null,
            urgency: decrypted?.urgency || "HIGH",
            originalTimestamp: decrypted?.timestamp || null,
            capturedAt: packet.capturedAt,
            relayedAt: new Date().toISOString(),
            hopCount: packet.hopCount,
            relayStatus: "DELIVERED_TO_CLOUD",
          },
          { merge: true }
        );

        packet.status = "FLUSHED_TO_CLOUD";
        flushedCount++;
      } catch (err) {
        console.warn(`[AirTagMesh] Failed to flush packet ${packet.packetId}:`, err);
        errors++;
      }
    }

    // Save updated status
    this.setBuffer(buffer);

    // Update total relayed counter
    const currentTotal = parseInt(localStorage.getItem(STATS_KEY) || "0", 10);
    localStorage.setItem(STATS_KEY, String(currentTotal + flushedCount));
    localStorage.setItem("rakshika_last_mesh_flush", new Date().toISOString());

    this.notifyListeners();
    console.log(`[AirTagMesh] ✅ Successfully flushed ${flushedCount} emergency beacon(s) to cloud.`);
    return { flushedCount, errors };
  }

  /**
   * Clears buffer (for testing purposes)
   */
  clearBufferForTesting(): void {
    localStorage.removeItem(BUFFER_KEY);
    localStorage.removeItem(STATS_KEY);
    this.activeBeaconCiphertext = null;
    this.notifyListeners();
  }

  /**
   * Observer subscriptions
   */
  subscribe(callback: (stats: MeshStats) => void): () => void {
    this.listeners.push(callback);
    callback(this.getStats());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((cb) => {
      try {
        cb(stats);
      } catch {}
    });
  }
}

export const airTagMeshRelayService = new AirTagMeshRelayService();
