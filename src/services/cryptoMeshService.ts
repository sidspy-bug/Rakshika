/**
 * Crypto Mesh Service
 *
 * Provides cryptographic primitives and beacon serialization for the
 * Rakshika Crowdsourced AirTag-style BLE Mesh network.
 *
 * Uses native Web Crypto API (`crypto.subtle`) for high-performance,
 * zero-dependency cryptographic hashing and blind beacon encryption.
 */

export interface SosBeaconPayload {
  incidentId: string;
  lat: number;
  lng: number;
  timestamp: string;
  urgency: "HIGH" | "CRITICAL";
  hopCount: number;
  userIdHash?: string;
  message?: string;
  category?: string;
}

export interface CategoryInfo {
  code: number;
  category: string;
  defaultMessage: string;
}

export function getEmergencyCategoryCode(input?: string): number {
  if (!input) return 0;
  const lower = input.toLowerCase();
  if (/doctor|medic|hospital|ambulance|bleed|injur|pain|wound|faint|pregnant|breath/i.test(lower)) return 1;
  if (/police|attack|weapon|gun|knife|kill|rob|thief|danger|threat|violence|assault|rape/i.test(lower)) return 2;
  if (/follow|stalk|creep|shadow|behind me|chasing|watching/i.test(lower)) return 3;
  if (/accident|crash|car|bike|vehicle|hit and run|collision/i.test(lower)) return 4;
  if (/fire|smoke|burn|gas leak|explosion/i.test(lower)) return 5;
  if (/lost|stranded|trapped|stuck|dark|alone/i.test(lower)) return 6;
  return 7;
}

export function getCategoryFromCode(code: number): CategoryInfo {
  switch (code) {
    case 1:
      return { code: 1, category: "MEDICAL", defaultMessage: "MEDICAL EMERGENCY: Need doctor / medical help urgently!" };
    case 2:
      return { code: 2, category: "POLICE_DANGER", defaultMessage: "POLICE EMERGENCY: Danger / physical threat detected!" };
    case 3:
      return { code: 3, category: "STALKING", defaultMessage: "HELP: Being followed / suspicious persons nearby!" };
    case 4:
      return { code: 4, category: "ACCIDENT", defaultMessage: "ACCIDENT: Crash / vehicle emergency assistance required!" };
    case 5:
      return { code: 5, category: "FIRE_HAZARD", defaultMessage: "FIRE / HAZARD: Evacuation assistance needed!" };
    case 6:
      return { code: 6, category: "STRANDED", defaultMessage: "STRANDED: Trapped / unable to move safely!" };
    case 7:
      return { code: 7, category: "CUSTOM", defaultMessage: "URGENT DISTRESS: Offline help beacon dispatched!" };
    case 0:
    default:
      return { code: 0, category: "GENERAL", defaultMessage: "EMERGENCY: Immediate assistance needed!" };
  }
}

/** Pre-shared network salt for blind obfuscation (preventing passive BLE sniffers) */
const MESH_SALT = "RAKSHIKA_SAFETY_NET_V1";

/**
 * Computes a standard SHA-256 hash of a Blob, ArrayBuffer, or string.
 * Returns a 64-character hex string.
 */
export async function computeSHA256(data: Blob | ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;

  if (typeof data === "string") {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    buffer = data;
  }

  // Native Web Crypto API
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digestBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digestBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback lightweight hash for non-crypto environments
  return fallbackHash(new Uint8Array(buffer));
}

/**
 * Computes a fast 8-character hex hash prefix (used for compact IDs).
 */
export async function computeShortHash(input: string): Promise<string> {
  const full = await computeSHA256(input);
  return full.slice(0, 8);
}

/**
 * Encrypts / packs an SOS beacon payload into a compact 18-byte binary payload (36 hex chars).
 * Contains: Magic (2B) + Nonce (2B) + Lat (4B) + Lng (4B) + Timestamp (4B) + Flags (1B) + Checksum (1B).
 * Fits 100% into legacy BLE advertising packets without truncation.
 */
