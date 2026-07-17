/**
 * Mesh Packet Types & Constants
 *
 * Defines the binary packet protocol for offline mesh emergency relay.
 * Packets are designed to fit within BLE's 512-byte negotiated MTU.
 */

// ─── Packet Header Constants ───────────────────────────────────────────────────

/** Magic bytes identifying a Rakshika mesh packet (0x524B = "RK") */
export const PACKET_MAGIC = 0x524b;

/** Current protocol version */
export const PACKET_VERSION = 1;

/** Default TTL — maximum relay hops before a packet is discarded */
export const DEFAULT_TTL = 10;

/** Maximum age (ms) before a packet is considered expired (24 hours) */
export const PACKET_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Maximum size of the encrypted payload section (bytes) */
export const MAX_PAYLOAD_SIZE = 256;

/** Maximum total packet size (bytes) — must fit within BLE MTU */
export const MAX_PACKET_SIZE = 512;

// ─── Enums ─────────────────────────────────────────────────────────────────────

/** Packet flag bits (stored in FLAGS byte) */
export enum PacketFlags {
  /** No special flags */
  NONE = 0x00,
  /** Packet contains encrypted payload */
  ENCRYPTED = 0x01,
  /** Packet is a cancellation of a previous SOS */
  CANCELLATION = 0x02,
  /** Packet has been acknowledged by the backend */
  ACK = 0x04,
}

/** Trigger type encoded as a single byte */
export enum TriggerTypeCode {
  TAP = 0x01,
  SHAKE = 0x02,
  BUTTON = 0x03,
  VOICE = 0x04,
  UNKNOWN = 0xff,
}

/** Severity encoded as a single byte */
export enum SeverityCode {
  LOW = 0x01,
  MEDIUM = 0x02,
  HIGH = 0x03,
  CRITICAL = 0x04,
}

/** Status of a packet in the local SQLite queue */
export enum PacketStatus {
  /** Newly created, awaiting relay */
  PENDING = 'pending',
  /** Currently being advertised via BLE */
  ADVERTISING = 'advertising',
  /** Received from another device, stored locally */
  RECEIVED = 'received',
  /** Successfully uploaded to the backend */
  SYNCED = 'synced',
  /** Upload failed, will retry */
  RETRY = 'retry',
  /** Exceeded TTL or max age */
  EXPIRED = 'expired',
  /** Cancelled by the originating user */
  CANCELLED = 'cancelled',
}

/** Mesh relay overall status (exposed to UI via context) */
export enum MeshStatus {
  IDLE = 'idle',
  ADVERTISING = 'advertising',
  SCANNING = 'scanning',
  RELAYING = 'relaying',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
}

// ─── Interfaces ────────────────────────────────────────────────────────────────

/** The structured packet header — serialized/deserialized by PacketBuilder/Parser */
export interface MeshPacketHeader {
  magic: number;
  version: number;
  flags: number;
  packetId: string;
  senderId: string;
  timestamp: number;
  ttl: number;
  hopCount: number;
  severity: SeverityCode;
  latitude: number;
  longitude: number;
  triggerType: TriggerTypeCode;
}

/** Full mesh packet including encrypted payload and HMAC */
export interface MeshPacket {
  header: MeshPacketHeader;
  encryptedPayload: Uint8Array;
  hmac: Uint8Array;
}

/** Decrypted payload content (address + metadata) */
export interface PacketPayload {
  address?: string;
  userName?: string;
  phoneNumber?: string;
  emergencyContacts?: string[];
  additionalInfo?: string;
}

/** Record stored in the local SQLite queue */
export interface MeshPacketRecord {
  id: number;
  packetId: string;
  senderId: string;
  timestamp: number;
  ttl: number;
  hopCount: number;
  severity: string;
  latitude: number;
  longitude: number;
  triggerType: string;
  address?: string;
  status: PacketStatus;
  rawPacket: string; // Base64-encoded binary packet
  retryCount: number;
  lastRetryAt?: number;
  createdAt: number;
  updatedAt: number;
  relayedBy?: string; // UUID of the device that relayed to us
  syncedAt?: number;
}

/** Payload sent to the backend relay-upload endpoint */
export interface RelayUploadPayload {
  packetId: string;
  senderId: string;
  timestamp: string; // ISO 8601
  triggerType: string;
  severity: string;
  latitude: number;
  longitude: number;
  address?: string;
  hopCount: number;
  relayedBy: string;
  hmacSignature: string; // Base64
}

/** Discovered BLE peer information */
export interface MeshPeer {
  deviceId: string;
  rssi: number;
  lastSeen: number;
  packetIds: string[];
}

// ─── Utility Maps ──────────────────────────────────────────────────────────────

/** Convert string trigger type to enum code */
export function triggerTypeToCode(type: string): TriggerTypeCode {
  switch (type.toLowerCase()) {
    case 'tap':
      return TriggerTypeCode.TAP;
    case 'shake':
      return TriggerTypeCode.SHAKE;
    case 'button':
      return TriggerTypeCode.BUTTON;
    case 'voice':
      return TriggerTypeCode.VOICE;
    default:
      return TriggerTypeCode.UNKNOWN;
  }
}

/** Convert trigger type code back to string */
export function triggerTypeFromCode(code: TriggerTypeCode): string {
  switch (code) {
    case TriggerTypeCode.TAP:
      return 'tap';
    case TriggerTypeCode.SHAKE:
      return 'shake';
    case TriggerTypeCode.BUTTON:
      return 'button';
    case TriggerTypeCode.VOICE:
      return 'voice';
    default:
      return 'unknown';
  }
}

/** Convert string severity to enum code */
export function severityToCode(severity: string): SeverityCode {
  switch (severity.toLowerCase()) {
    case 'low':
      return SeverityCode.LOW;
    case 'medium':
      return SeverityCode.MEDIUM;
    case 'high':
      return SeverityCode.HIGH;
    case 'critical':
      return SeverityCode.CRITICAL;
    default:
      return SeverityCode.MEDIUM;
  }
}

/** Convert severity code back to string */
export function severityFromCode(code: SeverityCode): string {
  switch (code) {
    case SeverityCode.LOW:
      return 'low';
    case SeverityCode.MEDIUM:
      return 'medium';
    case SeverityCode.HIGH:
      return 'high';
    case SeverityCode.CRITICAL:
      return 'critical';
    default:
      return 'medium';
  }
}
