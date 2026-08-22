/**
 * VolunteerSafetyScreen
 *
 * Safety guidelines that volunteers must acknowledge before accessing
 * the dashboard. Covers DO / DO NOT guidelines with clear visual hierarchy.
 * Requires [I UNDERSTAND] acknowledgement.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useVolunteer } from "../../store/volunteerStore";
import { volunteerApi } from "../../services/volunteerApi";

const DO_GUIDELINES = [
  "Maintain personal safety at all times",
  "Contact campus security when necessary",
  "Follow campus emergency procedures",
  "Keep a safe distance from dangerous situations",
  "Contact official emergency services (112) when required",
  "Report your status through the app accurately",
  "Carry your phone with sufficient battery",
];

const DONT_GUIDELINES = [
  "Confront an attacker or aggressor",
  "Enter dangerous areas alone",
  "Handle weapons or dangerous objects",
  "Attempt actions beyond your training",
  "Put yourself at risk to help others",
  "Share victim's personal information",
  "Ignore your own safety boundaries",
];

export function VolunteerSafetyScreen() {
  const navigate = useNavigate();
  const { setGuidelinesAck } = useVolunteer();
  const [isLoading, setIsLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAcknowledge = async () => {
    setIsLoading(true);
    try {
      await volunteerApi.acknowledgeGuidelines();
      setGuidelinesAck(true);
      navigate("/volunteer/permissions", { replace: true });
    } catch (err) {
      console.error("Failed to acknowledge guidelines:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Safety Guidelines</h1>
            <p className="text-xs text-gray-500">Required before activation</p>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full"
        onScroll={handleScroll}
      >
        {/* Important Notice */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Your Safety Comes First</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                As a Rakshika volunteer, your primary responsibility is your own safety.
                Please read and understand these guidelines carefully before proceeding.
              </p>
            </div>
          </div>
        </motion.div>

        {/* DO Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-4"
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-emerald-700">DO</span>
          </h2>
          <div className="space-y-3">
            {DO_GUIDELINES.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* DON'T Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6"
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-red-700">DO NOT</span>
          </h2>
          <div className="space-y-3">
            {DONT_GUIDELINES.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Emergency Services Reminder */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-800 text-sm">Remember</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Volunteers supplement — but never replace — official emergency services.
                Always call <strong>112</strong> for serious emergencies. Your role is to
                provide initial assistance and reassurance until professional help arrives.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
            onClick={handleAcknowledge}
            disabled={isLoading || !hasScrolledToBottom}
          >
            {isLoading ? (
              "Saving..."
            ) : !hasScrolledToBottom ? (
              "Scroll down to continue"
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 mr-2" /> I Understand
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          {!hasScrolledToBottom && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Please read all guidelines before proceeding
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
