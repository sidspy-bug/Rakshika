/**
 * Volunteer / Responder Type Definitions
 *
 * Centralized type definitions for the Volunteer module.
 * Used across stores, services, screens, and components.
 */

// ─── Enums ───────────────────────────────────────────────

/** Type of volunteer within the Rakshika network */
export type VolunteerType =
  | "STUDENT_VOLUNTEER"
  | "CAMPUS_SECURITY"
  | "STAFF"
  | "AUTHORIZED_RESPONDER";

export const VOLUNTEER_TYPE_LABELS: Record<VolunteerType, string> = {
  STUDENT_VOLUNTEER: "Student Volunteer",
  CAMPUS_SECURITY: "Campus Security",
  STAFF: "Staff",
  AUTHORIZED_RESPONDER: "Authorized Responder",
};

/** Backend verification status for a volunteer */
export type VerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

/** Volunteer availability state */
export type AvailabilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "RESPONDING"
  | "OFFLINE";

/** Responder lifecycle state machine */
export type ResponseState =
  | "IDLE"
  | "ALERTED"
  | "ACCEPTED"
  | "RESPONDING"
  | "ARRIVING"
  | "ASSISTANCE_PROVIDED"
  | "RESOLVED"
  | "DECLINED"
  | "CANCELLED"
  | "ESCALATED";

/** Application-level user role */
export type AppRole = "user" | "volunteer" | null;

// ─── Interfaces ──────────────────────────────────────────

/** Volunteer profile as stored in backend / Firestore */
export interface VolunteerProfile {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  volunteerType: VolunteerType;
  verificationStatus: VerificationStatus;
  availability: AvailabilityStatus;
  guidelinesAcknowledged: boolean;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Data submitted during volunteer registration */
export interface VolunteerRegistrationData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  organization: string;
  volunteerType: VolunteerType;
}

/** Volunteer state held in the client store */
export interface VolunteerState {
  profile: VolunteerProfile | null;
  isLoading: boolean;
  error: string | null;
}

// ─── Valid State Transitions ─────────────────────────────

/** Map of valid response state transitions */
export const VALID_RESPONSE_TRANSITIONS: Record<ResponseState, ResponseState[]> = {
  IDLE: ["ALERTED"],
  ALERTED: ["ACCEPTED", "DECLINED"],
  ACCEPTED: ["RESPONDING", "CANCELLED", "ESCALATED"],
  RESPONDING: ["ARRIVING", "CANCELLED", "ESCALATED"],
  ARRIVING: ["ASSISTANCE_PROVIDED", "CANCELLED", "ESCALATED"],
  ASSISTANCE_PROVIDED: ["RESOLVED"],
  RESOLVED: ["IDLE"],
  DECLINED: ["IDLE"],
  CANCELLED: ["IDLE"],
  ESCALATED: ["IDLE"],
};

/** Check if a response state transition is valid */
export function isValidTransition(from: ResponseState, to: ResponseState): boolean {
  return VALID_RESPONSE_TRANSITIONS[from]?.includes(to) ?? false;
}
