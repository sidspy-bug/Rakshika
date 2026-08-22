/**
 * EmergencyCard Component
 *
 * Compact card displaying an emergency alert.
 * Used in lists (e.g., active alerts list, history).
 */

import { useNavigate } from "react-router-dom";
import { AlertTriangle, MapPin, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "../../utils/cn";
import type { SOSAlert } from "../../types/emergency";

export function formatTimeAgo(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface EmergencyCardProps {
  alert: SOSAlert;
  onClick?: () => void;
  className?: string;
}

export function EmergencyCard({ alert, onClick, className }: EmergencyCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation based on status
      if (alert.status === "PENDING" || alert.status === "ALERTED") {
        navigate(`/volunteer/alert/${alert.id}`);
      } else if (alert.status === "ACCEPTED") {
        navigate(`/volunteer/response/${alert.id}`);
      }
    }
  };

  const isResolved = alert.status === "RESOLVED";
  const isDeclined = alert.status === "DECLINED";

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md active:scale-[0.98]",
        isResolved ? "border-emerald-100 bg-emerald-50/30" : 
        isDeclined ? "border-gray-100 bg-gray-50/50 opacity-70" : 
        "border-red-100",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              isResolved ? "bg-emerald-100 text-emerald-600" :
              isDeclined ? "bg-gray-200 text-gray-500" :
              "bg-red-100 text-[#D32F2F]"
            )}
          >
            {isResolved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              SOS Alert
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                #{alert.id.split("-")[2]?.slice(-4) || "0000"}
              </span>
            </h3>
            <p
              className={cn(
                "text-xs font-semibold mt-0.5",
                isResolved ? "text-emerald-600" :
                isDeclined ? "text-gray-500" :
                "text-[#D32F2F]"
              )}
            >
              {alert.status.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2 border border-gray-100">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-600 font-medium truncate">
            {alert.distance ? `~${Math.round(alert.distance)}m away` : "Unknown dist"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2 border border-gray-100">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-600 font-medium truncate">
            {formatTimeAgo(new Date(alert.timestamp))}
          </p>
        </div>
      </div>
    </button>
  );
}
