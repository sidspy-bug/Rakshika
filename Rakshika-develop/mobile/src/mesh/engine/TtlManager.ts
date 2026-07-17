/**
 * TTL Manager — Enforces time-to-live and hop counting on mesh packets.
 */

import { DEFAULT_TTL, PACKET_MAX_AGE_MS } from '../protocol/PacketTypes';
import { MeshLogger } from '../logging/MeshLogger';

export const TtlManager = {
  /**
   * Check if a packet is still valid (not expired by TTL or age).
   */
  isValid(ttl: number, timestamp: number): boolean {
    if (ttl <= 0) {
      MeshLogger.debug('ENGINE', 'Packet expired by TTL');
      return false;
    }
    const age = Date.now() - timestamp;
    if (age > PACKET_MAX_AGE_MS) {
      MeshLogger.debug('ENGINE', 'Packet expired by age', { ageMs: age });
      return false;
    }
    return true;
  },

  /**
   * Decrement TTL and increment hop count for relay forwarding.
   * Returns null if the packet cannot be relayed (TTL exhausted).
   */
  prepareForRelay(ttl: number, hopCount: number): { newTtl: number; newHopCount: number } | null {
    const newTtl = ttl - 1;
    const newHopCount = hopCount + 1;
    if (newTtl <= 0) {
      MeshLogger.info('ENGINE', 'TTL exhausted, cannot relay', { ttl, hopCount });
      return null;
    }
    return { newTtl, newHopCount };
  },

  /** Default TTL value for new packets */
  getDefaultTtl(): number {
    return DEFAULT_TTL;
  },

  /** Max age in milliseconds */
  getMaxAgeMs(): number {
    return PACKET_MAX_AGE_MS;
  },
};
