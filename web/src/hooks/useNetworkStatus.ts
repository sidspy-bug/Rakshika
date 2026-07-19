import { useState, useEffect } from "react";
import { syncOfflineLocations } from "../services/offlineLocationQueue";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync queue in background when connection returns
      syncOfflineLocations().catch((err) => {
        console.error("Auto sync failed on reconnection:", err);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
