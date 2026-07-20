import { useState, useEffect, useCallback } from "react";
import type {
  PermissionName,
  PermissionStatus,
  PermissionsState,
} from "../types/permissions";
import { checkContactPickerSupport } from "../services/emergencyContactService";

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    location: "prompt",
    camera: "prompt",
    microphone: "prompt",
    contacts: "prompt",
    notifications: "prompt",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Queries standard Web/Browser Permissions API
   */
  const checkAllPermissions = useCallback(async () => {
    const newState: PermissionsState = { ...permissions };

    // 1. Geolocation Access Check
    try {
      if (navigator.permissions) {
        const res = await navigator.permissions.query({ name: "geolocation" });
        newState.location = res.state as PermissionStatus;
      } else if (navigator.geolocation) {
        newState.location = "prompt";
      } else {
        newState.location = "unsupported";
      }
    } catch {
      newState.location = "prompt";
    }

    // 2. Camera Access Check
    try {
      if (navigator.permissions) {
        const res = await navigator.permissions.query({ name: "camera" as any });
        newState.camera = res.state as PermissionStatus;
      } else {
        newState.camera = "prompt";
      }
    } catch {
      // Fallback query: check if device labels are accessible (indicating granted permission)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoLabels = devices.some(
          (d) => d.kind === "videoinput" && d.label
        );
        newState.camera = hasVideoLabels ? "granted" : "prompt";
      } catch {
        newState.camera = "prompt";
      }
    }

    // 3. Microphone Access Check
    try {
      if (navigator.permissions) {
        const res = await navigator.permissions.query({ name: "microphone" as any });
        newState.microphone = res.state as PermissionStatus;
      } else {
        newState.microphone = "prompt";
      }
    } catch {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioLabels = devices.some(
          (d) => d.kind === "audioinput" && d.label
        );
        newState.microphone = hasAudioLabels ? "granted" : "prompt";
      } catch {
        newState.microphone = "prompt";
      }
    }

    // 4. Contacts Integration Support Check
    newState.contacts = checkContactPickerSupport();

    // 5. System Notifications Check
    if (!("Notification" in window)) {
      newState.notifications = "unsupported";
    } else {
      const status = Notification.permission;
      if (status === "default") {
        newState.notifications = "prompt";
      } else {
        newState.notifications = status as PermissionStatus;
      }
    }

    setPermissions(newState);
    setIsLoading(false);
  }, [permissions]);

  /**
   * Triggers the appropriate browser prompt for the selected permission
   */
  const requestPermission = useCallback(
    async (name: PermissionName) => {
      setError(null);

      switch (name) {
        case "location":
          if (!navigator.geolocation) {
            setError("GPS Geolocation is not supported by this browser.");
            return;
          }
          navigator.geolocation.getCurrentPosition(
            () => {
              checkAllPermissions();
            },
            (err) => {
              console.warn("Location prompt denied or failed:", err);
              checkAllPermissions();
            },
            { enableHighAccuracy: true, timeout: 6000 }
          );
          break;

        case "camera":
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            // Stop stream immediately to release hardware/lights
            stream.getTracks().forEach((track) => track.stop());
            checkAllPermissions();
          } catch (err: any) {
            console.warn("Camera request denied:", err);
            checkAllPermissions();
            setError("Camera access request was denied by the system.");
          }
          break;

        case "microphone":
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            stream.getTracks().forEach((track) => track.stop());
            checkAllPermissions();
          } catch (err: any) {
            console.warn("Microphone request denied:", err);
            checkAllPermissions();
            setError("Microphone access request was denied by the system.");
          }
          break;

        case "notifications":
          if (!("Notification" in window)) {
            setError("System notifications are not supported on this platform.");
            return;
          }
          try {
            await Notification.requestPermission();
            checkAllPermissions();
          } catch (err) {
            console.warn("Notifications request failed:", err);
            checkAllPermissions();
          }
          break;

        case "contacts":
          // The Contacts API prompt is triggered directly by calling contacts.select.
          // We trigger a dummy/cancelled request to display permission prompt to users.
          try {
            const contacts = (navigator as any).contacts;
            if (contacts) {
              await contacts.select(["name"], { multiple: false });
              checkAllPermissions();
            } else {
              setError("Device Contact Picker is not supported on this platform.");
            }
          } catch (err: any) {
            // AbortError is expected if user cancels, but prompt was still shown
            checkAllPermissions();
            if (err.name !== "AbortError") {
              setError("Contact Picker request failed.");
            }
          }
          break;

        default:
          break;
      }
    },
    [checkAllPermissions]
  );

  // Sync state on mount and when app refocuses/becomes visible (handling settings adjustment)
  useEffect(() => {
    checkAllPermissions();

    const handleFocus = () => {
      checkAllPermissions();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [checkAllPermissions]);

  return {
    permissions,
    isLoading,
    error,
    requestPermission,
    checkAllPermissions,
    clearError: () => setError(null),
  };
}
