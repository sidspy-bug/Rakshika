/**
 * PermissionBanner
 *
 * Informational banner explaining why Rakshika requests access to device contacts.
 * Displayed when the Contact Picker API is available but permission hasn't been
 * granted, or when the user needs reassurance about privacy.
 *
 * Privacy-first messaging: emphasizes that only the single selected contact is read.
 */

import { Shield, X, AlertTriangle } from "lucide-react";

interface PermissionBannerProps {
  /** Whether permission was permanently denied */
  isDenied?: boolean;
  /** Callback when the user dismisses the banner */
  onDismiss?: () => void;
}

export function PermissionBanner({ isDenied, onDismiss }: PermissionBannerProps) {
  return (
    <div
      className={`relative rounded-2xl p-4 border ${
        isDenied
          ? "bg-amber-50 border-amber-200"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isDenied
              ? "bg-amber-100 text-amber-600"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          {isDenied ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 pr-4">
          <h4 className="font-bold text-sm text-gray-900">
            {isDenied
              ? "Contacts Access Denied"
              : "Why we need contacts access"}
          </h4>

          {isDenied ? (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Contacts permission was denied. You can still add emergency
                contacts by entering their details manually below.
              </p>
              <p className="text-xs text-amber-700 font-medium">
                To enable the contact picker, go to your browser or device
                settings and allow contacts access for this app.
              </p>
            </div>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Rakshika can import a contact directly from your phone so you
                don't have to type their details manually.
              </p>
              <p className="text-xs text-blue-700 font-semibold">
                🔒 We only read the single contact you select — your full
                address book is never accessed or uploaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
