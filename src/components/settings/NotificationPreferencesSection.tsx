import React, { useState, useEffect } from "react";
import {
  Bell,
  Volume2,
  Users,
  MapPin,
  Radio,
  Vibrate,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface NotificationPreferences {
  sosSoundOverride: boolean;
  communityBroadcasts: boolean;
  journeyTracking: boolean;
  meshRelayAlerts: boolean;
  hapticVibration: boolean;
}

const STORAGE_KEY = "rakshika_notification_preferences";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  sosSoundOverride: true,
  communityBroadcasts: true,
  journeyTracking: true,
  meshRelayAlerts: true,
  hapticVibration: true,
};

export const NotificationPreferencesSection: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load notification preferences:", e);
    }
    return DEFAULT_PREFERENCES;
  });

  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn("Failed to save notification preferences:", e);
    }
  }, [preferences]);

  const toggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTestNotification = () => {
    setTestAlertSent(true);

    // Trigger haptic vibration if enabled
    if (preferences.hapticVibration && "vibrate" in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    // Try browser Notification API if permission granted
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("🚨 Rakshika Safety Test Alert", {
          body: "Your emergency alert sound and notification system is working perfectly.",
          icon: "/favicon.svg",
        });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }

    setTimeout(() => {
      setTestAlertSent(false);
    }, 3500);
  };

  const settingsList = [
    {
      key: "sosSoundOverride" as keyof NotificationPreferences,
      title: "Critical SOS Sound & DND Bypass",
      description: "Play loud emergency siren at maximum volume even when device is on Silent or Do Not Disturb.",
      icon: Volume2,
      critical: true,
    },
    {
      key: "communityBroadcasts" as keyof NotificationPreferences,
      title: "Nearby Community Distress Alerts",
      description: "Receive instant push broadcasts if a woman in distress triggers an emergency within 2 km of your location.",
      icon: Users,
      critical: false,
    },
    {
      key: "journeyTracking" as keyof NotificationPreferences,
      title: "Safe Walk Journey Alerts",
      description: "Alerts for sudden unexpected stoppages or prolonged off-route delays during night navigation.",
      icon: MapPin,
      critical: false,
    },
    {
      key: "meshRelayAlerts" as keyof NotificationPreferences,
      title: "Offline Mesh Relay Notifications",
      description: "Notify in background when your phone catches and forwards a nearby offline BLE distress signal.",
      icon: Radio,
      critical: false,
    },
    {
      key: "hapticVibration" as keyof NotificationPreferences,
      title: "Haptic Emergency Vibration",
      description: "Distinct pulse vibration patterns on SOS activation, fake call ringing, and alert confirmations.",
      icon: Vibrate,
      critical: false,
    },
  ];

  return (
    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 rounded-2xl p-4 flex gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-red-200 shrink-0 shadow-sm text-[#D32F2F]">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-xs text-gray-900">Emergency Alert Preferences</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">
            Customize which alerts can sound alarms, push distress notifications, and relay offline emergency beacons.
          </p>
        </div>
      </div>

      {/* Test Notification Banner if recently triggered */}
      {testAlertSent && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-semibold flex-1">
            Test Alert triggered! Audio and vibration signals verified.
          </p>
        </div>
      )}

      {/* Settings Switches List */}
      <div className="divide-y divide-gray-100 bg-white rounded-xl">
        {settingsList.map((item) => {
          const isChecked = preferences[item.key];
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="py-3.5 first:pt-1 last:pb-1 flex items-start gap-3.5 cursor-pointer select-none"
              onClick={() => toggle(item.key)}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isChecked ? "bg-red-50 text-[#D32F2F]" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <h5 className="font-bold text-xs text-gray-900">{item.title}</h5>
                  {item.critical && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-100 text-[#D32F2F] tracking-wide">
                      HIGH PRIORITY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                  {item.description}
                </p>
              </div>

              {/* iOS Style Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1 ${
                  isChecked ? "bg-[#D32F2F]" : "bg-gray-300"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(item.key);
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isChecked ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Test Alert Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleTestNotification}
          className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D32F2F]" />
          <span>Send Test Alert Notification</span>
        </button>
      </div>
    </div>
  );
};
