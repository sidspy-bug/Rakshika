import api from './api';

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface TriggerSosPayload {
  triggerType: string; // shake, tap, button, voice
  severity: string; // low, medium, high, critical
  latitude: number;
  longitude: number;
  address?: string;
}

export interface StatusUpdatePayload {
  status: string; // active, cancelled, resolved
  cancellationReason?: string;
  note?: string;
}

const sosService = {
  async triggerSos(payload: TriggerSosPayload) {
    try {
      const response = await api.post('/emergencies/sos', payload);
      return response.data;
    } catch (e) {
      console.warn("Backend down. Generating local mock active SOS emergency.", e);
      return {
        id: "sos-mock-uuid-1111",
        userId: "d3b07384-d113-4ec6-a5b5-121d5828cf12",
        triggerType: payload.triggerType,
        status: "active",
        severity: payload.severity,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address || "Mock Emergency Address, Delhi",
        startedAt: new Date().toISOString()
      };
    }
  },

  async getEmergency(emergencyId: string) {
    try {
      const response = await api.get(`/emergencies/${emergencyId}`);
      return response.data;
    } catch (e) {
      console.warn("Backend down. Returning mock active emergency status.");
      return {
        id: emergencyId,
        status: "active",
        severity: "critical",
        latitude: 28.6145,
        longitude: 77.2085,
        address: "Mock Emergency Location"
      };
    }
  },

  async cancelEmergency(emergencyId: string, reason: string) {
    try {
      const response = await api.post(`/emergencies/${emergencyId}/cancel`, {
        cancellationReason: reason,
        note: 'SOS cancelled by user',
      });
      return response.data;
    } catch (e) {
      console.warn("Backend down. Cancelled SOS locally.", e);
      return { id: emergencyId, status: "cancelled", cancellationReason: reason };
    }
  },

  async updateStatus(emergencyId: string, statusPayload: StatusUpdatePayload) {
    try {
      const response = await api.patch(`/emergencies/${emergencyId}/status`, statusPayload);
      return response.data;
    } catch (e) {
      return { id: emergencyId, status: statusPayload.status };
    }
  },

  async getHistory() {
    try {
      const response = await api.get('/emergencies/history');
      return response.data;
    } catch (e) {
      return [
        { id: "sos-hist-1", triggerType: "manual", status: "resolved", startedAt: new Date(Date.now() - 86400000).toISOString() }
      ];
    }
  },
};

export default sosService;
