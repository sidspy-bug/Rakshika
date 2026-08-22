/**
 * BLE Types
 *
 * Types for the experimental BLE store-and-forward mesh network.
 */

export enum BleRelayStatus {
  IDLE = "IDLE",
  SCANNING = "SCANNING",
  RELAYING = "RELAYING",
  ERROR = "ERROR",
  DISABLED = "DISABLED",
}

export interface BleMessage {
  messageId: string;
  sosId: string;
  messageType: "SOS_ALERT" | "RESPONSE_UPDATE";
  payload: Record<string, any>;
  lat: number;
  lng: number;
  timestamp: string;
  hopCount: number;
}

export interface BleDeviceInfo {
  deviceId: string;
  name?: string;
  rssi?: number;
  lastSeen: string;
}

export const BLE_CONSTANTS = {
  MAX_HOPS: 3,
  MESSAGE_TTL_MS: 1000 * 60 * 30, // 30 minutes
  SCAN_INTERVAL_MS: 10000, // 10 seconds
  SERVICE_UUID: "RAKSHIKA-BLE-SVC-01",
};
