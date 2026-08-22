/**
 * VerificationPendingScreen
 *
 * Shows the current verification status for a volunteer.
 * Possible states: PENDING, VERIFIED, REJECTED, SUSPENDED
 * VERIFIED → auto-redirect to volunteer dashboard
 * PENDING → shows waiting message with option to refresh
 * REJECTED → shows reason and option to contact admin
 * SUSPENDED → shows contact admin message
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Shield,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useVolunteer } from "../../store/volunteerStore";
import { useAuth } from "../../store/authStore";
import { volunteerApi } from "../../services/volunteerApi";
import type { VerificationStatus } from "../../types/volunteer";

export function VerificationPendingScreen() {
  const navigate = useNavigate();
  const { profile, setVerification } = useVolunteer();
  const { logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const status: VerificationStatus =
    profile?.verificationStatus ?? "PENDING";

  // Auto-redirect if verified
  useEffect(() => {
    if (status === "VERIFIED") {
      const timer = setTimeout(() => {
        navigate("/volunteer/dashboard", { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const newStatus = await volunteerApi.getVerificationStatus();
      setVerification(newStatus);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Failed to refresh verification status:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [setVerification]);

  const handleLogout = async () => {
    logout();
    navigate("/role-select", { replace: true });
  };

  const statusConfig = {
    PENDING: {
      Icon: Clock,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      title: "Verification Pending",
      description:
        "Your volunteer application is being reviewed. This usually takes a few hours. You'll be notified once your verification is complete.",
      showRefresh: true,
    },
    VERIFIED: {
      Icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      title: "You're Verified! 🎉",
      description:
        "Your volunteer account has been approved. Redirecting to your dashboard...",
      showRefresh: false,
    },
    REJECTED: {
      Icon: XCircle,
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      title: "Application Rejected",
      description:
        "Unfortunately, your volunteer application was not approved at this time. Please contact the admin for more details or to re-apply.",
      showRefresh: true,
    },
    SUSPENDED: {
      Icon: Ban,
      iconColor: "text-gray-500",
      iconBg: "bg-gray-100",
      title: "Account Suspended",
      description:
        "Your volunteer account has been temporarily suspended. Please contact the administrator for assistance.",
      showRefresh: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background accents */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{
          background:
            status === "VERIFIED"
              ? "radial-gradient(circle, #10b981, transparent)"
              : status === "REJECTED"
              ? "radial-gradient(circle, #ef4444, transparent)"
              : "radial-gradient(circle, #f59e0b, transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className={`w-24 h-24 ${config.iconBg} rounded-3xl flex items-center justify-center mb-6 shadow-sm`}
        >
          <config.Icon className={`w-12 h-12 ${config.iconColor}`} />
        </motion.div>

        {/* Status Badge */}
        <StatusBadge status={status} variant="verification" size="lg" className="mb-4" />

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-black text-gray-900 text-center mb-3"
        >
          {config.title}
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-gray-500 text-center max-w-xs leading-relaxed mb-8"
        >
          {config.description}
        </motion.p>

        {/* Volunteer Info Card */}
        {profile && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">
                  {profile.fullName}
                </p>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 mb-0.5">Organization</p>
                <p className="font-semibold text-gray-700">
                  {profile.organization}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 mb-0.5">Type</p>
                <p className="font-semibold text-gray-700">
                  {profile.volunteerType.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full flex flex-col gap-3"
        >
          {config.showRefresh && (
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Checking..." : "Check Status"}
            </Button>
          )}

          {status === "VERIFIED" && (
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
              onClick={() =>
                navigate("/volunteer/dashboard", { replace: true })
              }
            >
              Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-gray-500 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>

          {/* Developer Bypass (For Local Testing Only) */}
          {status === "PENDING" && (
            <Button
              variant="ghost"
              className="w-full text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 mt-2"
              onClick={() => {
                const stored = localStorage.getItem("rakshika_volunteer_profile");
                if (stored) {
                  const p = JSON.parse(stored);
                  p.verificationStatus = "VERIFIED";
                  localStorage.setItem("rakshika_volunteer_profile", JSON.stringify(p));
                  handleRefresh();
                }
              }}
            >
              [Dev Only] Force Verify Account
            </Button>
          )}
        </motion.div>

        {/* Last checked */}
        {config.showRefresh && (
          <p className="text-xs text-gray-400 mt-4">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
