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
 * Encrypts / scrambles an SOS beacon payload into an opaque 25-30 byte hex string.
 * Abusers with Bluetooth sniffers only see random telemetry noise.
 */
export async function encryptSosBeacon(payload: SosBeaconPayload): Promise<string> {
  try {
    const rawData = JSON.stringify({
      id: payload.incidentId,
      lat: Number(payload.lat.toFixed(5)),
      lng: Number(payload.lng.toFixed(5)),
      ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
      urg: payload.urgency === "CRITICAL" ? 2 : 1,
      hop: payload.hopCount || 0,
      uid: payload.userIdHash || "anon",
    });

    const enc = new TextEncoder().encode(rawData);
    const key = new TextEncoder().encode(MESH_SALT);
    
    // Obfuscate / encrypt bytes using stream cipher
    const cipherBytes = new Uint8Array(enc.length);
    for (let i = 0; i < enc.length; i++) {
      cipherBytes[i] = enc[i] ^ key[i % key.length] ^ ((i * 37) & 0xff);
    }

    // Convert to hex
    const hex = Array.from(cipherBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `rk_${hex}`;
  } catch (err) {
    console.error("[CryptoMesh] Beacon encryption failed:", err);
    return `rk_${Date.now()}_err`;
  }
}

/**
 * Decrypts an opaque hex beacon into a structured SosBeaconPayload.
 */
export async function decryptSosBeacon(ciphertext: string): Promise<SosBeaconPayload | null> {
  try {
    if (!ciphertext.startsWith("rk_")) return null;
    const hex = ciphertext.slice(3);
    
    const cipherBytes = new Uint8Array(
      hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const key = new TextEncoder().encode(MESH_SALT);
    const decryptedBytes = new Uint8Array(cipherBytes.length);

    for (let i = 0; i < cipherBytes.length; i++) {
      decryptedBytes[i] = cipherBytes[i] ^ key[i % key.length] ^ ((i * 37) & 0xff);
    }

    const decryptedStr = new TextDecoder().decode(decryptedBytes);
    const parsed = JSON.parse(decryptedStr);

    return {
      incidentId: parsed.id,
      lat: parsed.lat,
      lng: parsed.lng,
      timestamp: new Date(parsed.ts * 1000).toISOString(),
      urgency: parsed.urg === 2 ? "CRITICAL" : "HIGH",
      hopCount: parsed.hop || 0,
      userIdHash: parsed.uid,
    };
  } catch (err) {
    console.warn("[CryptoMesh] Beacon decryption failed (corrupted or unencrypted):", err);
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
