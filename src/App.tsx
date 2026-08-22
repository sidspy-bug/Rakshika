import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <VolunteerProvider>
        <BrowserRouter>
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
            
            <Route path="*" element={<Navigate to="/splash" replace />} />
          </Routes>
        </BrowserRouter>
      </VolunteerProvider>
    </AuthProvider>
  );
}
