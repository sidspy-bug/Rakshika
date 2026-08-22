/**
 * Emergency Response API Service
 *
 * Handles backend communication for SOS alerts and volunteer responses.
 * Includes a robust mock mode for local testing without the backend.
 */

import { api } from "./api";
import type { SOSAlert, SOSResponse, DeclineReason, ResolutionType, MockAlertOptions } from "../types/emergency";
import type { ResponseState } from "../types/volunteer";
import { calculateDistance } from "../utils/geo";
import { DEFAULT_COORDS } from "../hooks/useUserLocation";

// ─── Mock Mode ───────────────────────────────────────────

function isMockMode(): boolean {
  const token = localStorage.getItem("access_token");
  return Boolean(token && token.startsWith("mock-token"));
}

// Generate a random mock SOS alert near the given coordinates
function generateMockAlert(options: MockAlertOptions, volunteerCoords = DEFAULT_COORDS): SOSAlert {
  const { distanceCategory } = options;
  
  // Base location is volunteer's current location
  let latOffset = 0;
  let lngOffset = 0;
  
  switch (distanceCategory) {
    case "VERY_CLOSE": // ~50m
      latOffset = (Math.random() - 0.5) * 0.001;
      lngOffset = (Math.random() - 0.5) * 0.001;
      break;
    case "NEARBY": // ~500m
      latOffset = (Math.random() - 0.5) * 0.01;
      lngOffset = (Math.random() - 0.5) * 0.01;
      break;
    case "FAR": // ~2km
      latOffset = (Math.random() - 0.5) * 0.04;
      lngOffset = (Math.random() - 0.5) * 0.04;
      break;
  }
  
  const alertLocation = {
    lat: volunteerCoords.lat + latOffset,
    lng: volunteerCoords.lng + lngOffset,
  };
  
  return {
    id: `sos-mock-${Date.now()}`,
    userId: `user-mock-${Math.floor(Math.random() * 1000)}`,
    userName: "Campus Resident (Mock)",
    userPhone: "+91 9999999999",
    location: alertLocation,
    timestamp: new Date().toISOString(),
    status: "PENDING",
    distance: calculateDistance(volunteerCoords, alertLocation),
  };
}

// ─── API Functions ───────────────────────────────────────

