/**
 * Volunteer API Service
 *
 * Handles all volunteer-related API calls.
 * Uses mock fallback mode matching the existing firebaseAuth.ts pattern
 * when the backend is unavailable.
 */

import { api } from "./api";
import type {
  VolunteerProfile,
  VolunteerRegistrationData,
  AvailabilityStatus,
  VerificationStatus,
} from "../types/volunteer";

// ─── Mock Mode Detection ─────────────────────────────────

function isMockMode(): boolean {
  const token = localStorage.getItem("access_token");
  return Boolean(token && token.startsWith("mock-token"));
}

// ─── Mock Data Helpers ───────────────────────────────────

function getMockVolunteerProfile(): VolunteerProfile | null {
  const stored = localStorage.getItem("rakshika_volunteer_profile");
  return stored ? JSON.parse(stored) : null;
}

function saveMockVolunteerProfile(profile: VolunteerProfile): void {
  localStorage.setItem("rakshika_volunteer_profile", JSON.stringify(profile));
}

// ─── API Functions ───────────────────────────────────────

export const volunteerApi = {
  /**
   * Register a new volunteer with the backend.
   * Creates the volunteer profile record after Firebase auth registration.
   */
  async registerVolunteer(
    data: Omit<VolunteerRegistrationData, "password">
  ): Promise<VolunteerProfile> {
    if (isMockMode()) {
      const profile: VolunteerProfile = {
        id: `vol-${Date.now()}`,
        uid: `mock-uid-${data.email}`,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        organization: data.organization,
        volunteerType: data.volunteerType,
        verificationStatus: "PENDING",
        availability: "OFFLINE",
        guidelinesAcknowledged: false,
        responseCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveMockVolunteerProfile(profile);
      return profile;
    }

    const response = await api.post<VolunteerProfile>(
      "/volunteers/register",
      data
    );
    return response.data;
  },

  /**
   * Fetch the current volunteer's profile.
   */
  async getVolunteerProfile(): Promise<VolunteerProfile> {
    if (isMockMode()) {
      const profile = getMockVolunteerProfile();
      if (!profile) {
        throw new Error("Volunteer profile not found");
      }
      return profile;
    }

    const response = await api.get<VolunteerProfile>("/volunteers/me");
    return response.data;
  },

  /**
   * Update the current volunteer's profile.
   */
  async updateVolunteerProfile(
    data: Partial<VolunteerProfile>
  ): Promise<VolunteerProfile> {
    if (isMockMode()) {
      const existing = getMockVolunteerProfile();
      if (!existing) {
        throw new Error("Volunteer profile not found");
      }
      const updated: VolunteerProfile = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveMockVolunteerProfile(updated);
      return updated;
    }

    const response = await api.put<VolunteerProfile>("/volunteers/me", data);
    return response.data;
  },

  /**
   * Get the current volunteer's verification status.
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    if (isMockMode()) {
      const profile = getMockVolunteerProfile();
      return profile?.verificationStatus ?? "PENDING";
    }

    const response = await api.get<{ status: VerificationStatus }>(
      "/volunteers/me/verification"
    );
    return response.data.status;
  },

  /**
   * Update the volunteer's availability status.
   */
  async updateAvailability(
    status: AvailabilityStatus
  ): Promise<VolunteerProfile> {
    if (isMockMode()) {
      const existing = getMockVolunteerProfile();
      if (!existing) {
        throw new Error("Volunteer profile not found");
      }
      const updated: VolunteerProfile = {
        ...existing,
        availability: status,
        updatedAt: new Date().toISOString(),
      };
      saveMockVolunteerProfile(updated);
      return updated;
    }

    const response = await api.put<VolunteerProfile>(
      "/volunteers/me/availability",
      { status }
    );
    return response.data;
  },

  /**
   * Acknowledge safety guidelines.
   */
  async acknowledgeGuidelines(): Promise<void> {
    if (isMockMode()) {
      const existing = getMockVolunteerProfile();
      if (existing) {
        const updated: VolunteerProfile = {
          ...existing,
          guidelinesAcknowledged: true,
          updatedAt: new Date().toISOString(),
        };
        saveMockVolunteerProfile(updated);
      }
      return;
    }

    await api.post("/volunteers/me/guidelines-ack");
  },
};
