/**
 * ResolutionDialog Component
 *
 * Dialog for resolving an active emergency response.
 * Allows the volunteer to select a resolution type (e.g., ASSISTANCE_PROVIDED, FALSE_ALARM)
 * and provide an optional note.
 */

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";
import type { ResolutionType } from "../../types/emergency";

interface ResolutionDialogProps {
  onResolve: (resolution: ResolutionType, notes?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RESOLUTION_OPTIONS: { value: ResolutionType; label: string; description: string }[] = [
  {
    value: "ASSISTANCE_PROVIDED",
    label: "Assistance Provided",
    description: "I successfully helped the user in need.",
  },
  {
    value: "CAMPUS_SECURITY_TOOK_OVER",
    label: "Campus Security Took Over",
    description: "Security arrived and handled the situation.",
  },
  {
    value: "EMERGENCY_SERVICES_TOOK_OVER",
    label: "Official Services Took Over",
    description: "Police, Fire, or Medical services took control.",
  },
  {
    value: "USER_SAFE",
    label: "User is Safe",
    description: "The user is safe and no longer needs assistance.",
  },
  {
    value: "FALSE_ALARM",
    label: "False Alarm",
    description: "The SOS was triggered accidentally.",
  },
];

export function ResolutionDialog({ onResolve, onCancel, isSubmitting = false }: ResolutionDialogProps) {
  const [selected, setSelected] = useState<ResolutionType | null>(null);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (selected) {
      onResolve(selected, notes);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-gray-900">Resolve Emergency</h2>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4">
            Please select the final outcome of this emergency response.
          </p>

          <div className="space-y-3 mb-6">
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selected === opt.value
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${
                    selected === opt.value ? "text-blue-900" : "text-gray-900"
                  }`}>
                    {opt.label}
                  </span>
                  {selected === opt.value && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <p className={`text-xs ${
                  selected === opt.value ? "text-blue-700" : "text-gray-500"
                }`}>
                  {opt.description}
                </p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant details about the incident..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 shrink-0 bg-gray-50/50">
          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!selected || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Resolving..." : "Submit Resolution"}
          </Button>
        </div>
      </div>
    </div>
  );
}
