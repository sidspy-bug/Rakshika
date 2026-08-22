/**
 * VolunteerIntroScreen
 *
 * Explains the volunteer program before registration.
 * - Volunteers form Rakshika's community response network
 * - May receive nearby emergency alerts
 * - Can accept or decline requests
 * - Should never put themselves in danger
 * - Official emergency services remain important
 */

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Bell,
  UserCheck,
  ShieldAlert,
  Siren,
  ArrowRight,
  ArrowLeft,
  Heart,
} from "lucide-react";
import { Button } from "../../components/ui/Button";

const INFO_ITEMS = [
  {
    icon: ShieldCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    title: "Community Response Network",
    description:
      "Volunteers form Rakshika's first line of community response, providing nearby assistance during emergencies.",
  },
  {
    icon: Bell,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Receive Emergency Alerts",
    description:
      "When a nearby user activates an SOS, verified volunteers receive real-time emergency notifications.",
  },
  {
    icon: UserCheck,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    title: "Accept or Decline",
    description:
      "You always have the choice to accept or decline a response request. There is no obligation to respond.",
  },
  {
    icon: ShieldAlert,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Your Safety First",
    description:
      "Never put yourself in danger. Maintain personal safety at all times and contact official services when needed.",
  },
  {
    icon: Siren,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    title: "Official Services Matter",
    description:
      "Volunteers supplement — but do not replace — official emergency services. Always call 112 for critical emergencies.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 120 },
  },
};

export function VolunteerIntroScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-0 left-0 right-0 h-72"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,185,129,0.06) 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col px-6 py-8 max-w-lg mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8 mt-4"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20 mb-5">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            Become a <span className="text-emerald-600">Volunteer</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Help make your community safer
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3 flex-1"
        >
          {INFO_ITEMS.map((item) => (
            <motion.div
              key={item.title}
              variants={itemVariants}
              className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div
                className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0`}
              >
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-0.5">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 mt-8 pb-4"
        >
          <Button
            variant="secondary"
            className="flex-1 h-12"
            onClick={() => navigate("/role-select")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            className="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg"
            onClick={() => navigate("/volunteer/register")}
          >
            Become a Volunteer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
