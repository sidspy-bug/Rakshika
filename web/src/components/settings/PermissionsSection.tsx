import {
  MapPin,
  Camera,
  Mic,
  Users,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  HelpCircle,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import type { PermissionName, PermissionStatus } from "../../types/permissions";
import { Button } from "../ui/Button";

export function PermissionsSection() {
  const {
    permissions,
    isLoading,
    error,
    requestPermission,
    clearError,
  } = usePermissions();

  const permissionDetails = [
    {
      name: "location" as PermissionName,
      title: "GPS Location",
      description: "Allows live tracking in emergencies and coordinates for walk navigation.",
      icon: MapPin,
    },
    {
      name: "camera" as PermissionName,
      title: "Camera Hardware",
      description: "Allows streaming video evidence directly to secure cloud vaults during SOS.",
      icon: Camera,
    },
    {
      name: "microphone" as PermissionName,
      title: "Microphone Access",
      description: "Records audio evidence and triggers voice-activated alerts.",
      icon: Mic,
    },
    {
      name: "contacts" as PermissionName,
      title: "Contact Picker",
      description: "Allows quick import of trusted emergency contacts from your address book.",
      icon: Users,
    },
    {
      name: "notifications" as PermissionName,
      title: "Push Notifications",
      description: "Required for receiving immediate safety broadcast updates in your area.",
      icon: Bell,
    },
  ];

  /** Renders the state badge for each permission */
  const renderStatusBadge = (status: PermissionStatus) => {
    switch (status) {
      case "granted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Blocked
          </span>
        );
      case "unsupported":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Unsupported
          </span>
        );
      case "prompt":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <HelpCircle className="w-3.5 h-3.5 animate-pulse" /> Tap to Allow
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="w-8 h-8 text-[#D32F2F] animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Checking device permission settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
      {/* Banner explaining permissions */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-4 flex gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-red-200 shrink-0 shadow-sm">
          <Shield className="w-5 h-5 text-[#D32F2F]" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-xs text-gray-900">Privacy & Permissions</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
            Rakshika works directly with your browser and native hardware features to protect you. We never collect data unless an emergency is triggered.
          </p>
        </div>
      </div>

      {/* Error message handling */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium flex-1">{error}</p>
          <button
            onClick={clearError}
            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Permissions List */}
      <div className="space-y-3.5">
        {permissionDetails.map((perm) => {
          const status = permissions[perm.name];
          const IconComponent = perm.icon;

          return (
            <div
              key={perm.name}
              className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3.5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{perm.title}</h4>
                    <p className="text-xs text-gray-500 leading-normal mt-0.5">
                      {perm.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">{renderStatusBadge(status)}</div>
              </div>

              {/* Action and Context Guide */}
              <div className="flex flex-col gap-2 border-t border-gray-50 pt-3">
                {status === "prompt" && (
                  <Button
                    size="sm"
                    className="w-full text-xs py-2 h-9"
                    onClick={() => requestPermission(perm.name)}
                  >
                    Allow {perm.title}
                  </Button>
                )}

                {status === "denied" && (
                  <div className="text-[10px] text-red-600 font-semibold bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 leading-relaxed">
                    ⚠️ Permission has been blocked. Please open your phone or browser settings, search for this app's permissions, and allow "{perm.title}" access.
                  </div>
                )}

                {status === "unsupported" && (
                  <div className="text-[10px] text-gray-500 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
                    ⚠️ This device or browser environment does not support system access requests for {perm.title}.
                  </div>
                )}

                {status === "granted" && (
                  <div className="text-[10px] text-green-600 font-bold bg-green-50/50 p-2.5 rounded-xl border border-green-100/50 flex items-center gap-1.5">
                    ✓ Access is active. Application logic can invoke this system service when required.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
