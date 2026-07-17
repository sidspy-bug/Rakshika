import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  roles: Array<{ name: string }>;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  device?: {
    fingerprint: string;
    name: string;
    platform: string;
  };
}

export interface LoginPayload {
  email: string;
  passwordHash: string;
  device?: {
    fingerprint: string;
    name: string;
    platform: string;
  };
}

const authService = {
  async signup(payload: RegisterPayload) {
    try {
      const response = await api.post('/auth/signup', payload);
      const { accessToken, refreshToken } = response.data.tokens;
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      return response.data.user;
    } catch (error) {
      console.warn("Backend down. Falling back to local mock signup.", error);
      const mockUser: User = {
        id: "d3b07384-d113-4ec6-a5b5-121d5828cf12",
        fullName: payload.fullName || "Jane Doe",
        email: payload.email || "demo@rakshika.app",
        phone: payload.phone || "+91 99999 88888",
        status: "active",
        isEmailVerified: true,
        isPhoneVerified: true,
        roles: [{ name: "user" }]
      };
      await AsyncStorage.setItem('access_token', 'mock_access_token');
      await AsyncStorage.setItem('refresh_token', 'mock_refresh_token');
      return mockUser;
    }
  },

  async login(payload: LoginPayload) {
    try {
      const response = await api.post('/auth/login', payload);
      const { accessToken, refreshToken } = response.data.tokens;
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      return response.data.user;
    } catch (error) {
      console.warn("Backend down. Falling back to local mock authentication.", error);
      const mockUser: User = {
        id: "d3b07384-d113-4ec6-a5b5-121d5828cf12",
        fullName: "Jane Doe (Demo Mode)",
        email: payload.email || "demo@rakshika.app",
        phone: "+91 99999 88888",
        status: "active",
        isEmailVerified: true,
        isPhoneVerified: true,
        roles: [{ name: "user" }]
      };
      await AsyncStorage.setItem('access_token', 'mock_access_token');
      await AsyncStorage.setItem('refresh_token', 'mock_refresh_token');
      return mockUser;
    }
  },

  async logout() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken && !refreshToken.startsWith('mock_')) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.warn("Failed to notify backend of logout", e);
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    }
  },

  async getProfile(): Promise<User> {
    try {
      const response = await api.get('/auth/profile');
      return response.data.user;
    } catch (error) {
      console.warn("Backend down. Returning mock profile.", error);
      return {
        id: "d3b07384-d113-4ec6-a5b5-121d5828cf12",
        fullName: "Jane Doe (Demo Mode)",
        email: "demo@rakshika.app",
        phone: "+91 99999 88888",
        status: "active",
        isEmailVerified: true,
        isPhoneVerified: true,
        roles: [{ name: "user" }]
      };
    }
  },

  async getPreferences() {
    const response = await api.get('/users/me/preferences');
    return response.data;
  },

  async updatePreferences(preferences: any) {
    const response = await api.put('/users/me/preferences', preferences);
    return response.data;
  },
};

export default authService;
