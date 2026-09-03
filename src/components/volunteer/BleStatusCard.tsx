import { Bluetooth, Radio, Smartphone, Activity } from "lucide-react";
import { useAirTagMesh } from "../../hooks/useAirTagMesh";
import { formatTimeAgo } from "../emergency/EmergencyCard";

export function BleStatusCard() {
  const meshStats = useAirTagMesh(true);
  const isRelaying = meshStats.isAdvertising || meshStats.bufferedPacketsCount > 0;
  const status = isRelaying ? "RELAYING" : meshStats.isScanning ? "SCANNING" : "STANDBY";

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm overflow-hidden relative">
      {/* Background Pulse Effect when relaying */}
      {isRelaying && (
        <div className="absolute inset-0 bg-indigo-50/50 animate-pulse z-0" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-900">
            <Bluetooth className="w-5 h-5" />
            <h3 className="font-bold">AirTag BLE Mesh Network</h3>
          </div>
          <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isRelaying ? "bg-indigo-600 text-white animate-pulse" : "bg-indigo-100 text-indigo-700"
          }`}>
            {status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <Smartphone className="w-5 h-5 text-gray-400 mb-1" />
            <p className="text-xl font-black text-gray-900">{meshStats.nearbyBeaconsDetected}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Nearby Beacons</p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-center items-center text-center">
            <Radio className="w-5 h-5 text-gray-400 mb-1" />
            <p className="text-sm font-bold text-gray-900 mt-1">
              {meshStats.lastFlushTime ? formatTimeAgo(meshStats.lastFlushTime) : "None yet"}
            </p>
            <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">
              Relayed: {meshStats.totalPacketsRelayed}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2">
          <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Your device is anonymously helping relay emergency signals using hardware Bluetooth Low Energy since internet is unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}
