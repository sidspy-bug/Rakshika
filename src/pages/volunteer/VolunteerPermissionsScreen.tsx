/**
 * VolunteerPermissionsScreen
 *
 * Progressive permission requests with clear explanations.
 * Only requests permissions that are needed.
 * Does NOT request all permissions at once.
 */

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Bell,
  Phone,
  Bluetooth,
  ChevronLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { usePermissions } from "../../hooks/usePermissions";
import type { PermissionStatus } from "../../types/permissions";

const PERMISSION_ITEMS = [
  {
    id: "location" as const,
    icon: MapPin,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    title: "Location",
    description: "Your location helps Rakshika calculate your distance from an emergency.",
    required: true,
  },
  {
    id: "notifications" as const,
    icon: Bell,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    title: "Notifications",
    description: "Emergency alerts require notifications to reach you immediately.",
    required: true,
  },
  {
    id: "microphone" as const,
    icon: Phone,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    title: "Microphone",
    description: "Used for emergency voice communication when authorized.",
    required: false,
  },
];

const BLE_ITEM = {
  id: "bluetooth",
  icon: Bluetooth,
  iconColor: "text-indigo-600",
  iconBg: "bg-indigo-50",
  title: "Bluetooth",
  description: "Used for experimental offline communication between nearby devices.",
  required: false,
};

function StatusIcon({ status }: { status: PermissionStatus }) {
  if (status === "granted") {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  }
  if (status === "denied") {
    return <XCircle className="w-5 h-5 text-red-500" />;
  }
  return <AlertTriangle className="w-5 h-5 text-amber-500" />;
}

export function VolunteerPermissionsScreen() {
  const navigate = useNavigate();
  const { permissions, requestPermission } = usePermissions();

  const requiredGranted =
    permissions.location === "granted" &&
    permissions.notifications === "granted";

  const handleContinue = () => {
    navigate("/volunteer/dashboard", { replace: true });
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
            <h1 className="text-lg font-bold text-gray-900">Permissions</h1>
            <p className="text-xs text-gray-500">Required for emergency response</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-6 max-w-lg mx-auto w-full">
        {/* Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6"
        >
          <p className="text-sm text-blue-800 font-medium">
            Rakshika needs specific permissions to function as an emergency response platform.
            Each permission is explained below.
          </p>
        </motion.div>

        {/* Permission Cards */}
        <div className="space-y-3">
          {PERMISSION_ITEMS.map((item, index) => {
            const status = permissions[item.id];
            const isGranted = status === "granted";

            return (
              <motion.div
                key={item.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl border shadow-sm p-4 transition-colors ${
                  isGranted ? "border-emerald-200" : "border-gray-100"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 ${item.iconBg} rounded-xl flex items-center justify-center shrink-0`}
                  >
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {item.title}
                        {item.required && (
                          <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </h3>
                      <StatusIcon status={status} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">
                      {item.description}
                    </p>
                    {!isGranted && (
                      <Button
                        size="sm"
                        variant={item.required ? "default" : "secondary"}
                        className={item.required ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        onClick={() => requestPermission(item.id)}
                      >
                        {status === "denied" ? "Open Settings" : "Allow"}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* BLE item - informational only for Phase 2 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 opacity-70"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 ${BLE_ITEM.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                <BLE_ITEM.icon className={`w-5 h-5 ${BLE_ITEM.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  {BLE_ITEM.title}
                  <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    Optional
                  </span>
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-1">
                  {BLE_ITEM.description}
                </p>
                <p className="text-xs text-gray-400 italic mt-2">
                  Available in a future update
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fixed Bottom Action */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 shadow-lg disabled:opacity-50"
            onClick={handleContinue}
            disabled={!requiredGranted}
          >
            {requiredGranted ? (
              <>
                Continue to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              "Grant required permissions to continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
