/**
 * BLE Manager — Lifecycle, permissions, and state management.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager as PlxBleManager, State } from 'react-native-ble-plx';
import { MeshLogger } from '../logging/MeshLogger';

let manager: PlxBleManager | null = null;

export const BleManagerService = {
  getInstance(): PlxBleManager {
    if (!manager) {
      manager = new PlxBleManager();
    }
    return manager;
  },

  async initialize(): Promise<boolean> {
    const bleManager = this.getInstance();
    const state = await bleManager.state();

    if (state === State.PoweredOn) {
      MeshLogger.info('BLE', 'Bluetooth already powered on');
      return true;
    }

    if (state === State.Unsupported) {
      MeshLogger.error('BLE', 'Bluetooth not supported on this device');
      return false;
    }

    // Wait for power on
    return new Promise((resolve) => {
      const sub = bleManager.onStateChange((newState: any) => {
        if (newState === State.PoweredOn) {
          sub.remove();
          MeshLogger.info('BLE', 'Bluetooth powered on');
          resolve(true);
        }
      }, true);
      // Timeout after 10s
      setTimeout(() => {
        sub.remove();
        MeshLogger.warn('BLE', 'Bluetooth power-on timeout');
        resolve(false);
      }, 10000);
    });
  },

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS permissions handled via Info.plist
      return true;
    }

    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      if (Platform.Version >= 31) {
        // Android 12+
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED,
        );
        MeshLogger.info('BLE', 'Android 12+ permissions', { allGranted, results });
        return allGranted;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      MeshLogger.error('BLE', 'Permission request failed', { error: String(error) });
      return false;
    }
  },

  async isBluetoothEnabled(): Promise<boolean> {
    const bleManager = this.getInstance();
    const state = await bleManager.state();
    return state === State.PoweredOn;
  },

  destroy(): void {
    if (manager) {
      manager.destroy();
      manager = null;
    }
  },
};
