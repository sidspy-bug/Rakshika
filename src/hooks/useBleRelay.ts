/**
 * useBleRelay Hook
 *
 * React hook to interface with the BLE relay service.
 * Only activates when the device goes offline.
 */

import { useState, useEffect } from "react";
import { bleRelayService } from "../services/bleRelayService";
import { useConnectivity } from "./useConnectivity";
import { BleRelayStatus } from "../types/ble";
import type { BleMessage } from "../types/ble";

export function useBleRelay() {
  const { isOnline } = useConnectivity();
  
  const [status, setStatus] = useState<BleRelayStatus>(BleRelayStatus.IDLE);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [lastRelayTime, setLastRelayTime] = useState<string | null>(null);

  useEffect(() => {
    // Only turn on BLE mesh when offline to save battery
    if (isOnline) {
      bleRelayService.stopScanning();
      bleRelayService.stopAdvertising();
      setStatus(BleRelayStatus.DISABLED);
      return;
    }

    let isMounted = true;
    
    setStatus(BleRelayStatus.SCANNING);
    bleRelayService.startScanning();
    bleRelayService.startAdvertising();

    const unsubScan = bleRelayService.onDeviceDiscovered(() => {
      if (isMounted) {
        setNearbyCount(bleRelayService.getNearbyDevicesCount());
      }
    });

    const unsubMsg = bleRelayService.onMessageReceived(() => {
      if (isMounted) {
        setLastRelayTime(new Date().toISOString());
        setStatus(BleRelayStatus.RELAYING);
        
        // Reset back to scanning after a short delay
        setTimeout(() => {
          if (isMounted) setStatus(BleRelayStatus.SCANNING);
        }, 3000);
      }
    });

    return () => {
      isMounted = false;
      unsubScan();
      unsubMsg();
      bleRelayService.stopScanning();
      bleRelayService.stopAdvertising();
    };
  }, [isOnline]);

  const sendRelayMessage = async (message: Omit<BleMessage, "messageId" | "timestamp" | "hopCount">) => {
    setStatus(BleRelayStatus.RELAYING);
    const success = await bleRelayService.relayMessage(message);
    setLastRelayTime(new Date().toISOString());
    setTimeout(() => setStatus(BleRelayStatus.SCANNING), 2000);
    return success;
  };

  return {
    status,
    nearbyCount,
    lastRelayTime,
    sendRelayMessage,
  };
}
