/**
 * OfflineModeScreen
 *
 * Dedicated screen accessible when the device is completely offline.
 * Shows SMS fallback instructions and BLE Mesh Network status.
 */

import { useNavigate } from "react-router-dom";
import { ChevronLeft, WifiOff, MessageSquare, AlertTriangle } from "lucide-react";
import { BleStatusCard } from "../../components/volunteer/BleStatusCard";
import { useConnectivity } from "../../hooks/useConnectivity";

export function OfflineModeScreen() {
  const navigate = useNavigate();
  const { isOnline, canSendSMS } = useConnectivity();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[600px] mx-auto border-x border-gray-200">
      {/* Header */}
      <header className="bg-red-500 border-b border-red-600 sticky top-0 z-10 pt-safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg">Offline Mode</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 overflow-y-auto pb-safe-bottom space-y-6">
        
        {/* Main Status */}
        <div className="bg-white rounded-3xl p-6 border-2 border-red-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">No Internet Connection</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] mx-auto">
            {isOnline 
              ? "You are back online! You can return to the dashboard."
              : "Rakshika has activated offline protocols. Some features are limited, but emergency relays are still active."}
          </p>
        </div>

        {/* SMS Fallback Info */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <div className="flex items-center gap-3 mb-3 text-amber-900">
            <MessageSquare className="w-5 h-5" />
            <h3 className="font-bold">SMS Fallback</h3>
          </div>
          {canSendSMS ? (
            <p className="text-sm text-amber-800 leading-relaxed">
              SMS fallback is ready. If you accept or resolve an emergency, Rakshika will attempt to send an encrypted SMS to the emergency gateway.
            </p>
          ) : (
            <p className="text-sm text-red-600 font-medium">
              SMS capability is not detected on this device. Fallback communication is disabled.
            </p>
          )}
        </div>

        {/* BLE Mesh Status */}
        <BleStatusCard />

        {/* Disclaimer */}
        <div className="bg-gray-100 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Experimental Feature:</strong> Offline communication relies on local device capabilities (SMS/Bluetooth) and is not guaranteed to deliver messages instantly.
          </p>
        </div>
        
      </main>
    </div>
  );
}