export const emergencyResponseApi = {
  /**
   * Get all active emergency alerts in the volunteer's vicinity
   */
  async getActiveAlerts(volunteerLat: number, volunteerLng: number): Promise<SOSAlert[]> {
    if (isMockMode()) {
      // Check if we have a mocked active alert in localStorage
      const storedAlert = localStorage.getItem("rakshika_mock_active_alert");
      if (storedAlert) {
        const parsedAlert = JSON.parse(storedAlert) as SOSAlert;
        if (parsedAlert.status === "PENDING" || parsedAlert.status === "ALERTED") {
          // Update distance based on current coordinates
          parsedAlert.distance = calculateDistance(
            { lat: volunteerLat, lng: volunteerLng },
            parsedAlert.location
          );
          return [parsedAlert];
        }
      }
      return [];
    }

    const response = await api.get<SOSAlert[]>("/emergency/alerts", {
      params: { lat: volunteerLat, lng: volunteerLng }
    });
    return response.data;
  },

  /**
   * Get details for a specific SOS alert
   */
  async getAlertDetails(sosId: string): Promise<SOSAlert> {
    if (isMockMode()) {
      const storedAlert = localStorage.getItem("rakshika_mock_active_alert");
      if (storedAlert) {
        const parsed = JSON.parse(storedAlert) as SOSAlert;
        if (parsed.id === sosId) return parsed;
      }
      throw new Error("Alert not found");
    }

    const response = await api.get<SOSAlert>(`/emergency/alerts/${sosId}`);
    return response.data;
  },

  /**
   * Accept an emergency response request
   */
  async acceptAlert(sosId: string): Promise<SOSResponse> {
    if (isMockMode()) {
      const storedAlert = localStorage.getItem("rakshika_mock_active_alert");
      if (storedAlert) {
        const alert = JSON.parse(storedAlert) as SOSAlert;
        alert.status = "ACCEPTED";
        localStorage.setItem("rakshika_mock_active_alert", JSON.stringify(alert));
      }

      const volunteerRaw = localStorage.getItem("rakshika_volunteer_profile");
      const volId = volunteerRaw ? JSON.parse(volunteerRaw).id : "vol-demo";

      const response: SOSResponse = {
        id: `resp-${Date.now()}`,
        sosId,
        volunteerId: volId,
        state: "ACCEPTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem("rakshika_mock_active_response", JSON.stringify(response));
      return response;
    }

    const response = await api.post<SOSResponse>(`/emergency/alerts/${sosId}/accept`);
    return response.data;
  },

  /**
   * Decline an emergency response request
   */
  async declineAlert(sosId: string, reason?: DeclineReason): Promise<void> {
    if (isMockMode()) {
      const storedAlert = localStorage.getItem("rakshika_mock_active_alert");
      if (storedAlert) {
        const alert = JSON.parse(storedAlert) as SOSAlert;
        alert.status = "DECLINED";
        localStorage.setItem("rakshika_mock_active_alert", JSON.stringify(alert));
        // We leave it in localStorage so the history can read it, but getActiveAlerts won't return it
      }
      return;
    }

    await api.post(`/emergency/alerts/${sosId}/decline`, { reason });
  },

  /**
   * Update the status of an ongoing response (e.g., ARRIVING)
   */
  async updateResponseStatus(sosId: string, state: ResponseState): Promise<SOSResponse> {
    if (isMockMode()) {
      const stored = localStorage.getItem("rakshika_mock_active_response");
      if (!stored) throw new Error("No active response found");
      
      const response = JSON.parse(stored) as SOSResponse;
      response.state = state;
      response.updatedAt = new Date().toISOString();
      
      localStorage.setItem("rakshika_mock_active_response", JSON.stringify(response));
      return response;
    }

    const res = await api.put<SOSResponse>(`/emergency/alerts/${sosId}/status`, { state });
    return res.data;
  },

  /**
   * Resolve an emergency incident
   */
  async resolveIncident(sosId: string, resolution: ResolutionType): Promise<SOSResponse> {
    if (isMockMode()) {
      const stored = localStorage.getItem("rakshika_mock_active_response");
      if (!stored) throw new Error("No active response found");
      
      const response = JSON.parse(stored) as SOSResponse;
      response.state = "RESOLVED";
      response.resolution = resolution;
      response.updatedAt = new Date().toISOString();
      
      localStorage.setItem("rakshika_mock_active_response", JSON.stringify(response));
      
      // Also update the alert status
      const storedAlert = localStorage.getItem("rakshika_mock_active_alert");
      if (storedAlert) {
        const alert = JSON.parse(storedAlert) as SOSAlert;
        alert.status = "RESOLVED";
        localStorage.setItem("rakshika_mock_active_alert", JSON.stringify(alert));
      }
      
      return response;
    }

    const res = await api.post<SOSResponse>(`/emergency/alerts/${sosId}/resolve`, { resolution });
    return res.data;
  },

  // ─── Testing Utilities ───────────────────────────────────

  /**
   * Trigger a mock SOS alert for testing purposes (Mock Mode Only)
   */
  triggerMockAlert(options: MockAlertOptions, currentLat?: number, currentLng?: number): Promise<SOSAlert> {
    return new Promise((resolve, reject) => {
      if (!isMockMode()) {
        reject(new Error("Cannot trigger mock alerts outside of mock mode"));
        return;
      }

      const delay = options.delayMs || 0;
      setTimeout(() => {
        const coords = currentLat && currentLng ? { lat: currentLat, lng: currentLng } : DEFAULT_COORDS;
        const alert = generateMockAlert(options, coords);
        localStorage.setItem("rakshika_mock_active_alert", JSON.stringify(alert));
        resolve(alert);
      }, delay);
    });
  },
  
  /**
   * Clear all mock active alerts/responses (Mock Mode Only)
   */
  clearMockState(): void {
    if (isMockMode()) {
      localStorage.removeItem("rakshika_mock_active_alert");
      localStorage.removeItem("rakshika_mock_active_response");
    }
  }
};
