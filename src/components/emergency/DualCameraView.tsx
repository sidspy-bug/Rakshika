import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  RefreshCw,
  Columns,
  Maximize2,
  Flashlight,
  FlashlightOff,
  EyeOff,
  Video,
  ShieldCheck,
  Radio,
  Lock,
} from "lucide-react";
import {
  dualCameraService,
  type DualCameraStatus,
  type DualLayoutMode,
} from "../../services/dualCameraService";

interface DualCameraViewProps {
  incidentId?: string;
  coords?: { lat: number; lng: number } | null;
  chunksCount?: number;
  lastChunkHash?: string;
  onCovertToggle?: () => void;
  className?: string;
}

export const DualCameraView: React.FC<DualCameraViewProps> = ({
  incidentId = "EMERGENCY_SOS",
  coords,
  chunksCount = 0,
  lastChunkHash = "ACTIVE",
  onCovertToggle,
  className = "",
}) => {
  const [status, setStatus] = useState<DualCameraStatus>(() =>
    dualCameraService.getStatus()
  );
  const [durationSec, setDurationSec] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTorchActive, setIsTorchActive] = useState(false);
  const [streamAttached, setStreamAttached] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Subscribe to dualCameraService status
  useEffect(() => {
    const unsubscribe = dualCameraService.subscribe((s) => {
      setStatus(s);
      setIsTorchActive(s.isTorchOn);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize and attach live composite video feed
  useEffect(() => {
    let active = true;

    async function initFeed() {
      setIsInitializing(true);
      const stream = await dualCameraService.startDualCapture({
        coords,
        incidentId,
      });

      if (active && stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setStreamAttached(true);
      }
      setIsInitializing(false);
    }

    initFeed();

    // Duration timer
    const timer = setInterval(() => {
      setDurationSec((prev) => prev + 1);
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      dualCameraService.stopDualCapture();
    };
  }, [incidentId]);

  // Keep location updated in dual camera watermark
  useEffect(() => {
    if (coords) {
      dualCameraService.updateLocation(coords);
    }
  }, [coords]);

  const handleFlipLens = () => {
    dualCameraService.togglePrimaryLens();
  };

  const handleToggleLayout = () => {
    dualCameraService.toggleLayoutMode();
  };

  const handleToggleTorch = async () => {
    const nextState = await dualCameraService.toggleTorch();
    setIsTorchActive(nextState);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-slate-950 border border-red-500/30 shadow-2xl ${className}`}
    >
      {/* ─── Top Forensic Bar ─── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
          </div>
          <span className="font-black text-[11px] uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-red-500" />
            Dual-Lens Evidence Recorder
          </span>
          <span className="px-2 py-0.5 rounded-md bg-red-950/80 text-red-300 font-mono text-[10px] font-bold border border-red-800/40">
            {formatDuration(durationSec)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {status.isDualConcurrent ? "Dual Hardware" : "Multi-Angle"}
          </span>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/30">
            {chunksCount} Chunks
          </span>
        </div>
      </div>

      {/* ─── Live Video Container ─── */}
      <div className="relative aspect-4/3 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
        {/* Main Composite Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* Loading Spinner */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-300 gap-2 z-20">
            <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
            <p className="text-xs font-bold tracking-wide">
              Initializing Dual Camera Sensors...
            </p>
          </div>
        )}

        {/* Overlay Lens Badges on Viewport */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 shadow-xs">
            <Video className="w-3 h-3 text-amber-400" />
            {status.primaryLens === "environment" ? "Rear: Scene" : "Front: Victim Face"}
          </span>
          {status.isDualConcurrent && (
            <span className="bg-black/60 backdrop-blur-md text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 shadow-xs">
              PiP: {status.primaryLens === "environment" ? "Front" : "Rear"}
            </span>
          )}
        </div>

        {/* Live GPS Watermark Badge on Viewport */}
        {coords && (
          <div className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur-md text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-emerald-500/30 shadow-xs z-10 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span>
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </span>
          </div>
        )}

        {/* Bottom Hash Watermark Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 z-10">
          <span className="text-slate-300 flex items-center gap-1">
            <Lock className="w-3 h-3 text-red-400" />
            SHA-256: {lastChunkHash || "PENDING"}
          </span>
          <span className="text-red-400 font-bold uppercase tracking-wider">
            Tamper-Proof Forensic Vault
          </span>
        </div>
      </div>

      {/* ─── Interactive Tactical Control Bar ─── */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
        {/* Flip Primary Lens (Rear <-> Front) */}
        <button
          type="button"
          onClick={handleFlipLens}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-xs"
          title="Swap Main Camera (Rear Environment <-> Front Face)"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>Flip Lens</span>
        </button>

        {/* Switch Layout (PiP <-> Split) */}
        {status.isDualConcurrent && (
          <button
            type="button"
            onClick={handleToggleLayout}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-xs"
            title="Toggle between Picture-in-Picture and Split Screen View"
          >
            {status.activeLayout === "PIP" ? (
              <>
                <Columns className="w-3.5 h-3.5 text-sky-400" />
                <span>Split View</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                <span>PiP Inset</span>
              </>
            )}
          </button>
        )}

        {/* Emergency LED Flashlight */}
        <button
          type="button"
          onClick={handleToggleTorch}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-xs ${
            isTorchActive
              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30"
              : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          }`}
          title="Turn on Camera Flashlight to illuminate scene"
        >
          {isTorchActive ? (
            <>
              <FlashlightOff className="w-3.5 h-3.5" />
              <span>Flash ON</span>
            </>
          ) : (
            <>
              <Flashlight className="w-3.5 h-3.5 text-amber-400" />
              <span>Torch</span>
            </>
          )}
        </button>

        {/* Covert Blackout Button */}
        {onCovertToggle && (
          <button
            type="button"
            onClick={onCovertToggle}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-950/80 hover:bg-red-900 active:scale-95 text-red-200 rounded-xl text-xs font-bold border border-red-700/60 transition-all shadow-xs"
            title="Blackout screen while continuing background recording"
          >
            <EyeOff className="w-3.5 h-3.5 text-red-400" />
            <span>Stealth</span>
          </button>
        )}
      </div>
    </div>
  );
};
