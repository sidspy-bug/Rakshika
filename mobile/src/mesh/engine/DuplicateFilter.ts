/**
 * Duplicate Filter — Bloom filter + SQLite seen-set for O(1) dedup.
 */

import { MeshDatabase } from '../storage/MeshDatabase';
import { MeshLogger } from '../logging/MeshLogger';

// Simple bloom filter using bit array
const BLOOM_SIZE = 8192; // bits
const BLOOM_HASHES = 5;
const bloomBits = new Uint8Array(BLOOM_SIZE / 8);

function hashString(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BLOOM_SIZE;
}

function bloomAdd(packetId: string): void {
  for (let i = 0; i < BLOOM_HASHES; i++) {
    const bit = hashString(packetId, i * 31337);
    bloomBits[Math.floor(bit / 8)] |= 1 << (bit % 8);
  }
}

function bloomMayContain(packetId: string): boolean {
  for (let i = 0; i < BLOOM_HASHES; i++) {
    const bit = hashString(packetId, i * 31337);
    if (!(bloomBits[Math.floor(bit / 8)] & (1 << (bit % 8)))) {
      return false;
    }
  }
  return true;
}

export const DuplicateFilter = {
  /**
   * Check if a packet has been seen before.
   * Uses bloom filter for fast rejection, falls back to SQLite for confirmation.
   */
  async isDuplicate(packetId: string): Promise<boolean> {
    // Fast path: bloom filter says definitely not seen
    if (!bloomMayContain(packetId)) {
      return false;
    }
    // Bloom says maybe — confirm with SQLite
    return MeshDatabase.hasSeen(packetId);
  },

  /**
   * Mark a packet as seen in both bloom filter and SQLite.
   */
  async markSeen(packetId: string): Promise<void> {
    bloomAdd(packetId);
    await MeshDatabase.markSeen(packetId);
    MeshLogger.debug('ENGINE', 'Packet marked as seen', { packetId });
  },

  /**
   * Reset the bloom filter (SQLite seen-set persists).
   */
  reset(): void {
    bloomBits.fill(0);
  },
};
