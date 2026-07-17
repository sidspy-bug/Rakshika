/**
 * MeshContext — React context exposing mesh relay state to the app.
 *
 * Initializes BLE, connectivity monitoring, background sync,
 * and relay scanning on mount. Provides mesh status and controls.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { RelayEngine } from './engine/RelayEngine';
import { ConnectivityMonitor } from './sync/ConnectivityMonitor';
import { CloudSync } from './sync/CloudSync';
import { BackgroundSync } from './sync/BackgroundSync';
import { MeshStatus } from './protocol/PacketTypes';
import { MeshLogger } from './logging/MeshLogger';

interface MeshContextType {
  /** Current mesh relay status */
  meshStatus: MeshStatus;
  /** Whether the device is online */
  isOnline: boolean;
  /** Number of nearby mesh peers */
  peerCount: number;
  /** Manually trigger a sync attempt */
  triggerSync: () => Promise<void>;
  /** Stop all mesh activity */
  stopMesh: () => Promise<void>;
}

const MeshContext = createContext<MeshContextType | undefined>(undefined);

export const MeshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meshStatus, setMeshStatus] = useState<MeshStatus>(MeshStatus.IDLE);
  const [isOnline, setIsOnline] = useState(true);
  const [peerCount, setPeerCount] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        // Initialize relay engine (BLE + DB)
        await RelayEngine.initialize();

        // Start connectivity monitoring
        ConnectivityMonitor.start();
        const online = await ConnectivityMonitor.isOnline();
        setIsOnline(online);

        // Watch connectivity changes
        ConnectivityMonitor.onConnectivityChange((nowOnline) => {
          setIsOnline(nowOnline);
        });

        // Start cloud sync watcher
        CloudSync.startWatching();

        // Register background sync task
        await BackgroundSync.register();

        // Start passive relay scanning (listen for nearby SOS packets)
        await RelayEngine.startRelayScanning();

        MeshLogger.info('RELAY', 'MeshProvider initialized');
      } catch (error) {
        MeshLogger.error('RELAY', 'MeshProvider init failed', { error: String(error) });
      }
    };

    setup();

    // Subscribe to relay engine status changes
    const unsubStatus = RelayEngine.onStatusChange((status) => {
      setMeshStatus(status);
    });

    return () => {
      unsubStatus();
      ConnectivityMonitor.stop();
      CloudSync.stopWatching();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    await CloudSync.syncAll();
  }, []);

  const stopMesh = useCallback(async () => {
    await RelayEngine.stop();
  }, []);

  return (
    <MeshContext.Provider
      value={{
        meshStatus,
        isOnline,
        peerCount,
        triggerSync,
        stopMesh,
      }}
    >
      {children}
    </MeshContext.Provider>
  );
};

export const useMesh = () => {
  const context = useContext(MeshContext);
  if (context === undefined) {
    throw new Error('useMesh must be used within a MeshProvider');
  }
  return context;
};
