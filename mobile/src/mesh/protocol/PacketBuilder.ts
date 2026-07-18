/**
 * Packet Builder
 *
 * Serializes emergency data into a compact binary mesh packet
 * suitable for BLE transmission (≤ 512 bytes).
 *
 * Binary layout:
 * ┌──────────────────────────────────────────────────────────┐
 * │ MAGIC (2B) │ VERSION (1B) │ FLAGS (1B)                  │
 * │ PACKET_ID (16B UUID bytes)                              │
 * │ SENDER_ID (16B UUID bytes)                              │
 * │ TIMESTAMP (8B uint64 epoch ms)                          │
 * │ TTL (1B) │ HOP_COUNT (1B) │ SEVERITY (1B)               │
 * │ LATITUDE (8B float64) │ LONGITUDE (8B float64)          │
 * │ TRIGGER_TYPE (1B)                                       │
 * │ PAYLOAD_LENGTH (2B uint16)                              │
 * │ ENCRYPTED_PAYLOAD (variable, ≤ 256B)                    │
 * │ HMAC (32B SHA-256)                                      │
 * └──────────────────────────────────────────────────────────┘
 * Fixed header size: 2+1+1+16+16+8+1+1+1+8+8+1+2 = 66 bytes
 * + payload (≤256) + HMAC (32) = max ~354 bytes
 */

import * as Crypto from 'expo-crypto';
import {
  type MeshPacket,
  type MeshPacketHeader,
  type PacketPayload,
  PACKET_MAGIC,
  PACKET_VERSION,
  DEFAULT_TTL,
  PacketFlags,
  type TriggerTypeCode,
  type SeverityCode,
  triggerTypeToCode,
  severityToCode,
  MAX_PAYLOAD_SIZE,
} from './PacketTypes';
import { encryptPayload, computeHmac, bytesToBase64 } from './PacketCrypto';
import { MeshLogger } from '../logging/MeshLogger';

// ─── UUID Helpers ──────────────────────────────────────────────────────────────

/**
 * Convert a UUID string (with dashes) to 16 raw bytes.
 * e.g., "550e8400-e29b-41d4-a716-446655440000" → Uint8Array(16)
 */
function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ─── DataView Helpers ──────────────────────────────────────────────────────────

/**
 * Write a uint64 (as BigInt) into a DataView at the given offset.
 * Falls back to two uint32 writes for environments without BigInt support.
 */
function writeUint64(view: DataView, offset: number, value: number): void {
  // Split into high and low 32-bit words (big-endian)
  const high = Math.floor(value / 0x100000000);
  const low = value >>> 0;
  view.setUint32(offset, high, false);
  view.setUint32(offset + 4, low, false);
}

// ─── Builder ───────────────────────────────────────────────────────────────────

export interface BuildPacketInput {
  /** UUID of the user triggering SOS */
  senderId: string;
  /** Trigger type string: 'tap', 'shake', 'button', 'voice' */
  triggerType: string;
  /** Severity string: 'low', 'medium', 'high', 'critical' */
  severity: string;
  /** Latitude of the SOS location */
  latitude: number;
  /** Longitude of the SOS location */
  longitude: number;
  /** Optional additional payload data */
  payload?: PacketPayload;
}

/**
 * Generate a new UUID v4 string using expo-crypto.
 */
