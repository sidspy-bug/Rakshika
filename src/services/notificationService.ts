/**
 * Notification Service
 *
 * Handles push notifications and sound playback for emergency alerts.
 * Uses Web Notifications API with placeholders for native implementation.
 */

import { Capacitor } from "@capacitor/core";
import type { SOSAlert } from "../types/emergency";

export const notificationService = {
  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }
      return false;
    }

    console.log("Requesting native notification permissions");
    return true; // Placeholder for native permission
  },

  /**
   * Check if notification permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return "Notification" in window && Notification.permission === "granted";
    }

    console.log("Checking native notification permissions");
    return true; // Placeholder
  },

  /**
   * Show a high-priority emergency notification
   */
  async showEmergencyNotification(alert: SOSAlert): Promise<void> {
    const title = "🚨 URGENT: Rakshika SOS";
    const body = `Emergency reported ${
      alert.distance ? `~${Math.round(alert.distance)}m away` : "nearby"
    }. Please respond immediately.`;

    if (!Capacitor.isNativePlatform()) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon.png",
          requireInteraction: true, // Keep on screen until dismissed
        });
      }
      return;
    }

    console.log("Native Notification:", title, body);
  },

  /**
   * Play the emergency siren sound
   */
  playEmergencySound(): HTMLAudioElement | null {
    try {
      // Create audio element for web/pwa fallback
      // In a real native app, we'd use a Capacitor Native Audio plugin
      const audio = new Audio("/sounds/emergency_alert.mp3");
      audio.loop = true;
      audio.play().catch((e) => {
        // Autoplay policy might block this if user hasn't interacted with document
        console.warn("Audio autoplay blocked:", e);
      });
      return audio;
    } catch (e) {
      console.error("Failed to play emergency sound:", e);
      return null;
    }
  },

  /**
   * Stop the emergency siren sound
   */
  stopEmergencySound(audio: HTMLAudioElement | null): void {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  },

  /**
   * Register notification action types (Native only)
   */
  async registerActionTypes(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    console.log("Registering native notification action types");
  },
};

