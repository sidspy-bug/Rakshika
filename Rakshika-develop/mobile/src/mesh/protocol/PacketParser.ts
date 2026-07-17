/**
 * Packet Parser
 *
 * Deserializes raw binary data received via BLE back into a
 * structured MeshPacket. Validates magic bytes, version, and HMAC.
 */

import {
  type MeshPacket,
  type MeshPacketHeader,
  type SeverityCode,
  type TriggerTypeCode,
  PACKET_MAGIC,
  PACKET_VERSION,
} from './PacketTypes';
import { verifyHmac, HMAC_SIZE, base64ToBytes, bytesToHex } from './PacketCrypto';
import { MeshLogger } from '../logging/MeshLogger';

// ─── UUID Helpers ──────────────────────────────────────────────────────────────

/**
 * Convert 16 raw bytes back to a UUID string with dashes.
 */
function bytesToUuid(bytes: Uint8Array): string {
  const hex = bytesToHex(bytes);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

// ─── DataView Helpers ──────────────────────────────────────────────────────────

/**
 * Read a uint64 from a DataView at the given offset.
 */
function readUint64(view: DataView, offset: number): number {
  const high = view.getUint32(offset, false);
  const low = view.getUint32(offset + 4, false);
  return high * 0x100000000 + low;
}

// ─── Parser ────────────────────────────────────────────────────────────────────

export interface ParseResult {
  success: boolean;
  packet?: MeshPacket;
  error?: string;
  hmacValid?: boolean;
}

/**
 * Parse raw bytes into a MeshPacket.
 *
 * Validates:
 * 1. Minimum size (66 header + 32 HMAC = 98 bytes)
 * 2. Magic bytes
 * 3. Protocol version
 * 4. HMAC integrity
 */
export async function parsePacket(rawBytes: Uint8Array): Promise<ParseResult> {
  const HEADER_SIZE = 66;
  const MIN_SIZE = HEADER_SIZE + HMAC_SIZE; // 98 bytes

  // Size check
  if (rawBytes.length < MIN_SIZE) {
    MeshLogger.warn('PROTOCOL', 'Packet too small', { size: rawBytes.length, min: MIN_SIZE });
    return { success: false, error: `Packet too small: ${rawBytes.length} < ${MIN_SIZE}` };
  }

  const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
  let offset = 0;

  // Magic (2B)
  const magic = view.getUint16(offset, false);
  offset += 2;
  if (magic !== PACKET_MAGIC) {
    MeshLogger.warn('PROTOCOL', 'Invalid magic bytes', {
      expected: PACKET_MAGIC.toString(16),
      got: magic.toString(16),
    });
    return { success: false, error: `Invalid magic: 0x${magic.toString(16)}` };
  }

  // Version (1B)
  const version = view.getUint8(offset);
  offset += 1;
  if (version !== PACKET_VERSION) {
    MeshLogger.warn('PROTOCOL', 'Unsupported version', { version });
    return { success: false, error: `Unsupported version: ${version}` };
  }

  // Flags (1B)
  const flags = view.getUint8(offset);
  offset += 1;

  // Packet ID (16B)
  const packetIdBytes = rawBytes.slice(offset, offset + 16);
  const packetId = bytesToUuid(packetIdBytes);
  offset += 16;

  // Sender ID (16B)
  const senderIdBytes = rawBytes.slice(offset, offset + 16);
  const senderId = bytesToUuid(senderIdBytes);
  offset += 16;

  // Timestamp (8B)
  const timestamp = readUint64(view, offset);
  offset += 8;

  // TTL (1B)
  const ttl = view.getUint8(offset);
  offset += 1;

  // Hop Count (1B)
  const hopCount = view.getUint8(offset);
  offset += 1;

  // Severity (1B)
  const severity = view.getUint8(offset) as SeverityCode;
  offset += 1;

  // Latitude (8B)
  const latitude = view.getFloat64(offset, false);
  offset += 8;

  // Longitude (8B)
  const longitude = view.getFloat64(offset, false);
  offset += 8;

  // Trigger Type (1B)
  const triggerType = view.getUint8(offset) as TriggerTypeCode;
  offset += 1;

  // Payload Length (2B)
  const payloadLength = view.getUint16(offset, false);
  offset += 2;

  // Validate payload length
  if (offset + payloadLength + HMAC_SIZE !== rawBytes.length) {
    MeshLogger.warn('PROTOCOL', 'Payload length mismatch', {
      declared: payloadLength,
      remaining: rawBytes.length - offset - HMAC_SIZE,
    });
    return { success: false, error: 'Payload length mismatch' };
  }

  // Encrypted Payload (variable)
  const encryptedPayload = rawBytes.slice(offset, offset + payloadLength);
  offset += payloadLength;

  // HMAC (32B)
  const hmac = rawBytes.slice(offset, offset + HMAC_SIZE);

  // Verify HMAC
  const dataToVerify = rawBytes.slice(0, offset);
  const hmacValid = await verifyHmac(dataToVerify, hmac);

  if (!hmacValid) {
    MeshLogger.warn('PROTOCOL', 'HMAC verification failed', { packetId });
    // We still return the parsed packet but flag HMAC as invalid
    // The relay engine may choose to drop or forward it
  }

  const header: MeshPacketHeader = {
    magic,
    version,
    flags,
    packetId,
    senderId,
    timestamp,
    ttl,
    hopCount,
    severity,
    latitude,
    longitude,
    triggerType,
  };

  const packet: MeshPacket = {
    header,
    encryptedPayload,
    hmac,
  };

  MeshLogger.info('PROTOCOL', 'Packet parsed', {
    packetId,
    senderId,
    ttl,
    hopCount,
    hmacValid,
  });

  return { success: true, packet, hmacValid };
}

/**
 * Parse a Base64-encoded packet string.
 */
export async function parseBase64Packet(base64: string): Promise<ParseResult> {
  try {
    const bytes = base64ToBytes(base64);
    return parsePacket(bytes);
  } catch (error) {
    MeshLogger.error('PROTOCOL', 'Failed to decode base64 packet', { error: String(error) });
    return { success: false, error: `Base64 decode failed: ${String(error)}` };
  }
}
