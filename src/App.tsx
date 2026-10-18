import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Radio, X, ShieldAlert } from "lucide-react";
import { AuthProvider } from "./store/authStore";
import { VolunteerProvider } from "./store/volunteerStore";
import { AppLayout } from "./components/layout/AppLayout";
import { Home } from "./pages/Home";
import { SosScreen } from "./pages/SosScreen";
import { AiChatScreen } from "./pages/AiChatScreen";
import { MapScreen } from "./pages/MapScreen";
import { LoginScreen } from "./pages/LoginScreen";
import { RegisterScreen } from "./pages/RegisterScreen";
import { CommunityScreen } from "./pages/CommunityScreen";
import { ProfileScreen } from "./pages/ProfileScreen";
import { FakeCallScreen } from "./pages/FakeCallScreen";
import { EvidenceVaultScreen } from "./pages/EvidenceVaultScreen";
import { LandingPage } from "./pages/LandingPage";
import { SplashScreen } from "./pages/SplashScreen";
import { RoleSelectionScreen } from "./pages/RoleSelectionScreen";
import { VolunteerIntroScreen } from "./pages/volunteer/VolunteerIntroScreen";
import { VolunteerRegistrationScreen } from "./pages/volunteer/VolunteerRegistrationScreen";
import { VolunteerLoginScreen } from "./pages/volunteer/VolunteerLoginScreen";
import { VerificationPendingScreen } from "./pages/volunteer/VerificationPendingScreen";
import { VolunteerVerificationScreen } from "./pages/volunteer/VolunteerVerificationScreen";
import { VolunteerSafetyScreen } from "./pages/volunteer/VolunteerSafetyScreen";
import { VolunteerPermissionsScreen } from "./pages/volunteer/VolunteerPermissionsScreen";
import { VolunteerDashboardScreen } from "./pages/volunteer/VolunteerDashboardScreen";
import { EmergencyAlertScreen } from "./pages/volunteer/EmergencyAlertScreen";
import { EmergencyMapScreen } from "./pages/volunteer/EmergencyMapScreen";
import { ActiveResponseScreen } from "./pages/volunteer/ActiveResponseScreen";
import { AlertsScreen } from "./pages/volunteer/AlertsScreen";
import { VolunteerProfileScreen } from "./pages/volunteer/VolunteerProfileScreen";
import { OfflineModeScreen } from "./pages/volunteer/OfflineModeScreen";
import { VolunteerLayout } from "./components/layout/VolunteerLayout";
import { AuthGuard, VolunteerVerifiedGuard } from "./navigation/VolunteerNavigator";