async function generatePacketId(): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}-${Math.random()}`,
  );
  // Format as UUID v4: 8-4-4-4-12
  const hex = hash.substring(0, 32);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16), // version 4
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20), // variant
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Build a complete mesh packet from emergency data.
 *
 * Steps:
 * 1. Generate a unique packet ID
 * 2. Encrypt the optional payload
 * 3. Serialize all fields into a binary buffer
 * 4. Compute HMAC over the entire buffer (excluding HMAC field)
 * 5. Append HMAC
 */
export async function buildPacket(input: BuildPacketInput): Promise<{
  packet: MeshPacket;
  rawBytes: Uint8Array;
  base64: string;
}> {
  const packetId = await generatePacketId();
  const timestamp = Date.now();
  const triggerCode = triggerTypeToCode(input.triggerType);
  const severityCode = severityToCode(input.severity);

  // Encrypt payload if provided
  let encryptedPayloadBytes: any = new Uint8Array(0);
  let flags = PacketFlags.NONE;

  if (input.payload) {
    const payloadJson = JSON.stringify(input.payload);
    encryptedPayloadBytes = await encryptPayload(payloadJson);
    flags |= PacketFlags.ENCRYPTED;

    if (encryptedPayloadBytes.length > MAX_PAYLOAD_SIZE) {
      MeshLogger.warn('PROTOCOL', 'Payload exceeds max size, truncating', {
        size: encryptedPayloadBytes.length,
        max: MAX_PAYLOAD_SIZE,
      });
      encryptedPayloadBytes = encryptedPayloadBytes.slice(0, MAX_PAYLOAD_SIZE);
    }
  }

  // Build header
  const header: MeshPacketHeader = {
    magic: PACKET_MAGIC,
    version: PACKET_VERSION,
    flags,
    packetId,
    senderId: input.senderId,
    timestamp,
    ttl: DEFAULT_TTL,
    hopCount: 0,
    severity: severityCode,
    latitude: input.latitude,
    longitude: input.longitude,
    triggerType: triggerCode,
  };

  // Calculate total buffer size
  const HEADER_SIZE = 66; // fixed header bytes
  const HMAC_SIZE = 32;
  const totalSize = HEADER_SIZE + encryptedPayloadBytes.length + HMAC_SIZE;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  // Magic (2B)
  view.setUint16(offset, PACKET_MAGIC, false);
  offset += 2;

  // Version (1B)
  view.setUint8(offset, PACKET_VERSION);
  offset += 1;

  // Flags (1B)
  view.setUint8(offset, flags);
  offset += 1;

  // Packet ID (16B)
  const packetIdBytes = uuidToBytes(packetId);
  bytes.set(packetIdBytes, offset);
  offset += 16;

  // Sender ID (16B)
  const senderIdBytes = uuidToBytes(input.senderId);
  bytes.set(senderIdBytes, offset);
  offset += 16;

  // Timestamp (8B)
  writeUint64(view, offset, timestamp);
  offset += 8;

  // TTL (1B)
  view.setUint8(offset, DEFAULT_TTL);
  offset += 1;

  // Hop Count (1B)
  view.setUint8(offset, 0);
  offset += 1;

  // Severity (1B)
  view.setUint8(offset, severityCode);
  offset += 1;

  // Latitude (8B float64)
  view.setFloat64(offset, input.latitude, false);
  offset += 8;

  // Longitude (8B float64)
  view.setFloat64(offset, input.longitude, false);
  offset += 8;

  // Trigger Type (1B)
  view.setUint8(offset, triggerCode);
  offset += 1;

  // Payload Length (2B)
  view.setUint16(offset, encryptedPayloadBytes.length, false);
  offset += 2;

  // Encrypted Payload (variable)
  bytes.set(encryptedPayloadBytes, offset);
  offset += encryptedPayloadBytes.length;

  // Compute HMAC over everything before the HMAC field
  const dataToSign = bytes.slice(0, offset);
  const hmac = await computeHmac(dataToSign);

  // Append HMAC (32B)
  bytes.set(hmac, offset);

  const packet: MeshPacket = {
    header,
    encryptedPayload: encryptedPayloadBytes,
    hmac,
  };

  const base64 = bytesToBase64(bytes);

  MeshLogger.info('PROTOCOL', 'Packet built', {
    packetId,
    totalSize,
    payloadSize: encryptedPayloadBytes.length,
  });

  return { packet, rawBytes: bytes, base64 };
}

/**
 * Re-serialize a packet after modifying relay fields (TTL, hopCount).
 * Used by the relay engine when forwarding a received packet.
 */
export async function repackForRelay(
  rawBytes: Uint8Array,
  newTtl: number,
  newHopCount: number,
): Promise<{ rawBytes: Uint8Array; base64: string }> {
  // Clone the buffer
  const copy = new Uint8Array(rawBytes);
  const view = new DataView(copy.buffer);

  // TTL is at offset 44 (2+1+1+16+16+8 = 44)
  view.setUint8(44, newTtl);
  // Hop count is at offset 45
  view.setUint8(45, newHopCount);

  // Recompute HMAC over the data (everything except last 32 bytes)
  const dataToSign = copy.slice(0, copy.length - 32);
  const hmac = await computeHmac(dataToSign);
  copy.set(hmac, copy.length - 32);

  return { rawBytes: copy, base64: bytesToBase64(copy) };
}
