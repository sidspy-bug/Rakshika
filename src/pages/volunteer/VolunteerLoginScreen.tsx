/**
 * VolunteerLoginScreen
 *
 * Login screen for returning volunteers.
 * Extends the existing login pattern with volunteer-specific branding.
 * After login, checks role from profile and routes accordingly.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { firebaseAuthService } from "../../services/firebaseAuth";
import { volunteerApi } from "../../services/volunteerApi";
import { useAuth } from "../../store/authStore";
import { useVolunteer } from "../../store/volunteerStore";

export function VolunteerLoginScreen() {
  const navigate = useNavigate();
  const { setAuthenticated, setRole } = useAuth();
  const { setProfile } = useVolunteer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Authenticate via Firebase
      const token = await firebaseAuthService.login(email, password);

      // 2. Fetch volunteer profile
      const profile = await volunteerApi.getVolunteerProfile();

      // 3. Update stores
      const profileRaw = localStorage.getItem("user_profile");
      const userProfile = profileRaw ? JSON.parse(profileRaw) : { email };

      setAuthenticated(token, userProfile);
      setRole("volunteer");
      setProfile(profile);

      // 4. Route based on verification status
      if (profile.verificationStatus === "VERIFIED") {
        navigate("/volunteer/dashboard", { replace: true });
      } else {
        navigate("/volunteer/verification-pending", { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please check your credentials.";
      console.error("Volunteer Login Error:", err);
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "radial-gradient(circle, #10b981, transparent)" }}
      />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "radial-gradient(circle, #14b8a6, transparent)" }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-8">
          <ShieldCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Volunteer Sign In
        </h1>
        <p className="text-gray-500 text-center mb-10">
          Sign in to your volunteer account
        </p>

        <form
          onSubmit={handleLogin}
          className="w-full space-y-5 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
        >
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <Input
            icon={<Mail className="w-5 h-5" />}
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            icon={<Lock className="w-5 h-5" />}
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full mt-4 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}{" "}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full mt-3 h-12 text-base font-bold text-gray-700"
            onClick={() => {
              localStorage.setItem("access_token", "mock-token-volunteer-demo");
              localStorage.setItem(
                "user_profile",
                JSON.stringify({
                  email: "volunteer@demo.com",
                  fullName: "Demo Volunteer",
                  phone: "+91 9876543210",
                  role: "volunteer",
                })
              );
              // Create mock volunteer profile
              const mockProfile = {
                id: "vol-demo",
                uid: "mock-uid-volunteer-demo",
                fullName: "Demo Volunteer",
                email: "volunteer@demo.com",
                phone: "+91 9876543210",
                organization: "Demo University",
                volunteerType: "STUDENT_VOLUNTEER" as const,
                verificationStatus: "PENDING" as const,
                availability: "OFFLINE" as const,
                guidelinesAcknowledged: false,
                responseCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              localStorage.setItem("rakshika_volunteer_profile", JSON.stringify(mockProfile));
              localStorage.setItem("rakshika_role", "volunteer");
              navigate("/volunteer/verification-pending", { replace: true });
            }}
          >
            Bypass Login (Demo Mode)
          </Button>
        </form>

        <p className="mt-8 text-gray-600 font-medium text-sm">
          Don't have an account?{" "}
          <Link
            to="/volunteer/register"
            className="text-emerald-600 font-bold hover:underline"
          >
            Register as Volunteer
          </Link>
        </p>

        <Link
          to="/login"
          className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign in as a User instead
        </Link>
      </div>
    </div>
  );
}
