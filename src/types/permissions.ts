import type { LucideIcon } from "lucide-react";

/** Core permission identifiers used across the app */
export type PermissionName =
  | "location"
  | "camera"
  | "microphone"
  | "contacts"
  | "notifications";

/** Unified permission status states */
export type PermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/** Detailed specification for rendering a permission item */
export interface PermissionDetail {
  name: PermissionName;
  title: string;
  description: string;
  status: PermissionStatus;
  icon: LucideIcon;
}

/** Mapping of all monitored permissions to their current statuses */
export type PermissionsState = Record<PermissionName, PermissionStatus>;
