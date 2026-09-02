/**
 * useAirTagMesh Hook
 *
 * Provides real-time reactive access to the crowdsourced AirTag-style
 * BLE Mesh Relay service. Mounts background scanner when enabled.
 */

import { useState, useEffect, useCallback } from "react";
import {
  airTagMeshRelayService,
  type MeshStats,
  type BufferedMeshPacket,
} from "../services/airTagMeshRelayService";

export function useAirTagMesh(autoStartScanner: boolean = true) {
  const [stats, setStats] = useState<MeshStats>(() => airTagMeshRelayService.getStats());
  const [bufferedPackets, setBufferedPackets] = useState<BufferedMeshPacket[]>(() =>
    airTagMeshRelayService.getBuffer()
  );

  useEffect(() => {
    if (autoStartScanner) {
      airTagMeshRelayService.startMeshScanner();
    }

    const unsubscribe = airTagMeshRelayService.subscribe((newStats) => {
      setStats(newStats);
      setBufferedPackets(airTagMeshRelayService.getBuffer());
    });

    return () => {
      unsubscribe();
    };
  }, [autoStartScanner]);

  const flushNow = useCallback(async () => {
    return await airTagMeshRelayService.flushBufferedBeaconsToCloud();
  }, []);

  const simulateIncomingBeacon = useCallback(
    async (ciphertext: string, rssi: number = -60) => {
      return await airTagMeshRelayService.receiveInterceptedBeacon(ciphertext, rssi);
    },
    []
  );

  return {
    ...stats,
    bufferedPackets,
    flushNow,
    simulateIncomingBeacon,
  };
}
