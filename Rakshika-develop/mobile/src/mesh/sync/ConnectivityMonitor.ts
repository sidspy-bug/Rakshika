/**
 * Connectivity Monitor — Wraps @react-native-community/netinfo
 * for reliable online/offline detection.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { MeshLogger } from '../logging/MeshLogger';

type ConnectivityCallback = (isOnline: boolean) => void;

let currentState: boolean = true;
let listeners: ConnectivityCallback[] = [];
let unsubscribeNetInfo: (() => void) | null = null;

export const ConnectivityMonitor = {
  /**
   * Start monitoring connectivity changes.
   */
  start(): void {
    unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      if (isOnline !== currentState) {
        currentState = isOnline;
        MeshLogger.info('SYNC', 'Connectivity changed', { isOnline });
        listeners.forEach((cb) => cb(isOnline));
      }
    });
  },

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (unsubscribeNetInfo) {
      unsubscribeNetInfo();
      unsubscribeNetInfo = null;
    }
  },

  /**
   * Check current connectivity state (one-shot).
   */
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return !!(state.isConnected && state.isInternetReachable);
    } catch {
      return false;
    }
  },

  /**
   * Register a callback for connectivity changes.
   */
  onConnectivityChange(callback: ConnectivityCallback): () => void {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter((l) => l !== callback);
    };
  },

  /**
   * Get cached connectivity state (synchronous).
   */
  getCachedState(): boolean {
    return currentState;
  },
};
