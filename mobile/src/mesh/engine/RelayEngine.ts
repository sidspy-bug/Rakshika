/**
 * Relay Engine — Core orchestrator for the offline mesh emergency relay.
 *
 * Coordinates packet creation, BLE advertising/scanning, dedup,
 * TTL enforcement, storage, and relay forwarding.
 */

import { buildPacket, repackForRelay, type BuildPacketInput } from '../protocol/PacketBuilder';
import { parsePacket, parseBase64Packet } from '../protocol/PacketParser';
import {
  PacketStatus,
  MeshStatus,
  type MeshPacketRecord,
  triggerTypeFromCode,
  severityFromCode,
} from '../protocol/PacketTypes';
import { bytesToBase64, base64ToBytes, bytesToHex } from '../protocol/PacketCrypto';
import { BleAdvertiser } from '../ble/BleAdvertiser';
import { BleScanner } from '../ble/BleScanner';
import { BleManagerService } from '../ble/BleManager';
import { MeshDatabase } from '../storage/MeshDatabase';
import { DuplicateFilter } from './DuplicateFilter';
import { TtlManager } from './TtlManager';
import { PeerDiscovery } from './PeerDiscovery';
import { MeshLogger } from '../logging/MeshLogger';

// ─── State ─────────────────────────────────────────────────────────────────────

let meshStatus: MeshStatus = MeshStatus.IDLE;
let statusListeners: Array<(status: MeshStatus) => void> = [];

