import api from './api';

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  emergencyId?: string;
}

const locationService = {
  async sendLocationUpdate(payload: LocationUpdatePayload) {
    const response = await api.post('/location/update', payload);
    return response.data;
  },

  async getLiveLocation(emergencyId: string) {
    const response = await api.get(`/location/live/${emergencyId}`);
    return response.data;
  },

  async getSafeRoute() {
    const response = await api.get('/location/safe-route');
    return response.data;
  },
};

export default locationService;