import { useAirTagMesh } from "./hooks/useAirTagMesh";
import { useHardwareBackButton } from "./hooks/useHardwareBackButton";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  // Intercept Android hardware back button and gestures to prevent accidental app exits
  useHardwareBackButton();

  return (
    <Routes>
      {/* Splash & Role Selection */}
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/role-select" element={<RoleSelectionScreen />} />

      {/* Auth Routes (User side) */}
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      {/* Volunteer Auth Routes */}
      <Route path="/volunteer/intro" element={<VolunteerIntroScreen />} />
      <Route path="/volunteer/register" element={<VolunteerRegistrationScreen />} />
      <Route path="/volunteer/login" element={<VolunteerLoginScreen />} />
      
      {/* Volunteer Setup / Verification Routes (Requires auth, but maybe not verified yet) */}
      <Route
        path="/volunteer/verification-pending"
        element={
          <AuthGuard>
            <VerificationPendingScreen />
          </AuthGuard>
        }
      />
      <Route
        path="/volunteer/verification"
        element={
          <AuthGuard>
            <VolunteerVerificationScreen />
          </AuthGuard>
        }
      />
      <Route
        path="/volunteer/safety"
        element={
          <AuthGuard>
            <VolunteerSafetyScreen />
          </AuthGuard>
        }
      />
      <Route
        path="/volunteer/permissions"
        element={
          <AuthGuard>
            <VolunteerPermissionsScreen />
          </AuthGuard>
        }
      />

      {/* Volunteer Dashboard & Core Features (requires verification) */}
      <Route
        element={
          <VolunteerVerifiedGuard>
            <VolunteerLayout />
          </VolunteerVerifiedGuard>
        }
      >
        <Route path="/volunteer/dashboard" element={<VolunteerDashboardScreen />} />
        <Route path="/volunteer/alerts" element={<AlertsScreen />} />
        <Route path="/volunteer/history" element={<AlertsScreen />} />
        <Route path="/volunteer/profile" element={<VolunteerProfileScreen />} />
      </Route>

      {/* Volunteer Full-Screen Routes (no bottom nav) */}
      <Route
        path="/volunteer/alert/:id"
        element={
          <VolunteerVerifiedGuard>
            <EmergencyAlertScreen />
          </VolunteerVerifiedGuard>
        }
      />
      <Route
        path="/volunteer/map/:id"
        element={
          <VolunteerVerifiedGuard>
            <EmergencyMapScreen />
          </VolunteerVerifiedGuard>
        }
      />
      <Route
        path="/volunteer/response/:id"
        element={
          <VolunteerVerifiedGuard>
            <ActiveResponseScreen />
          </VolunteerVerifiedGuard>
        }
      />
      <Route
        path="/volunteer/offline"
        element={
          <VolunteerVerifiedGuard>
            <OfflineModeScreen />
          </VolunteerVerifiedGuard>
        }
      />

      {/* Main App Routes with Bottom Nav (User side) */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="map" element={<MapScreen />} />
        <Route path="ai" element={<AiChatScreen />} />
        <Route path="community" element={<CommunityScreen />} />
        <Route path="profile" element={<ProfileScreen />} />
      </Route>
      
      {/* Full screen routes without bottom navigation */}
      <Route path="/sos" element={<ProtectedRoute><SosScreen /></ProtectedRoute>} />
      <Route path="/fake-call" element={<ProtectedRoute><FakeCallScreen /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><EvidenceVaultScreen /></ProtectedRoute>} />
      <Route path="/history/:id" element={<ProtectedRoute><EvidenceVaultScreen /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/splash" replace />} />
    </Routes>
  );
}

export default function App() {
  // Passively listen for crowdsourced AirTag-style BLE distress beacons in the background
  useAirTagMesh(true);

  const [interceptedAlert, setInterceptedAlert] = useState<{
    incidentId: string;
    lat?: number;
    lng?: number;
    urgency: string;
    receivedAt: string;
  } | null>(null);

  useEffect(() => {
    const handleIntercepted = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setInterceptedAlert({
          incidentId: customEvent.detail.incidentId,
          lat: customEvent.detail.lat,
          lng: customEvent.detail.lng,
          urgency: customEvent.detail.urgency || "HIGH",
          receivedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setInterceptedAlert(null);
        }, 10000);
      }
    };

    window.addEventListener("rakshika_ble_beacon_intercepted", handleIntercepted);
    return () => {
      window.removeEventListener("rakshika_ble_beacon_intercepted", handleIntercepted);
    };
  }, []);

  return (
    <AuthProvider>
      <VolunteerProvider>
        <BrowserRouter>
          {/* Global High-Visibility BLE Mesh Intercept Alert Banner */}
          {interceptedAlert && (
            <div className="fixed top-4 left-3 right-3 sm:left-6 sm:right-6 max-w-md mx-auto z-[99999] bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 rounded-2xl shadow-2xl border border-red-300/40 flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <p className="font-black text-[11px] uppercase tracking-wider text-amber-200">
                    BLE Mesh Peer SOS Intercepted!
                  </p>
                </div>
                <p className="text-xs text-white/95 font-medium mt-0.5 leading-snug">
                  Detected over-the-air Bluetooth distress beacon from nearby device. Relay to Cloud/Emergency network engaged.
                </p>
                {interceptedAlert.lat && interceptedAlert.lng && (
                  <p className="text-[10px] text-amber-100 font-mono mt-1 bg-black/25 px-2 py-0.5 rounded-md inline-block">
                    📍 Lat: {interceptedAlert.lat.toFixed(5)}, Lng: {interceptedAlert.lng.toFixed(5)} ({interceptedAlert.receivedAt})
                  </p>
                )}
              </div>
              <button
                onClick={() => setInterceptedAlert(null)}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white shrink-0 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <AppRoutes />
        </BrowserRouter>
      </VolunteerProvider>
    </AuthProvider>
  );
}