function setStatus(status: MeshStatus): void {
  meshStatus = status;
  statusListeners.forEach((cb) => cb(status));
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const RelayEngine = {
  /**
   * Initialize the relay engine — set up BLE and database.
   */
  async initialize(): Promise<void> {
    await MeshDatabase.initialize();
    const hasPerms = await BleManagerService.requestPermissions();
    if (hasPerms) {
      await BleManagerService.initialize();
    }
    MeshLogger.info('ENGINE', 'Relay engine initialized', { blePermissions: hasPerms });
  },

  /**
   * Create an offline emergency packet and begin advertising it.
   * Called by sosService when the backend is unreachable.
   *
   * Returns a local emergency object compatible with the existing SOS flow.
   */
  async createOfflineEmergency(input: {
    senderId: string;
    triggerType: string;
    severity: string;
    latitude: number;
    longitude: number;
    address?: string;
  }): Promise<{
    id: string;
    userId: string;
    triggerType: string;
    status: string;
    severity: string;
    latitude: number;
    longitude: number;
    address: string;
    startedAt: string;
    source: 'mesh';
    meshStatus: MeshStatus;
  }> {
    MeshLogger.info('ENGINE', 'Creating offline emergency', { senderId: input.senderId });

    const buildInput: BuildPacketInput = {
      senderId: input.senderId,
      triggerType: input.triggerType,
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      payload: {
        address: input.address,
      },
    };

    const { packet, rawBytes, base64 } = await buildPacket(buildInput);
    const packetId = packet.header.packetId;

    // Store in local queue
    const record: Omit<MeshPacketRecord, 'id'> = {
      packetId,
      senderId: input.senderId,
      timestamp: packet.header.timestamp,
      ttl: packet.header.ttl,
      hopCount: packet.header.hopCount,
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      triggerType: input.triggerType,
      address: input.address,
      status: PacketStatus.ADVERTISING,
      rawPacket: base64,
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await MeshDatabase.insertPacket(record);
    await DuplicateFilter.markSeen(packetId);

    // Start advertising
    await BleAdvertiser.startAdvertising(base64);
    setStatus(MeshStatus.ADVERTISING);

    // Also start scanning for nearby relayers
    await this.startRelayScanning();

    return {
      id: packetId,
      userId: input.senderId,
      triggerType: input.triggerType,
      status: 'active',
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address || 'Location shared via mesh relay',
      startedAt: new Date(packet.header.timestamp).toISOString(),
      source: 'mesh',
      meshStatus: MeshStatus.ADVERTISING,
    };
  },

  /**
   * Start scanning for nearby mesh devices and relay their packets.
   */
  async startRelayScanning(): Promise<void> {
    if (BleScanner.isCurrentlyScanning()) return;

    await BleScanner.startScanning(async (packetBase64, deviceId, rssi) => {
      await this.handleReceivedPacket(packetBase64, deviceId, rssi);
    });
    MeshLogger.info('ENGINE', 'Relay scanning started');
  },

  /**
   * Handle a packet received from a nearby BLE device.
   * Validates, deduplicates, stores, and re-advertises if TTL allows.
   */
  async handleReceivedPacket(packetBase64: string, deviceId: string, rssi: number): Promise<void> {
    const result = await parseBase64Packet(packetBase64);
    if (!result.success || !result.packet) {
      MeshLogger.warn('ENGINE', 'Failed to parse received packet', { error: result.error });
      return;
    }

    const { packet } = result;
    const packetId = packet.header.packetId;

    // Duplicate check
    if (await DuplicateFilter.isDuplicate(packetId)) {
      MeshLogger.debug('ENGINE', 'Duplicate packet ignored', { packetId });
      return;
    }

    // TTL check
    if (!TtlManager.isValid(packet.header.ttl, packet.header.timestamp)) {
      MeshLogger.info('ENGINE', 'Expired packet dropped', { packetId, ttl: packet.header.ttl });
      await DuplicateFilter.markSeen(packetId);
      return;
    }

    // HMAC check — warn but don't drop (relay devices may have re-signed)
    if (!result.hmacValid) {
      MeshLogger.warn('ENGINE', 'Received packet with invalid HMAC — storing anyway', { packetId });
    }

    // Register peer
    await PeerDiscovery.registerPeer(deviceId, rssi, packetId);

    // Store the packet
    const record: Omit<MeshPacketRecord, 'id'> = {
      packetId,
      senderId: packet.header.senderId,
      timestamp: packet.header.timestamp,
      ttl: packet.header.ttl,
      hopCount: packet.header.hopCount,
      severity: severityFromCode(packet.header.severity),
      latitude: packet.header.latitude,
      longitude: packet.header.longitude,
      triggerType: triggerTypeFromCode(packet.header.triggerType),
      status: PacketStatus.RECEIVED,
      rawPacket: packetBase64,
      retryCount: 0,
      relayedBy: deviceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await MeshDatabase.insertPacket(record);
    await DuplicateFilter.markSeen(packetId);

    MeshLogger.info('ENGINE', 'Packet received and stored', {
      packetId,
      from: deviceId,
      ttl: packet.header.ttl,
      hopCount: packet.header.hopCount,
    });

    // Re-advertise with decremented TTL
    const relayParams = TtlManager.prepareForRelay(packet.header.ttl, packet.header.hopCount);
    if (relayParams) {
      const rawBytes = base64ToBytes(packetBase64);
      const repacked = await repackForRelay(rawBytes, relayParams.newTtl, relayParams.newHopCount);
      await BleAdvertiser.startAdvertising(repacked.base64);

      // Update stored record with new TTL/hop
      await MeshDatabase.updateStatus(packetId, PacketStatus.ADVERTISING);
      setStatus(MeshStatus.RELAYING);

      MeshLogger.info('ENGINE', 'Packet relayed', {
        packetId,
        newTtl: relayParams.newTtl,
        newHopCount: relayParams.newHopCount,
      });
    }
  },

  /**
   * Stop all mesh relay activity.
   */
  async stop(): Promise<void> {
    await BleAdvertiser.stopAdvertising();
    BleScanner.stopScanning();
    setStatus(MeshStatus.IDLE);
    MeshLogger.info('ENGINE', 'Relay engine stopped');
  },

  /**
   * Clean up expired packets from the database.
   */
  async cleanupExpired(): Promise<void> {
    const count = await MeshDatabase.cleanExpired(TtlManager.getMaxAgeMs());
    if (count > 0) {
      MeshLogger.info('ENGINE', 'Cleaned expired packets', { count });
    }
  },

  // ─── Status ──────────────────────────────────────────────────────────────

  getStatus(): MeshStatus {
    return meshStatus;
  },

  onStatusChange(listener: (status: MeshStatus) => void): () => void {
    statusListeners.push(listener);
    return () => {
      statusListeners = statusListeners.filter((l) => l !== listener);
    };
  },
};
