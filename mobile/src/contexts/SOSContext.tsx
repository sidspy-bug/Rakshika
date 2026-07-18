import React, { createContext, useState, useContext, useEffect } from 'react';
import sosService, { TriggerSosPayload } from '../services/sosService';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { useEvidence } from './EvidenceContext';

interface SOSContextType {
  activeEmergency: any | null;
  loading: boolean;
  triggerSOS: (triggerType: string) => Promise<void>;
  cancelSOS: (reason: string) => Promise<void>;
  refreshSOSState: () => Promise<void>;
}

const SOSContext = createContext<SOSContextType | undefined>(undefined);

export const SOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location, startTracking, stopTracking } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { startRecording, stopRecording } = useEvidence();
  const [activeEmergency, setActiveEmergency] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      refreshSOSState();
    } else {
      setActiveEmergency(null);
    }
  }, [isAuthenticated]);

  const refreshSOSState = async () => {
    try {
      const history = await sosService.getHistory();
      // Find the first active SOS
      const active = history.find((e: any) => e.status === 'active');
      if (active) {
        setActiveEmergency(active);
        startTracking(active.id);
      } else {
        setActiveEmergency(null);
        stopTracking();
      }
    } catch (e) {
      console.warn("Failed to refresh SOS state", e);
    }
  };

  const triggerSOS = async (triggerType: string) => {
    if (activeEmergency) return;
    
    setLoading(true);
    try {
      const lat = location?.coords.latitude || 28.6139; // default to Delhi in worst case
      const lng = location?.coords.longitude || 77.2090;

      const payload: TriggerSosPayload = {
        triggerType,
        severity: 'high',
        latitude: lat,
        longitude: lng,
        senderId: user?.id,
      };

      const emergency = await sosService.triggerSos(payload);
      setActiveEmergency(emergency);
      startTracking(emergency.id);
      
      // Start "black box" evidence recording immediately
      if (emergency && emergency.id) {
        await startRecording(emergency.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelSOS = async (reason: string) => {
    if (!activeEmergency) return;

    setLoading(true);
    try {
      // Stop evidence recording first to finalize streams and capture metrics
      await stopRecording();
      
      await sosService.cancelEmergency(activeEmergency.id, reason);
      setActiveEmergency(null);
      stopTracking();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SOSContext.Provider
      value={{
        activeEmergency,
        loading,
        triggerSOS,
        cancelSOS,
        refreshSOSState,
      }}
    >
      {children}
    </SOSContext.Provider>
  );
};

export const useSOS = () => {
  const context = useContext(SOSContext);
  if (context === undefined) {
    throw new Error('useSOS must be used within an SOSProvider');
  }
  return context;
};