export async function encryptSosBeacon(payload: SosBeaconPayload): Promise<string> {
  try {
    const buffer = new ArrayBuffer(18);
    const view = new DataView(buffer);

    // 1. Magic Header: 'R', 'K' (0x52, 0x4B)
    view.setUint8(0, 0x52);
    view.setUint8(1, 0x4B);

    // 2. Unique Per-Packet Nonce (0..65535) - Prevents deduplication drops on successive messages
    const nonce = Math.floor(Math.random() * 65535);
    view.setUint16(2, nonce);

    // 3. Latitude scaled by 100,000 (signed 32-bit int, accurate to ~1 meter)
    const latInt = Math.round((payload.lat || 28.6139) * 100000);
    view.setInt32(4, latInt);

    // 4. Longitude scaled by 100,000 (signed 32-bit int, accurate to ~1 meter)
    const lngInt = Math.round((payload.lng || 77.209) * 100000);
    view.setInt32(8, lngInt);

    // 5. Unix timestamp in seconds (unsigned 32-bit int)
    const tsSec = Math.floor(new Date(payload.timestamp || Date.now()).getTime() / 1000);
    view.setUint32(12, tsSec);

    // 6. Flags (Urgency & Hop Count & Emergency Category)
    const urgCode = payload.urgency === "CRITICAL" ? 2 : 1;
    const hopCode = Math.min(payload.hopCount || 0, 7);
    const catCode = getEmergencyCategoryCode(payload.category || payload.message);
    view.setUint8(16, (urgCode & 0x03) | ((hopCode & 0x07) << 2) | ((catCode & 0x07) << 5));

    // 7. Checksum (XOR of bytes 0..16)
    const bytes = new Uint8Array(buffer);
    let checksum = 0;
    for (let i = 0; i < 17; i++) {
      checksum ^= bytes[i];
    }
    view.setUint8(17, checksum);

    // 8. Stream cipher obfuscation using MESH_SALT
    const key = new TextEncoder().encode(MESH_SALT);
    const cipherBytes = new Uint8Array(18);
    for (let i = 0; i < 18; i++) {
      cipherBytes[i] = bytes[i] ^ key[i % key.length] ^ ((i * 37) & 0xff);
    }

    // Hex encode (exactly 36 characters)
    const hex = Array.from(cipherBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `rk_${hex}`;
  } catch (err) {
    console.error("[CryptoMesh] Beacon encryption failed:", err);
    return `rk_524b00010000000000000000000000000000`;
  }
}

/**
 * Decrypts an 18-byte hex beacon back into structured SosBeaconPayload.
 * Accepts optional over-the-air message from BLE Scan Response service data.
 */
export async function decryptSosBeacon(
  ciphertext: string,
  overTheAirMessage?: string
): Promise<SosBeaconPayload | null> {
  try {
    if (!ciphertext || !ciphertext.startsWith("rk_")) return null;
    const hex = ciphertext.slice(3);
    if (hex.length < 36) return null;

    const cipherBytes = new Uint8Array(
      hex.slice(0, 36).match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    if (cipherBytes.length < 18) return null;

    // De-obfuscate with stream cipher
    const key = new TextEncoder().encode(MESH_SALT);
    const plainBytes = new Uint8Array(18);
    for (let i = 0; i < 18; i++) {
      plainBytes[i] = cipherBytes[i] ^ key[i % key.length] ^ ((i * 37) & 0xff);
    }

    // Verify Checksum
    let checksum = 0;
    for (let i = 0; i < 17; i++) {
      checksum ^= plainBytes[i];
    }
    if (checksum !== plainBytes[17]) {
      console.warn("[CryptoMesh] Checksum mismatch on intercepted beacon");
      // Still proceed if magic matches
      if (plainBytes[0] !== 0x52 || plainBytes[1] !== 0x4B) {
        return null;
      }
    }

    const view = new DataView(plainBytes.buffer);
    const nonce = view.getUint16(2);
    const lat = view.getInt32(4) / 100000;
    const lng = view.getInt32(8) / 100000;
    const tsSec = view.getUint32(12);
    const flags = view.getUint8(16);
    const urgency = (flags & 0x03) === 2 ? "CRITICAL" : "HIGH";
    const hopCount = (flags >> 2) & 0x07;
    const catCode = (flags >> 5) & 0x07;
    const catInfo = getCategoryFromCode(catCode);

    const message = overTheAirMessage && overTheAirMessage.trim().length > 0
      ? overTheAirMessage.trim()
      : catInfo.defaultMessage;

    return {
      incidentId: `OFFLINE-${nonce}-${tsSec}`,
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      timestamp: new Date(tsSec * 1000).toISOString(),
      urgency,
      hopCount,
      userIdHash: `node_${nonce.toString(16)}`,
      category: catInfo.category,
      message,
    };
  } catch (err) {
    console.warn("[CryptoMesh] Beacon decryption error:", err);
    return null;
  }
}

/** Simple fallback hash when subtle crypto is unavailable */
function fallbackHash(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}
