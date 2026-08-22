/**
 * Emergency Response Type Definitions
 *
 * Centralized type definitions for SOS alerts and responses.
 */

import type { Coords } from "./gis";
import type { ResponseState } from "./volunteer";

/** Status of an SOS alert in the system */
export type AlertStatus =
  | "PENDING"
  | "ALERTED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "RESOLVED";

/** Reason for declining an SOS */
export type DeclineReason =
  | "NOT_AVAILABLE"
  | "TOO_FAR"
  | "UNABLE_TO_RESPOND"
  | "OTHER";

/** Final resolution of an emergency response */
export type ResolutionType =
  | "ASSISTANCE_PROVIDED"
  | "CAMPUS_SECURITY_TOOK_OVER"
  | "EMERGENCY_SERVICES_TOOK_OVER"
  | "USER_SAFE"
  | "FALSE_ALARM"
  | "OTHER";

/** Interface for an incoming SOS alert */
export interface SOSAlert {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  location: Coords;
  timestamp: string;
  status: AlertStatus;
  distance?: number; // Distance from current volunteer in meters
}

/** Interface for a volunteer's response to an SOS */
export interface SOSResponse {
  id: string;
  sosId: string;
  volunteerId: string;
  state: ResponseState;
  createdAt: string;
  updatedAt: string;
  resolution?: ResolutionType;
}

/** Interface for mock alert generation */
export interface MockAlertOptions {
  distanceCategory: "VERY_CLOSE" | "NEARBY" | "FAR";
  delayMs?: number;
}
