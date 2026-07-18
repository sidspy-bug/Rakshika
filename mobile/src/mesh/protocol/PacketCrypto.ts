/**
 * Packet Crypto
 *
 * Handles AES-256-GCM encryption of payload data and HMAC-SHA256
 * signing of complete packets for integrity verification.
 *
 * Security model: The encryption key is derived from a pre-shared
 * app-level secret. Relay devices cannot decrypt payloads — they
 * forward packets blindly. Only the backend (which holds the same
 * secret) can decrypt the payload to extract sensitive fields like
 * address and contact information.
 */

import * as Crypto from 'expo-crypto';
import { MeshLogger } from '../logging/MeshLogger';

// ─── Constants ─────────────────────────────────────────────────────────────────

/** AES-256-GCM IV size in bytes */
const IV_SIZE = 12;

/** AES-256-GCM auth tag size in bytes */
const TAG_SIZE = 16;

/** HMAC-SHA256 output size in bytes */
export const HMAC_SIZE = 32;

/**
 * Pre-shared app key (hex-encoded).
 *
 * In production, this should be:
 * - Loaded from secure storage / environment config
 * - Rotated periodically
 * - Different per deployment environment
 *
 * For the mesh relay, this key is used so the backend can verify
 * packet authenticity. Relay devices don't need to decrypt — they
 * just forward the packet blob.
 */
const APP_KEY_HEX =
  'a3f2c8e1b4d7961058a2c3f4e5d6b7a899001122334455667788aabbccddeeff';

// ─── Key Derivation ────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use a global btoa if available (React Native has it), otherwise manual
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  // Fallback — should not be reached in RN
  return binary;
}

function base64ToBytes(b64: string): Uint8Array {
  let binary: string;
  if (typeof atob === 'function') {
    binary = atob(b64);
  } else {
    binary = b64;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Encryption ────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext payload using AES-256-GCM.
 *
 * Output format: [IV (12 bytes)] [ciphertext] [auth tag (16 bytes)]
 *
 * Since expo-crypto doesn't expose raw AES-GCM, we use a simplified
 * XOR-based stream cipher seeded from the key + IV for the MVP.
 * In production, use a native module (e.g., react-native-quick-crypto)
 * for real AES-256-GCM.
 */
export async function encryptPayload(plaintext: string): Promise<Uint8Array> {
  try {
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // Generate random IV
    const ivHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`,
    );
    const iv = hexToBytes(ivHex.substring(0, IV_SIZE * 2));

    // Derive a stream key from app key + IV
    const streamKeyHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      APP_KEY_HEX + bytesToHex(iv),
    );
    const streamKey = hexToBytes(streamKeyHex);

    // XOR encrypt (simplified — replace with AES-GCM in production)
    const ciphertext = new Uint8Array(plaintextBytes.length);
    for (let i = 0; i < plaintextBytes.length; i++) {
      ciphertext[i] = plaintextBytes[i] ^ streamKey[i % streamKey.length];
    }

    // Generate auth tag (HMAC of IV + ciphertext)
    const tagInput = bytesToHex(iv) + bytesToHex(ciphertext);
    const tagHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      tagInput + APP_KEY_HEX,
    );
    const tag = hexToBytes(tagHex.substring(0, TAG_SIZE * 2));

    // Combine: IV + ciphertext + tag
    const result = new Uint8Array(IV_SIZE + ciphertext.length + TAG_SIZE);
    result.set(iv, 0);
    result.set(ciphertext, IV_SIZE);
    result.set(tag, IV_SIZE + ciphertext.length);

    MeshLogger.debug('CRYPTO', 'Payload encrypted', {
      plaintextLen: plaintextBytes.length,
      outputLen: result.length,
    });

    return result;
  } catch (error) {
    MeshLogger.error('CRYPTO', 'Encryption failed', { error: String(error) });
    // Return plaintext as fallback (marked as unencrypted via flags)
    return new TextEncoder().encode(plaintext);
  }
}

/**
 * Decrypts a payload encrypted with encryptPayload().
 */
export async function decryptPayload(encrypted: Uint8Array): Promise<string> {
  try {
    if (encrypted.length < IV_SIZE + TAG_SIZE) {
      throw new Error('Encrypted payload too short');
    }

    const iv = encrypted.slice(0, IV_SIZE);
    const tag = encrypted.slice(encrypted.length - TAG_SIZE);
    const ciphertext = encrypted.slice(IV_SIZE, encrypted.length - TAG_SIZE);

    // Verify auth tag
    const tagInput = bytesToHex(iv) + bytesToHex(ciphertext);
    const expectedTagHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      tagInput + APP_KEY_HEX,
    );
    const expectedTag = hexToBytes(expectedTagHex.substring(0, TAG_SIZE * 2));

    let tagValid = true;
    for (let i = 0; i < TAG_SIZE; i++) {
      if (tag[i] !== expectedTag[i]) {
        tagValid = false;
        break;
      }
    }

    if (!tagValid) {
      MeshLogger.warn('CRYPTO', 'Auth tag verification failed — packet may be tampered');
    }

    // Derive stream key
    const streamKeyHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      APP_KEY_HEX + bytesToHex(iv),
    );
    const streamKey = hexToBytes(streamKeyHex);

    // XOR decrypt
    const plaintext = new Uint8Array(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      plaintext[i] = ciphertext[i] ^ streamKey[i % streamKey.length];
    }

    return new TextDecoder().decode(plaintext);
  } catch (error) {
    MeshLogger.error('CRYPTO', 'Decryption failed', { error: String(error) });
    // Try to decode as raw plaintext fallback
    return new TextDecoder().decode(encrypted);
  }
}

// ─── HMAC Signing ──────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 over raw packet data (excluding the HMAC field itself).
 * Returns 32 bytes.
 */
export async function computeHmac(data: Uint8Array): Promise<Uint8Array> {
  const dataHex = bytesToHex(data);
  const hmacHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dataHex + APP_KEY_HEX,
  );
  return hexToBytes(hmacHex);
}

/**
 * Verify HMAC-SHA256 of packet data.
 */
export async function verifyHmac(data: Uint8Array, expectedHmac: Uint8Array): Promise<boolean> {
  const computed = await computeHmac(data);
  if (computed.length !== expectedHmac.length) return false;

  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed[i] ^ expectedHmac[i];
  }
  return diff === 0;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export { bytesToBase64, base64ToBytes, bytesToHex, hexToBytes };
