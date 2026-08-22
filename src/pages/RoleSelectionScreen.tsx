/**
 * RoleSelectionScreen
 *
 * Displays two large role cards for User and Volunteer.
 * Stores role selection and navigates accordingly.
 * Does not bypass backend authorization — role is also
 * persisted server-side during registration.
 */

import { useNavigate } from "react-router-dom";
import { Shield, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../store/authStore";

export function RoleSelectionScreen() {
  const navigate = useNavigate();
  const { setRole } = useAuth();

  const handleSelectUser = () => {
    setRole("user");
    navigate("/login");
  };

  const handleSelectVolunteer = () => {
    setRole("volunteer");
    navigate("/volunteer/intro");
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #fafafa 0%, #f5f5f5 50%, #fafafa 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="absolute top-[-15%] right-[-15%] w-[400px] h-[400px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #ffcdd2 0%, transparent 70%)" }}
      />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #e8eaf6 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex-1 flex flex-col px-6 py-12 max-w-lg mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 mt-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] rounded-2xl shadow-lg shadow-red-500/20 mb-6">
            <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">
            How would you like to use{" "}
            <span className="text-[#D32F2F]">Rakshika</span>?
          </h1>
          <p className="text-gray-500 font-medium">
            Choose your role to get started
          </p>
        </motion.div>

        {/* Role Cards */}
        <div className="flex flex-col gap-5 flex-1">
          {/* User Card */}
          <motion.button
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            onClick={handleSelectUser}
            className="group relative flex items-center gap-5 p-6 bg-white rounded-3xl border-2 border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-[#D32F2F]/30 hover:shadow-[0_8px_30px_rgba(211,47,47,0.1)] transition-all duration-300 text-left active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:from-pink-100 group-hover:to-red-100 transition-colors">
              <Users className="w-8 h-8 text-[#D32F2F]" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                👩 I'm a User
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Get emergency assistance when you need it
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#D32F2F] group-hover:translate-x-1 transition-all" />
          </motion.button>

          {/* Volunteer Card */}
          <motion.button
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 100 }}
            onClick={handleSelectVolunteer}
            className="group relative flex items-center gap-5 p-6 bg-white rounded-3xl border-2 border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:border-emerald-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] transition-all duration-300 text-left active:scale-[0.98]"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:from-emerald-100 group-hover:to-teal-100 transition-colors">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                🛡️ I'm a Volunteer
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Help people nearby during emergencies
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-gray-400 mt-8"
        >
          You can change your role later from settings
        </motion.p>
      </div>
    </div>
  );
}
