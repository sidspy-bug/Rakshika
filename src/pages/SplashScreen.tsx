/**
 * SplashScreen
 *
 * Entry screen for Rakshika.
 * Displays branding, checks auth state, and routes accordingly:
 * - New user → Role Selection
 * - Authenticated user → User Home
 * - Authenticated volunteer (verified) → Volunteer Dashboard
 * - Authenticated volunteer (pending) → Verification Pending
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);

      // Determine routing based on auth & role
      const token = localStorage.getItem("access_token");
      const role = localStorage.getItem("rakshika_role");

      setTimeout(() => {
        if (!token) {
          // New or logged-out user
          navigate("/role-select", { replace: true });
          return;
        }

        if (role === "volunteer") {
          // Check volunteer verification status
          const volunteerRaw = localStorage.getItem("rakshika_volunteer_profile");
          if (volunteerRaw) {
            try {
              const volunteer = JSON.parse(volunteerRaw);
              if (volunteer.verificationStatus === "VERIFIED") {
                navigate("/volunteer/dashboard", { replace: true });
              } else {
                navigate("/volunteer/verification-pending", { replace: true });
              }
            } catch {
              navigate("/volunteer/verification-pending", { replace: true });
            }
          } else {
            navigate("/volunteer/verification-pending", { replace: true });
          }
          return;
        }

        if (role === "user") {
          navigate("/", { replace: true });
          return;
        }

        // Authenticated but no role selected
        navigate("/role-select", { replace: true });
      }, 500); // Exit animation duration
    }, 2000); // Minimum splash display time

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
          }}
        >
          {/* Background glow effects */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #D32F2F 0%, transparent 70%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-48 opacity-10"
            style={{ background: "linear-gradient(to top, #D32F2F, transparent)" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Shield Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#D32F2F] rounded-3xl blur-2xl opacity-40 scale-125" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/30 border border-white/10">
                <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
            </div>

            {/* App Name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl font-black text-white tracking-tight">
                Rakshika
              </h1>
              <div className="w-12 h-1 bg-[#D32F2F] rounded-full mx-auto mt-3" />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-white/60 text-sm font-medium tracking-wide text-center max-w-xs"
            >
              One SOS. Nearby Help. Faster Response.
            </motion.p>
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-16 flex flex-col items-center gap-3"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-white/40"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
