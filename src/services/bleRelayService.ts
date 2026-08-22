/**
 * bleRelayService
 *
 * Mock service for BLE store-and-forward mesh networking.
 * Simulates advertising, scanning, and relaying SOS messages when offline.
 */

import { BLE_CONSTANTS } from "../types/ble";
import type { BleMessage, BleDeviceInfo } from "../types/ble";

class BleRelayService {
  private isScanning = false;
  private isAdvertising = false;
  private seenMessages = new Set<string>();
  private messageBuffer: BleMessage[] = [];
  private nearbyDevices: Map<string, BleDeviceInfo> = new Map();
  private scanInterval: any = null;

  private onDeviceDiscoveredCallbacks: ((device: BleDeviceInfo) => void)[] = [];
  private onMessageReceivedCallbacks: ((message: BleMessage) => void)[] = [];

  /**
   * Starts scanning for nearby Rakshika devices
   */
  async startScanning(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;
    
    console.log("[BLE Relay] Started scanning for devices...");
    
    // Simulate finding a device every few seconds
    this.scanInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const mockDevice: BleDeviceInfo = {
          deviceId: `ble-${Math.floor(Math.random() * 1000)}`,
          name: "Rakshika Vol",
          rssi: -40 - Math.floor(Math.random() * 40),
          lastSeen: new Date().toISOString(),
        };
        this.nearbyDevices.set(mockDevice.deviceId, mockDevice);
        this.onDeviceDiscoveredCallbacks.forEach(cb => cb(mockDevice));
      }
    }, BLE_CONSTANTS.SCAN_INTERVAL_MS);
  }

  /**
   * Stops scanning
   */
  async stopScanning(): Promise<void> {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    console.log("[BLE Relay] Stopped scanning.");
  }

  /**
   * Start advertising the device's presence to other Rakshika users
   */
  async startAdvertising(): Promise<void> {
    if (this.isAdvertising) return;
    this.isAdvertising = true;
    console.log("[BLE Relay] Started advertising presence.");
  }

  /**
   * Stops advertising
   */
  async stopAdvertising(): Promise<void> {
    this.isAdvertising = false;
    console.log("[BLE Relay] Stopped advertising.");
  }

  /**
   * Relays a message to nearby devices
   */
  async relayMessage(message: Omit<BleMessage, "messageId" | "timestamp" | "hopCount">): Promise<boolean> {
    const fullMessage: BleMessage = {
      ...message,
      messageId: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      hopCount: 0,
    };
    
    this.seenMessages.add(fullMessage.messageId);
    this.messageBuffer.push(fullMessage);
    
    console.log(`[BLE Relay] Broadcasting message: ${fullMessage.messageId} (Hop 0)`);
    
    // In a real app, this would use a native BLE plugin to write to nearby devices
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.nearbyDevices.size > 0; // Return true if there's someone to hear it
  }

  /**
   * Internal mock to simulate receiving a message from another device
   */
  simulateMessageReceived(message: BleMessage) {
    if (this.seenMessages.has(message.messageId)) {
      return; // Deduplication
    }
    
    this.seenMessages.add(message.messageId);
    console.log(`[BLE Relay] Received relayed message: ${message.messageId} (Hop ${message.hopCount})`);
    
    this.onMessageReceivedCallbacks.forEach(cb => cb(message));

    // Store and forward if hop limit not reached
    if (message.hopCount < BLE_CONSTANTS.MAX_HOPS) {
      const forwardedMessage = { ...message, hopCount: message.hopCount + 1 };
      this.messageBuffer.push(forwardedMessage);
      console.log(`[BLE Relay] Forwarding message: ${message.messageId} (Hop ${forwardedMessage.hopCount})`);
    }
  }

  getNearbyDevicesCount(): number {
    return this.nearbyDevices.size;
  }

  // Observers
  onDeviceDiscovered(callback: (device: BleDeviceInfo) => void) {
    this.onDeviceDiscoveredCallbacks.push(callback);
    return () => {
      this.onDeviceDiscoveredCallbacks = this.onDeviceDiscoveredCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageReceived(callback: (message: BleMessage) => void) {
    this.onMessageReceivedCallbacks.push(callback);
    return () => {
      this.onMessageReceivedCallbacks = this.onMessageReceivedCallbacks.filter(cb => cb !== callback);
    };
  }
}

export const bleRelayService = new BleRelayService();
