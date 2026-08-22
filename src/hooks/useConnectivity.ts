/**
 * useConnectivity Hook
 *
 * Enhanced connectivity detection for volunteers.
 * Distinguishes between online, offline, and checks for SMS capabilities.
 */

import { useState, useEffect } from "react";
import { useNetworkStatus } from "./useNetworkStatus";

export type ConnectionState = "ONLINE" | "OFFLINE";

export function useConnectivity() {
  const { isOnline } = useNetworkStatus();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    isOnline ? "ONLINE" : "OFFLINE"
  );
  
  // In a real device (via Capacitor), we would also check connection type
  // (WiFi, Cellular) and SMS capability. For MVP, we mock SMS capability.
  const [canSendSMS, setCanSendSMS] = useState(true);

  useEffect(() => {
    setConnectionState(isOnline ? "ONLINE" : "OFFLINE");
  }, [isOnline]);

  useEffect(() => {
    // Mocking SMS capability check. 
    // In Capacitor: import { Device } from '@capacitor/device';
    // const info = await Device.getInfo();
    // setCanSendSMS(info.platform === 'android' || info.platform === 'ios');
    setCanSendSMS(true); 
  }, []);

  return {
    isOnline,
    connectionState,
    canSendSMS,
  };
}
