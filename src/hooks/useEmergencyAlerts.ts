/**
 * useEmergencyAlerts Hook
 *
 * Polls for active alerts when volunteer is available.
 * Handles deduplication and triggers local notifications.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { emergencyResponseApi } from "../services/emergencyResponseApi";
import { notificationService } from "../services/notificationService";
import { useVolunteer } from "../store/volunteerStore";
import { useUserLocation } from "./useUserLocation";
import type { SOSAlert } from "../types/emergency";

const POLL_INTERVAL = 10000; // 10 seconds

export function useEmergencyAlerts() {
  const { isAvailable, isVerified } = useVolunteer();
  const { location } = useUserLocation();
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track notified alerts to prevent duplicate notifications
  const notifiedAlertsRef = useRef<Set<string>>(new Set());
  
  // Track audio element if currently playing
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAlerts = useCallback(async () => {
    // Only fetch if volunteer is verified, available, and we have location
    if (!isVerified || !isAvailable || !location) return;

    setIsLoading(true);
    setError(null);

    try {
      const alerts = await emergencyResponseApi.getActiveAlerts(
        location.lat,
        location.lng
      );
      
      setActiveAlerts(alerts);

      // Check for new alerts that need notification
      alerts.forEach((alert) => {
        if (!notifiedAlertsRef.current.has(alert.id)) {
          // Play sound and show notification
          notificationService.showEmergencyNotification(alert);
          
          if (!sirenAudioRef.current) {
            sirenAudioRef.current = notificationService.playEmergencySound();
          }

          notifiedAlertsRef.current.add(alert.id);
        }
      });
    } catch (err) {
      console.error("Failed to fetch emergency alerts:", err);
      setError("Failed to connect to emergency network");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, isVerified, location]);

  // Set up polling
  useEffect(() => {
    // Initial fetch
    fetchAlerts();

    // Set interval
    const intervalId = setInterval(fetchAlerts, POLL_INTERVAL);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchAlerts]);

  // Stop siren when unmounting or when there are no active alerts
  useEffect(() => {
    if (activeAlerts.length === 0 && sirenAudioRef.current) {
      notificationService.stopEmergencySound(sirenAudioRef.current);
      sirenAudioRef.current = null;
    }
  }, [activeAlerts.length]);

  const stopSiren = useCallback(() => {
    if (sirenAudioRef.current) {
      notificationService.stopEmergencySound(sirenAudioRef.current);
      sirenAudioRef.current = null;
    }
  }, []);

  const refreshAlerts = useCallback(() => {
    return fetchAlerts();
  }, [fetchAlerts]);

  return {
    activeAlerts,
    isLoading,
    error,
    stopSiren,
    refreshAlerts,
  };
}
