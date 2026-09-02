/**
 * Hardware & Gesture Back Button Handler
 *
 * Intercepts Android hardware back button and system gestures to prevent
 * accidental app exits when canceling SOS, viewing history, or navigating screens.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { getActiveSos, stopSos } from "../services/sosService";
import { dispatchEngine } from "../services/dispatchEngine";

export function useHardwareBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    let backListener: any = null;

    const registerListener = async () => {
      try {
        backListener = await CapacitorApp.addListener("backButton", async ({ canGoBack }) => {
          const pathname = window.location.pathname;

          // 1. If inside SOS screen
          if (pathname === "/sos") {
            const active = getActiveSos();
            if (active) {
              // If active SOS, stop it first
              await stopSos("CANCELLED");
              dispatchEngine.clearState();
            }
            navigate("/", { replace: true });
            return;
          }

          // 2. If inside Fullscreen secondary routes (/history, /fake-call, etc.)
          if (pathname.startsWith("/history") || pathname === "/fake-call") {
            navigate("/", { replace: true });
            return;
          }

          // 3. If on root Home page or Volunteer Dashboard -> Double tap to exit
          if (pathname === "/" || pathname === "/welcome" || pathname === "/volunteer/dashboard") {
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
              CapacitorApp.exitApp();
            } else {
              lastBackPressRef.current = now;
              // Show toast or alert if possible
              console.log("[BackButton] Press back again to exit");
            }
            return;
          }

          // 4. Standard history navigation
          if (canGoBack) {
            window.history.back();
          } else {
            navigate("/", { replace: true });
          }
        });
      } catch (err) {
        console.warn("[BackButton] Listener could not be registered (Web preview mode):", err);
      }
    };

    registerListener();

    return () => {
      if (backListener && typeof backListener.remove === "function") {
        backListener.remove();
      }
    };
  }, [location, navigate]);
}
