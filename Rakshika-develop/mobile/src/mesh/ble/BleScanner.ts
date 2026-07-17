/**
 * BLE Scanner — Discovers nearby mesh devices and reads emergency packets.
 */

import { type Device, type Subscription } from 'react-native-ble-plx';
import {
  MESH_SERVICE_UUID,
  BLE_SCAN_INTERVAL_MS,
  BLE_MIN_RSSI,
  BLE_TARGET_MTU,
  BLE_CONNECTION_TIMEOUT_MS,
  PACKET_CHARACTERISTIC_UUID,
} from './BleConstants';
import { BleManagerService } from './BleManager';
import { MeshLogger } from '../logging/MeshLogger';

type PacketReceivedCallback = (packetBase64: string, deviceId: string, rssi: number) => void;

let scanSubscription: Subscription | null = null;
let isScanning = false;
let onPacketReceived: PacketReceivedCallback | null = null;

export const BleScanner = {
  /**
   * Start scanning for nearby Rakshika mesh devices.
   * When a device with the mesh service UUID is found, attempt to
   * connect and read the packet characteristic.
   */
  async startScanning(callback: PacketReceivedCallback): Promise<boolean> {
    if (isScanning) {
      MeshLogger.debug('BLE', 'Already scanning');
      return true;
    }

    const bleReady = await BleManagerService.isBluetoothEnabled();
    if (!bleReady) {
      MeshLogger.warn('BLE', 'Cannot scan — Bluetooth not enabled');
      return false;
    }

    onPacketReceived = callback;
    isScanning = true;

    const manager = BleManagerService.getInstance();

    manager.startDeviceScan(
      [MESH_SERVICE_UUID],
      { allowDuplicates: false },
      async (error: any, device: any) => {
        if (error) {
          MeshLogger.error('BLE', 'Scan error', { error: error.message });
          return;
        }

        if (!device) return;

        const rssi = device.rssi ?? -100;
        if (rssi < BLE_MIN_RSSI) return;

        MeshLogger.debug('BLE', 'Mesh device discovered', {
          deviceId: device.id,
          name: device.name,
          rssi,
        });

        // Try to connect and read the packet
        await readPacketFromDevice(device);
      },
    );

    MeshLogger.info('BLE', 'Scanning started');
    return true;
  },

  stopScanning(): void {
    if (!isScanning) return;
    const manager = BleManagerService.getInstance();
    manager.stopDeviceScan();
    isScanning = false;
    onPacketReceived = null;
    MeshLogger.info('BLE', 'Scanning stopped');
  },

  isCurrentlyScanning(): boolean {
    return isScanning;
  },
};

async function readPacketFromDevice(device: Device): Promise<void> {
  const manager = BleManagerService.getInstance();

  try {
    // Connect
    const connected = await device.connect({ timeout: BLE_CONNECTION_TIMEOUT_MS });

    // Negotiate MTU
    try {
      await connected.requestMTU(BLE_TARGET_MTU);
    } catch {
      // MTU negotiation may fail on some devices — continue with default
    }

    // Discover services
    await connected.discoverAllServicesAndCharacteristics();

    // Read the packet characteristic
    const characteristic = await connected.readCharacteristicForService(
      MESH_SERVICE_UUID,
      PACKET_CHARACTERISTIC_UUID,
    );

    if (characteristic.value && onPacketReceived) {
      onPacketReceived(characteristic.value, device.id, device.rssi ?? -100);
      MeshLogger.info('BLE', 'Packet read from device', { deviceId: device.id });
    }

    // Disconnect
    await connected.cancelConnection();
  } catch (error) {
    MeshLogger.warn('BLE', 'Failed to read from device', {
      deviceId: device.id,
      error: String(error),
    });
    // Attempt cleanup
    try {
      await manager.cancelDeviceConnection(device.id);
    } catch {
      // ignore cleanup errors
    }
  }
}
