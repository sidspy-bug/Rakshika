/**
 * BLE Constants
 *
 * Service and characteristic UUIDs for the Rakshika mesh relay BLE protocol.
 * Uses a custom 128-bit UUID base to avoid collisions with standard BLE services.
 *
 * UUID Base: RKSH0000-MESH-4E4D-8B3A-RELAY0000000
 */

// ─── Service UUIDs ─────────────────────────────────────────────────────────────

/**
 * Primary mesh relay service UUID.
 * Advertised by devices with pending emergency packets.
 */
export const MESH_SERVICE_UUID = 'rksh0001-mesh-4e4d-8b3a-re1a00000000';

// ─── Characteristic UUIDs ──────────────────────────────────────────────────────

/**
 * Emergency packet characteristic (Read + Notify).
 * Contains the serialized binary mesh packet.
 * Scanners read this to receive emergency packets.
 */
export const PACKET_CHARACTERISTIC_UUID = 'rksh0002-mesh-4e4d-8b3a-re1a00000000';

/**
 * Packet acknowledgment characteristic (Write).
 * Scanners write to this to confirm packet receipt,
 * allowing the advertiser to track relay success.
 */
export const ACK_CHARACTERISTIC_UUID = 'rksh0003-mesh-4e4d-8b3a-re1a00000000';

/**
 * Peer info characteristic (Read).
 * Contains a short peer identifier so devices can track
 * which peers they've exchanged packets with.
 */
export const PEER_INFO_CHARACTERISTIC_UUID = 'rksh0004-mesh-4e4d-8b3a-re1a00000000';

// ─── BLE Configuration ─────────────────────────────────────────────────────────

/** Scan interval in milliseconds */
export const BLE_SCAN_INTERVAL_MS = 5000;

/** Scan window duration in milliseconds */
export const BLE_SCAN_WINDOW_MS = 3000;

/** Advertising interval in milliseconds (Android) */
export const BLE_ADVERTISE_INTERVAL_MS = 1000;

/** Connection timeout in milliseconds */
export const BLE_CONNECTION_TIMEOUT_MS = 10000;

/** Maximum number of simultaneous BLE connections */
export const BLE_MAX_CONNECTIONS = 5;

/** MTU size to negotiate (Android supports up to 517, iOS up to 512) */
export const BLE_TARGET_MTU = 512;

/** Minimum RSSI to consider a peer reachable */
export const BLE_MIN_RSSI = -85;

/** Time (ms) after which a peer is considered stale if not re-seen */
export const BLE_PEER_STALE_MS = 60000;

/**
 * Manufacturer ID used in BLE advertising data.
 * 0xFFFF is the "testing" ID per Bluetooth SIG — replace with
 * a registered ID for production.
 */
export const BLE_MANUFACTURER_ID = 0xffff;

/**
 * Advertising local name broadcast in BLE scan responses.
 * Kept short to conserve advertising bytes.
 */
export const BLE_LOCAL_NAME = 'RKSH';
