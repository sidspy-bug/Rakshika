/**
 * Emergency Contact Service
 *
 * Handles CRUD operations for emergency contacts with dual-mode support:
 * - Real mode: Firestore subcollection `users/{uid}/emergency_contacts`
 * - Mock mode: localStorage-based simulation when Firebase is not configured
 *
 * All operations maintain a localStorage cache (`rakshika-emergency-contacts`)
 * for offline resilience. The SOS screen reads from this cache directly.
 */

import { auth, db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { cloudAuthService } from "./cloudAuthService";
import type {
  EmergencyContact,
  ContactFormData,
  ContactSource,
  ContactPermissionStatus,
  PhoneValidationResult,
} from "../types/emergencyContact";
import { MAX_EMERGENCY_CONTACTS, PHONE_REGEX } from "../types/emergencyContact";

/** Detects whether we are running in mock mode (no real Firebase) */
const IS_MOCK =
  !import.meta.env.VITE_FIREBASE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY === "mock-api-key-replace-me";

/** localStorage key for the emergency contacts cache */
const CACHE_KEY = "rakshika-emergency-contacts";

// ---------------------------------------------------------------------------
// Phone Validation
// ---------------------------------------------------------------------------

/**
 * Normalizes a phone string by stripping spaces, dashes, and parentheses.
 * Preserves a leading `+` for country codes.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

/**
 * Validates a phone number string and returns a normalized version.
 * Returns an error message if validation fails.
 */
export function validatePhone(phone: string): PhoneValidationResult {
  const trimmed = phone.trim();

  if (!trimmed) {
    return { isValid: false, normalized: "", error: "Phone number is required." };
  }

  if (!PHONE_REGEX.test(trimmed)) {
    return {
      isValid: false,
      normalized: "",
      error: "Enter a valid phone number (7–18 digits, optional +country code).",
    };
  }

  const normalized = normalizePhone(trimmed);
  const digitCount = normalized.replace(/\D/g, "").length;

  if (digitCount < 7) {
    return {
      isValid: false,
      normalized,
      error: "Phone number must contain at least 7 digits.",
    };
  }

  if (digitCount > 15) {
    return {
      isValid: false,
      normalized,
      error: "Phone number is too long (max 15 digits).",
    };
  }

  return { isValid: true, normalized };
}

/**
 * Checks whether a normalized phone already exists in the contacts list.
 * Optionally excludes a contact by ID (used during edit).
 */
export function isDuplicate(
  phone: string,
  existingContacts: EmergencyContact[],
  excludeId?: string
): boolean {
  const normalizedInput = normalizePhone(phone).replace(/\D/g, "");
  return existingContacts.some((c) => {
    if (excludeId && c.id === excludeId) return false;
    const normalizedExisting = normalizePhone(c.phone).replace(/\D/g, "");
    return normalizedExisting === normalizedInput;
  });
}

// ---------------------------------------------------------------------------
// Contact Picker API
// ---------------------------------------------------------------------------

/**
 * Checks whether the Contact Picker API is available in the current browser.
 * This API is primarily supported in Chrome on Android.
 */
export function checkContactPickerSupport(): ContactPermissionStatus {
  if ("contacts" in navigator && "ContactsManager" in window) {
    return "prompt";
  }
  return "unsupported";
}

/**
 * Opens the native contact picker and returns the selected contact's
 * name and first phone number. Returns null if the user cancels or
 * the contact has no phone number.
 *
 * Privacy: Only reads the single contact the user selects.
 * Does NOT access the full address book.
 */
export async function pickContact(): Promise<ContactFormData | null> {
  try {
    // The Contact Picker API is only available in secure contexts (HTTPS / localhost)
    const contacts = (navigator as any).contacts;
    if (!contacts) {
      return null;
    }

    const results = await contacts.select(["name", "tel"], { multiple: false });

    if (!results || results.length === 0) {
      return null;
    }

    const selected = results[0];
    const name =
      selected.name && selected.name.length > 0
        ? selected.name[0]
        : "";
    const phone =
      selected.tel && selected.tel.length > 0
        ? selected.tel[0]
        : "";

    if (!phone) {
      throw new Error("Selected contact does not have a phone number.");
    }

    return {
      name: name || "Unknown",
      phone,
      relationship: undefined,
    };
  } catch (err: any) {
    // User cancelled the picker — not an error
    if (err.name === "AbortError") {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// localStorage Cache Helpers
// ---------------------------------------------------------------------------

function readCache(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(contacts: EmergencyContact[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(contacts));
}

// ---------------------------------------------------------------------------
// Unique ID Generator
// ---------------------------------------------------------------------------

function generateId(): string {
  return `ec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/** Returns the Firestore collection reference for the current user's contacts */
function getCollectionRef() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated.");
  return collection(db, "users", user.uid, "emergency_contacts");
}

/**
 * Loads all emergency contacts for the current user.
 * Tries Firestore first (if authenticated and not mock), falls back to localStorage cache.
 */
export async function loadContacts(): Promise<EmergencyContact[]> {
  const isCloudActive = !IS_MOCK && cloudAuthService.isCloudSyncEnabled();
  if (!isCloudActive) {
    return readCache();
  }

  try {
    const colRef = getCollectionRef();
    const snapshot = await getDocs(colRef);
    const contacts: EmergencyContact[] = snapshot.docs.map((d) => ({
      ...(d.data() as Omit<EmergencyContact, "id">),
      id: d.id,
    }));

    // Sort by creation time (newest last)
    contacts.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Sync cache for offline access
    writeCache(contacts);
    return contacts;
  } catch (err) {
    console.warn("Firestore read deferred, using local cache:", err);
    return readCache();
  }
}

/**
 * Saves a new emergency contact. Validates, checks limits, detects duplicates,
 * then writes to Firestore + cache.
 */
export async function saveContact(
  data: ContactFormData,
  source: ContactSource,
  existingContacts: EmergencyContact[]
): Promise<EmergencyContact> {
  // Validate phone
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    throw new Error(phoneResult.error || "Invalid phone number.");
  }

  // Check max limit
  if (existingContacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new Error(
      `Maximum of ${MAX_EMERGENCY_CONTACTS} emergency contacts allowed.`
    );
  }

  // Check duplicates
  if (isDuplicate(phoneResult.normalized, existingContacts)) {
    throw new Error("This phone number is already in your emergency contacts.");
  }

  // Validate name
  if (!data.name.trim()) {
    throw new Error("Contact name is required.");
  }

  const now = new Date().toISOString();
  const id = generateId();

  const contact: EmergencyContact = {
    id,
    name: data.name.trim(),
    phone: phoneResult.normalized,
    relationship: data.relationship?.trim() || undefined,
    source,
    createdAt: now,
    updatedAt: now,
  };

  const isCloudActive = !IS_MOCK && cloudAuthService.isCloudSyncEnabled();
  if (!isCloudActive) {
    const updated = [...existingContacts, contact];
    writeCache(updated);
    return contact;
  }

  // Write to Firestore if authenticated
  try {
    const colRef = getCollectionRef();
    const docRef = doc(colRef, id);
    await setDoc(docRef, contact);

    // Update cache
    const updated = [...existingContacts, contact];
    writeCache(updated);
    return contact;
  } catch (err) {
    // Save to cache even if Firestore fails (offline resilience)
    console.error("Firestore write failed, saving to cache:", err);
    const updated = [...existingContacts, contact];
    writeCache(updated);
    return contact;
  }
}

/**
 * Updates an existing emergency contact by ID.
 */
export async function updateContact(
  id: string,
  data: ContactFormData,
  existingContacts: EmergencyContact[]
): Promise<EmergencyContact> {
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    throw new Error(phoneResult.error || "Invalid phone number.");
  }

  if (isDuplicate(phoneResult.normalized, existingContacts, id)) {
    throw new Error("This phone number is already in your emergency contacts.");
  }

  if (!data.name.trim()) {
    throw new Error("Contact name is required.");
  }

  const existing = existingContacts.find((c) => c.id === id);
  if (!existing) {
    throw new Error("Contact not found.");
  }

  const updated: EmergencyContact = {
    ...existing,
    name: data.name.trim(),
    phone: phoneResult.normalized,
    relationship: data.relationship?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };

  const isCloudActive = !IS_MOCK && cloudAuthService.isCloudSyncEnabled();
  if (!isCloudActive) {
    const newList = existingContacts.map((c) => (c.id === id ? updated : c));
    writeCache(newList);
    return updated;
  }

  try {
    const colRef = getCollectionRef();
    const docRef = doc(colRef, id);
    await updateDoc(docRef, {
      name: updated.name,
      phone: updated.phone,
      relationship: updated.relationship || null,
      updatedAt: updated.updatedAt,
    });

    const newList = existingContacts.map((c) => (c.id === id ? updated : c));
    writeCache(newList);
    return updated;
  } catch (err) {
    console.error("Firestore update failed, saving to cache:", err);
    const newList = existingContacts.map((c) => (c.id === id ? updated : c));
    writeCache(newList);
    return updated;
  }
}

/**
 * Deletes an emergency contact by ID.
 */
export async function deleteContactById(
  id: string,
  existingContacts: EmergencyContact[]
): Promise<void> {
  const newList = existingContacts.filter((c) => c.id !== id);

  const isCloudActive = !IS_MOCK && cloudAuthService.isCloudSyncEnabled();
  if (!isCloudActive) {
    writeCache(newList);
    return;
  }

  try {
    const colRef = getCollectionRef();
    const docRef = doc(colRef, id);
    await deleteDoc(docRef);
    writeCache(newList);
  } catch (err) {
    console.error("Firestore delete failed, updating cache:", err);
    writeCache(newList);
  }
}
