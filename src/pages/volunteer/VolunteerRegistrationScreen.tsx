/**
 * VolunteerRegistrationScreen
 *
 * Multi-field registration form for new volunteers.
 * Fields: Full name, Phone, Email, Password, College/org, Volunteer type
 * Validation via Zod. Integrates with Firebase auth + volunteer API.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { firebaseAuthService } from "../../services/firebaseAuth";
import { volunteerApi } from "../../services/volunteerApi";
import { useAuth } from "../../store/authStore";
import { useVolunteer } from "../../store/volunteerStore";
import type { VolunteerType } from "../../types/volunteer";
import { VOLUNTEER_TYPE_LABELS } from "../../types/volunteer";

// ─── Validation ──────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,18}$/;

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  organization: string;
  volunteerType: VolunteerType;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  organization?: string;
  volunteerType?: string;
}

function validateStep1(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.fullName.trim() || data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  }
  if (data.fullName.trim().length > 100) {
    errors.fullName = "Full name must be under 100 characters";
  }
  if (!data.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!PHONE_REGEX.test(data.phone)) {
    errors.phone = "Enter a valid phone number";
  }
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "Enter a valid email address";
  }
  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
}

function validateStep2(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.organization.trim()) {
    errors.organization = "College or organization is required";
  }
  if (!data.volunteerType) {
    errors.volunteerType = "Please select a volunteer type";
  }
  return errors;
}

// ─── Component ───────────────────────────────────────────

export function VolunteerRegistrationScreen() {
  const navigate = useNavigate();
  const { setAuthenticated, setRole } = useAuth();
  const { setProfile } = useVolunteer();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    organization: "",
    volunteerType: "STUDENT_VOLUNTEER",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (step === 1) {
      const stepErrors = validateStep1(formData);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
      setErrors({});
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const stepErrors = validateStep2(formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Register with Firebase Auth
      const token = await firebaseAuthService.register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        {
          role: "volunteer",
          organization: formData.organization,
          volunteerType: formData.volunteerType,
        }
      );

      // 2. Create volunteer profile via API
      const profile = await volunteerApi.registerVolunteer({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        organization: formData.organization,
        volunteerType: formData.volunteerType,
      });

      // 3. Update auth store
      setAuthenticated(token, {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        role: "volunteer",
      });
      setRole("volunteer");

      // 4. Update volunteer store
      setProfile(profile);

      // 5. Navigate to verification pending
      navigate("/volunteer/verification-pending", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
      console.error("Volunteer Registration Error:", err);
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col px-6 py-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-50/50 to-transparent" />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col flex-1">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center mb-6 mt-4"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
          Volunteer Registration
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {step === 1
            ? "Enter your personal details"
            : "Tell us about your role"}
        </p>

        {/* Progress */}
        <div className="flex gap-2 mb-6 px-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                step >= i ? "bg-emerald-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form
          onSubmit={step === 1 ? handleNext : handleSubmit}
          className="flex-1 flex flex-col bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 flex-1"
              >
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-emerald-600" /> Personal
                  Details
                </h2>

                <Input
                  icon={<User className="w-5 h-5" />}
                  label="Full Name"
                  type="text"
                  name="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                  required
                />
                <Input
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  required
                />
                <Input
                  icon={<Mail className="w-5 h-5" />}
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                />
                <Input
                  icon={<Lock className="w-5 h-5" />}
                  label="Password"
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 flex-1"
              >
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-emerald-600" /> Role
                  Information
                </h2>

                <Input
                  icon={<Building2 className="w-5 h-5" />}
                  label="College / Organization"
                  type="text"
                  name="organization"
                  placeholder="Your college or organization"
                  value={formData.organization}
                  onChange={handleChange}
                  error={errors.organization}
                  required
                />

                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-gray-400" />
                    Volunteer Type
                  </label>
                  <select
                    name="volunteerType"
                    value={formData.volunteerType}
                    onChange={handleChange}
                    className="flex h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                  >
                    {(
                      Object.entries(VOLUNTEER_TYPE_LABELS) as [
                        VolunteerType,
                        string
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.volunteerType && (
                    <span className="text-xs text-red-500 font-medium ml-1">
                      {errors.volunteerType}
                    </span>
                  )}
                </div>

                {/* Volunteer type description */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {formData.volunteerType === "STUDENT_VOLUNTEER" &&
                      "Student volunteers are verified college students who help fellow students during emergencies on campus."}
                    {formData.volunteerType === "CAMPUS_SECURITY" &&
                      "Campus security personnel with official authorization to respond to security incidents."}
                    {formData.volunteerType === "STAFF" &&
                      "Faculty or staff members who volunteer to assist during campus emergencies."}
                    {formData.volunteerType === "AUTHORIZED_RESPONDER" &&
                      "Professionally trained responders authorized for emergency response operations."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
            {step > 1 && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 h-12"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
            )}
            {step === 1 && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 h-12"
                onClick={() => navigate("/volunteer/intro")}
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
              </Button>
            )}
            <Button
              type="submit"
              className={`flex-[2] h-12 ${
                step === 2
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              }`}
              disabled={isLoading}
            >
              {isLoading ? (
                "Creating Account..."
              ) : step === 2 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Register
                </>
              ) : (
                <>
                  Next Step <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-gray-600 font-medium text-sm">
          Already registered?{" "}
          <Link
            to="/volunteer/login"
            className="text-emerald-600 font-bold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
