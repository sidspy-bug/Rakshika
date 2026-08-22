/**
 * VolunteerVerificationScreen
 *
 * Detailed verification status display with visual indicators.
 * Shows different UI based on status: PENDING, VERIFIED, REJECTED, SUSPENDED.
 * For college MVP: Admin manually approves volunteers.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock,
  XCircle,
  Ban,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  Mail,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useVolunteer } from "../../store/volunteerStore";
import { volunteerApi } from "../../services/volunteerApi";
import type { VerificationStatus } from "../../types/volunteer";

const STATUS_STEPS: {
  status: VerificationStatus;
  label: string;
  description: string;
}[] = [
  { status: "PENDING", label: "Application Submitted", description: "Your volunteer application has been received" },
  { status: "PENDING", label: "Under Review", description: "An administrator is reviewing your details" },
  { status: "VERIFIED", label: "Verified", description: "You are approved as a Rakshika volunteer" },
];

export function VolunteerVerificationScreen() {
  const navigate = useNavigate();
  const { profile, setVerification } = useVolunteer();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const status: VerificationStatus =
    profile?.verificationStatus ?? "PENDING";

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

  // Determine active step index
  const getActiveStep = (): number => {
    if (status === "VERIFIED") return 2;
    return 1; // PENDING = under review
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Verification Status</h1>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 max-w-lg mx-auto w-full">
        {/* Status Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">Current Status</h2>
            <StatusBadge status={status} variant="verification" />
          </div>

          {/* Status details based on state */}
          {status === "PENDING" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Application Under Review</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Your volunteer application is being reviewed by a Rakshika administrator.
                    This typically takes a few hours during active periods.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "VERIFIED" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">Verification Complete</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    You are now a verified Rakshika volunteer. Complete the safety guidelines
                    and enable availability to start receiving emergency alerts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Application Not Approved</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Your volunteer application was not approved. Please contact the
                    administrator for details or to submit a new application.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "SUSPENDED" && (
            <div className="bg-gray-100 border border-gray-300 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Account Suspended</p>
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                    Your volunteer account has been temporarily suspended.
                    Please contact the administrator for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Verification Timeline */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6"
        >
          <h3 className="font-bold text-gray-900 mb-5">Verification Progress</h3>
          <div className="space-y-0">
            {STATUS_STEPS.map((step, index) => {
              const activeStep = getActiveStep();
              const isCompleted = index < activeStep;
              const isCurrent = index === activeStep;
              const isRejected = status === "REJECTED" && index === 2;

              return (
                <div key={index} className="flex gap-4">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500"
                          : isCurrent
                          ? "bg-amber-500 border-amber-500"
                          : isRejected
                          ? "bg-red-500 border-red-500"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <ShieldCheck className="w-4 h-4 text-white" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-white" />
                      ) : isRejected ? (
                        <XCircle className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-10 transition-colors ${
                          isCompleted ? "bg-emerald-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  {/* Step content */}
                  <div className="pb-6">
                    <p
                      className={`font-semibold text-sm ${
                        isCompleted || isCurrent
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {status === "PENDING" && (
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Checking..." : "Refresh Status"}
            </Button>
          )}

          {status === "VERIFIED" && (
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
              onClick={() => navigate("/volunteer/safety")}
            >
              Continue Setup <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {(status === "REJECTED" || status === "SUSPENDED") && (
            <Button
              variant="secondary"
              className="w-full h-12"
              onClick={() => {
                window.location.href = "mailto:admin@rakshika.com?subject=Volunteer Account Inquiry";
              }}
            >
              <Mail className="w-4 h-4 mr-2" /> Contact Administrator
            </Button>
          )}

          <p className="text-center text-xs text-gray-400">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
