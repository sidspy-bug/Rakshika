import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { User, LoginPayload, RegisterPayload } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        const profile = await authService.getProfile();
        setUser(profile);
      }
    } catch (e) {
      console.warn("Failed to load user session", e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const loggedInUser = await authService.login(payload);
      setUser(loggedInUser);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: RegisterPayload) => {
    setLoading(true);
    try {
      const signedUpUser = await authService.signup(payload);
      setUser(signedUpUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
