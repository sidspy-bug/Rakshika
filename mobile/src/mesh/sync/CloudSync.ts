/**
 * Cloud Sync — Uploads queued mesh packets to the backend
 * when connectivity becomes available.
 */

import api from '../../services/api';
import { MeshDatabase } from '../storage/MeshDatabase';
import { RetryQueue } from '../engine/RetryQueue';
import { RelayEngine } from '../engine/RelayEngine';
import { ConnectivityMonitor } from './ConnectivityMonitor';
import {
  PacketStatus,
  MeshStatus,
  type MeshPacketRecord,
  type RelayUploadPayload,
} from '../protocol/PacketTypes';
import { bytesToBase64, base64ToBytes } from '../protocol/PacketCrypto';
import { MeshLogger } from '../logging/MeshLogger';
import { EvidenceDatabase } from '../../services/evidenceDatabase';
import evidenceService from '../../services/evidenceService';
import * as FileSystem from 'expo-file-system';

let syncInProgress = false;
let unsubConnectivity: (() => void) | null = null;

export const CloudSync = {
  /**
   * Start watching for connectivity to trigger auto-sync.
   */
  startWatching(): void {
    unsubConnectivity = ConnectivityMonitor.onConnectivityChange(async (isOnline) => {
      if (isOnline) {
        MeshLogger.info('SYNC', 'Device came online — triggering sync');
        await this.syncAll();
      }
    });
  },

  stopWatching(): void {
    if (unsubConnectivity) {
      unsubConnectivity();
      unsubConnectivity = null;
    }
  },

  /**
   * Attempt to upload all pending/received/retry packets to the backend.
   */
  async syncAll(): Promise<{ synced: number; failed: number }> {
    if (syncInProgress) {
      MeshLogger.debug('SYNC', 'Sync already in progress');
      return { synced: 0, failed: 0 };
    }

    const isOnline = await ConnectivityMonitor.isOnline();
    if (!isOnline) {
      MeshLogger.debug('SYNC', 'Device offline, skipping sync');
      return { synced: 0, failed: 0 };
    }

    syncInProgress = true;
    let synced = 0;
    let failed = 0;

    try {
      const packets = await MeshDatabase.getPendingForSync();
      MeshLogger.info('SYNC', `Found ${packets.length} packets to sync`);

      for (const packet of packets) {
        // Check retry eligibility
        if (packet.status === PacketStatus.RETRY) {
          if (!RetryQueue.canRetry(packet.retryCount, packet.lastRetryAt)) {
            continue;
          }
          if (RetryQueue.isExhausted(packet.retryCount)) {
            await MeshDatabase.updateStatus(packet.packetId, PacketStatus.EXPIRED);
            continue;
          }
        }

        const success = await this.uploadPacket(packet);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      }

      // Sync offline evidence records
      const evResult = await this.syncEvidence();
      synced += evResult.synced;
      failed += evResult.failed;

      if (synced > 0) {
        MeshLogger.info('SYNC', 'Sync complete', { synced, failed });
      }
    } catch (error) {
      MeshLogger.error('SYNC', 'Sync failed', { error: String(error) });
    } finally {
      syncInProgress = false;
    }

    return { synced, failed };
  },

  /**
   * Upload a single packet to the backend relay-upload endpoint.
   */
  async uploadPacket(record: MeshPacketRecord): Promise<boolean> {
    try {
      // Get the device ID for relayed_by field
      let relayedBy = record.relayedBy || 'self';

      const payload: RelayUploadPayload = {
        packetId: record.packetId,
        senderId: record.senderId,
        timestamp: new Date(record.timestamp).toISOString(),
        triggerType: record.triggerType,
        severity: record.severity,
        latitude: record.latitude,
        longitude: record.longitude,
        address: record.address,
        hopCount: record.hopCount,
        relayedBy,
        hmacSignature: '', // Extracted from raw packet
      };

      // Extract HMAC from the raw packet (last 32 bytes)
      try {
        const rawBytes = base64ToBytes(record.rawPacket);
        const hmacBytes = rawBytes.slice(rawBytes.length - 32);
        payload.hmacSignature = bytesToBase64(hmacBytes);
      } catch {
        MeshLogger.warn('SYNC', 'Could not extract HMAC from raw packet');
      }

      await api.post('/emergencies/relay-upload', payload);

      await MeshDatabase.markSynced(record.packetId);
      MeshLogger.info('SYNC', 'Packet uploaded', { packetId: record.packetId });
      return true;
    } catch (error) {
      MeshLogger.warn('SYNC', 'Upload failed, scheduling retry', {
        packetId: record.packetId,
        retryCount: record.retryCount,
        error: String(error),
      });
      await MeshDatabase.incrementRetry(record.packetId);
      return false;
    }
  },

  /**
   * Upload all queued offline evidence files.
   */
  async syncEvidence(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;
    try {
      const pending = await EvidenceDatabase.getPendingEvidence();
      if (pending.length > 0) {
        MeshLogger.info('SYNC', `Found ${pending.length} pending evidence items to sync`);

        for (const record of pending) {
          try {
            await EvidenceDatabase.updateStatus(record.id, 'uploading');

            MeshLogger.info('SYNC', `Uploading offline evidence ${record.type} for emergency ${record.emergencyId}`);
            await evidenceService.uploadEvidence({
              emergencyId: record.emergencyId,
              fileUri: record.fileUri,
              type: record.type,
              metadata: JSON.parse(record.metadata),
            });

            await EvidenceDatabase.deleteEvidence(record.id);

            // Clean up the local cached file to free storage space
            try {
              await FileSystem.deleteAsync(record.fileUri, { idempotent: true });
              MeshLogger.info('SYNC', `Deleted local cached file: ${record.fileUri}`);
            } catch (fileError) {
              MeshLogger.warn('SYNC', `Failed to delete local file: ${record.fileUri}`, { error: String(fileError) });
            }

            synced++;
          } catch (uploadError) {
            MeshLogger.warn('SYNC', 'Evidence upload failed', {
              rowId: record.id,
              error: String(uploadError),
            });
            await EvidenceDatabase.incrementRetry(record.id);
            failed++;
          }
        }
      }
    } catch (error) {
      MeshLogger.error('SYNC', 'Evidence sync failed', { error: String(error) });
    }
    return { synced, failed };
  },
};
