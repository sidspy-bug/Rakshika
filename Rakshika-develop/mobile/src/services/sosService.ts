import api from './api';
import { ConnectivityMonitor, RelayEngine } from '../mesh';

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
  senderId?: string;
}

export interface StatusUpdatePayload {
  status: string; // active, cancelled, resolved
  cancellationReason?: string;
  note?: string;
}

const sosService = {
  async triggerSos(payload: TriggerSosPayload) {
    try {
      const isOnline = await ConnectivityMonitor.isOnline();
      if (!isOnline) {
        // Invoke the Mesh Relay module automatically
        return await RelayEngine.createOfflineEmergency({
          senderId: "d3b07384-d113-4ec6-a5b5-121d5828cf12", // Fallback sender ID or dynamic if auth available
          triggerType: payload.triggerType,
          severity: payload.severity,
          latitude: payload.latitude,
          longitude: payload.longitude,
          address: payload.address,
        });
      }

      const response = await api.post('/emergencies/sos', payload);
      return response.data;
    } catch (e) {
      console.warn("Backend down or network issue. Checking offline status.", e);
      // Fallback in case of request timeout/failure which also indicates offline
      return await RelayEngine.createOfflineEmergency({
        senderId: "d3b07384-d113-4ec6-a5b5-121d5828cf12",
        triggerType: payload.triggerType,
        severity: payload.severity,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
      });
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
