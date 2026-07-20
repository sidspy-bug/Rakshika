import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />

        {/* Main App Routes with Bottom Nav */}
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
        
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
