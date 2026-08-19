/**
 * Emergency Contact Type Definitions
 *
 * Centralized type definitions for the Emergency Contacts module.
 * Used across the service, hook, and component layers.
 */

/** Maximum number of emergency contacts a user can save */
export const MAX_EMERGENCY_CONTACTS = 5;

/**
 * Regex for validating phone numbers.
 * Accepts formats: +91 9876543210, 09876543210, 9876543210, +1-555-123-4567
 * Minimum 7 digits after stripping non-numeric characters.
 */
export const PHONE_REGEX = /^\+?[\d\s\-()]{7,18}$/;

/** Predefined relationship options for the contact form dropdown */
export const RELATIONSHIP_OPTIONS = [
  "Parent",
  "Spouse",
  "Sibling",
  "Friend",
  "Colleague",
  "Neighbor",
  "Guardian",
  "Other",
] as const;

export type Relationship = (typeof RELATIONSHIP_OPTIONS)[number];

/** How the contact was added to the list */
export type ContactSource = "contact_picker" | "manual_entry";

/** Browser Contact Picker API permission states */
export type ContactPermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/** Core emergency contact record stored in Firestore / localStorage */
export interface EmergencyContact {
  /** Unique identifier (Firestore doc ID or generated UUID) */
  id: string;
  /** Contact's full name */
  name: string;
  /** Normalized phone number (digits, optional leading +) */
  phone: string;
  /** Optional relationship to the user */
  relationship?: Relationship | string;
  /** How the contact was originally added */
  source: ContactSource;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

/** Form data shape for adding or editing a contact */
export interface ContactFormData {
  name: string;
  phone: string;
  relationship?: string;
}

/** Full state shape for the useEmergencyContacts hook */
export interface EmergencyContactsState {
  contacts: EmergencyContact[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  permissionStatus: ContactPermissionStatus;
}

/** Validation result for phone number input */
export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}
