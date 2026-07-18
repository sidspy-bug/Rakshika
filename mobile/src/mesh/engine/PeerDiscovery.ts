/**
 * Peer Discovery — Tracks discovered mesh peers.
 */

import { type MeshPeer } from '../protocol/PacketTypes';
import { BLE_PEER_STALE_MS } from '../ble/BleConstants';
import { MeshDatabase } from '../storage/MeshDatabase';
import { MeshLogger } from '../logging/MeshLogger';

const activePeers = new Map<string, MeshPeer>();

export const PeerDiscovery = {
  /**
   * Register or update a discovered peer.
   */
  async registerPeer(deviceId: string, rssi: number, packetId?: string): Promise<void> {
    const existing = activePeers.get(deviceId);
    const packetIds = existing ? [...existing.packetIds] : [];
    if (packetId && !packetIds.includes(packetId)) {
      packetIds.push(packetId);
    }

    const peer: MeshPeer = {
      deviceId,
      rssi,
      lastSeen: Date.now(),
      packetIds,
    };

    activePeers.set(deviceId, peer);
    await MeshDatabase.upsertPeer(deviceId, rssi, packetIds);
    MeshLogger.debug('PEER', 'Peer registered', { deviceId, rssi, packetCount: packetIds.length });
  },

  /**
   * Get all active (non-stale) peers.
   */
  getActivePeers(): MeshPeer[] {
    const cutoff = Date.now() - BLE_PEER_STALE_MS;
    const active: MeshPeer[] = [];
    for (const [id, peer] of activePeers) {
      if (peer.lastSeen > cutoff) {
        active.push(peer);
      } else {
        activePeers.delete(id);
      }
    }
    return active;
  },

  /**
   * Check if a peer has already received a specific packet.
   */
  peerHasPacket(deviceId: string, packetId: string): boolean {
    const peer = activePeers.get(deviceId);
    return peer ? peer.packetIds.includes(packetId) : false;
  },

  getPeerCount(): number {
    return this.getActivePeers().length;
  },

  clear(): void {
    activePeers.clear();
  },
};
