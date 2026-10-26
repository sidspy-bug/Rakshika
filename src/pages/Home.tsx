import { useState, useRef, useEffect } from "react";
import { ShieldAlert, MapPin, PhoneCall, Mic, Siren, Square, CheckCircle2, Radio, LifeBuoy, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { useUserLocation } from "../hooks/useUserLocation";
import { reverseGeocode } from "../services/gisService";
import { OfflineEmergencyModal } from "../components/emergency/OfflineEmergencyModal";
import { cn } from "../utils/cn";

function formatCompactAddress(fullAddress: string): string {
  if (!fullAddress) return "";
  if (fullAddress.startsWith("Location")) return fullAddress;

  const parts = fullAddress.split(",").map((p) => p.trim()).filter(Boolean);
  // Filter out postal codes (5-6 digits), "India", "Bharat"
  const filtered = parts.filter(
    (p) => !/^\d{5,6}$/.test(p) && !/^(india|bharat)$/i.test(p)
  );
  if (filtered.length >= 2) {
    return `${filtered[0]}, ${filtered[1]}`;
  }
  return filtered[0] || parts[0] || fullAddress;
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl z-[200] flex items-center gap-2"
    >
      <CheckCircle2 className="w-4 h-4 text-green-500" /> {message}
    </motion.div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [guardianMode, setGuardianMode] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);

  // User Profile Name
  const [userName] = useState<string>(() => {
    try {
      const profileRaw = localStorage.getItem("user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.fullName) return p.fullName.trim().split(" ")[0];
        if (p.name) return p.name.trim().split(" ")[0];
      }
    } catch {}
    return "Rakshika";
  });

  // Live Location & Reverse Geocoding
  const { location, loading: isLocationLoading } = useUserLocation();
  const [address, setAddress] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("rakshika_user_last_address_compact") ||
        localStorage.getItem("rakshika_user_last_address") ||
        ""
      );
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!location?.lat || !location?.lng) return;

    let isMounted = true;
    reverseGeocode(location)
      .then((fullAddr) => {
        if (!isMounted) return;
        if (fullAddr) {
          const compact = formatCompactAddress(fullAddr);
          setAddress(compact);
          try {
            localStorage.setItem("rakshika_user_last_address_compact", compact);
            localStorage.setItem("rakshika_user_last_address", fullAddr);
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("Home reverse geocode error:", err);
        if (isMounted && !address) {
          setAddress(`${location.lat.toFixed(3)}°N, ${location.lng.toFixed(3)}°E`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location?.lat, location?.lng]);
  
  // Siren state
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sirenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Record state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [showToast, setShowToast] = useState("");

  // Interactive SOS Button Hold State & Audio/Haptic Physics
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [isSosPressing, setIsSosPressing] = useState(false);
  const pressStartTimeRef = useRef<number>(0);
  const hasTriggeredRef = useRef<boolean>(false);

  const playMechanicalClick = (frequency: number = 440, duration: number = 0.05) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => ctx.close().catch(() => {}), duration * 1000 + 100);
    } catch {}
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSosPressing && !hasTriggeredRef.current) {
      timer = setInterval(() => {
        setSosHoldProgress((prev) => {
          if (prev >= 100) {
            hasTriggeredRef.current = true;
            setIsSosPressing(false);
            try {
              if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 500]);
              }
            } catch {}
            playMechanicalClick(880, 0.15);
            navigate("/sos", { state: { autoActivate: true } });
            return 100;
          }
          const next = prev + 4; // ~750ms to reach 100%
          if (next % 24 < 4) {
            try {
              if (navigator.vibrate) navigator.vibrate(25);
            } catch {}
          }
          return next;
        });
      }, 30);
    } else if (!isSosPressing) {
      setSosHoldProgress(0);
      hasTriggeredRef.current = false;
    }
    return () => clearInterval(timer);
  }, [isSosPressing, navigate]);

  const handleSosPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pressStartTimeRef.current = Date.now();
    hasTriggeredRef.current = false;
    setIsSosPressing(true);
    playMechanicalClick(520, 0.04);
    try {
      if (navigator.vibrate) navigator.vibrate(35);
    } catch {}
  };

  const handleSosPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    const elapsed = Date.now() - pressStartTimeRef.current;
    setIsSosPressing(false);
    // If it was a quick intentional tap (< 350ms) and hold didn't complete
    if (elapsed < 350 && !hasTriggeredRef.current) {
      playMechanicalClick(620, 0.05);
      navigate("/sos");
    }
  };

  const toggleSiren = () => {
    if (isSirenPlaying) {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {
          console.warn("Failed to stop oscillator:", e);
        }
        oscillatorRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (sirenTimeoutRef.current) {
        clearTimeout(sirenTimeoutRef.current);
        sirenTimeoutRef.current = null;
      }
      setIsSirenPlaying(false);
    } else {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      
      // Sweep frequency to simulate siren
      sirenIntervalRef.current = setInterval(() => {
        if (!audioCtxRef.current) return;
        osc.frequency.setTargetAtTime(800, ctx.currentTime, 0.15);
        sirenTimeoutRef.current = setTimeout(() => {
           if (!audioCtxRef.current) return;
           osc.frequency.setTargetAtTime(400, ctx.currentTime, 0.15);
        }, 500);
      }, 1000);

      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
      
      setIsSirenPlaying(true);
      showToastMessage("Siren activated!");
    }
  };

  const toggleRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
      showToastMessage("Recording saved securely.");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        showToastMessage("Recording started...");
      } catch (err) {
        console.warn(err);
        showToastMessage("Microphone/Camera permission denied.");
      }
    }
  };

  const showToastMessage = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(""), 3000);
  };

  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) {
          // Ignore
        }
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
      }
      if (sirenTimeoutRef.current) {
        clearTimeout(sirenTimeoutRef.current);
      }
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-full p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <AnimatePresence>
        {showToast && <Toast message={showToast} />}
      </AnimatePresence>
      {/* Header */}
      <header className="flex justify-between items-center mt-4">
        <div className="min-w-0 pr-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Stay Safe, <span className="text-[#D32F2F]">{userName}</span>
          </h1>
          {address ? (
            <p
              className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mt-1 cursor-pointer hover:text-red-600 transition-colors group"
              title={`Live GPS location: ${address} (Click to open map)`}
              onClick={() => navigate("/map")}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[240px]">{address}</span>
            </p>
          ) : location ? (
            <p
              className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mt-1 cursor-pointer hover:text-red-600 transition-colors"
              onClick={() => navigate("/map")}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-gray-600">
                GPS Locked ({location.lat.toFixed(3)}°N, {location.lng.toFixed(3)}°E)
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs text-gray-500">Acquiring GPS fix...</span>
            </p>
          )}
        </div>
        {/* Offline Emergency Comms & Distress Chat Trigger */}
        <button
          onClick={() => setIsOfflineModalOpen(true)}
          className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] active:bg-[#9a1414] text-white rounded-lg shadow-xs border border-red-700 active:scale-[0.98] transition-all text-xs font-semibold select-none"
          title="Offline Emergency Chat & Coordinates (Zero Internet Mode)"
        >
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <div className="text-left leading-tight hidden xs:block sm:block">
            <div className="text-[9px] uppercase tracking-wider text-red-200 font-bold">
              Zero-Net
            </div>
            <div className="text-xs font-extrabold">Offline Chat</div>
          </div>
          <span className="xs:hidden sm:hidden text-xs font-bold">Offline</span>
        </button>
      </header>

      {/* Main SOS Action - Interactive Physical Tactile Actuator */}
      <section className="flex flex-col items-center justify-center py-5">
        <div className="relative flex items-center justify-center w-56 h-56 select-none touch-none">
          {/* Subtle Concentric Sonar Waves */}
          <motion.div
            animate={isSosPressing ? { scale: [1, 1.25, 1.45], opacity: [0.6, 0.3, 0] } : { scale: [1, 1.12, 1.25], opacity: [0.25, 0.1, 0] }}
            transition={{ duration: isSosPressing ? 0.8 : 2.5, repeat: Infinity, ease: "easeOut" }}
            className={cn("absolute inset-2 rounded-full", isSosPressing ? "bg-red-500/25" : "bg-red-500/10")}
          />
          <motion.div
            animate={isSosPressing ? { scale: [1, 1.15, 1.3], opacity: [0.7, 0.35, 0] } : { scale: [1, 1.06, 1.15], opacity: [0.35, 0.15, 0] }}
            transition={{ duration: isSosPressing ? 0.8 : 2.5, delay: isSosPressing ? 0.2 : 0.6, repeat: Infinity, ease: "easeOut" }}
            className={cn("absolute inset-4 rounded-full", isSosPressing ? "bg-red-600/30" : "bg-red-600/15")}
          />

          {/* Precision SVG Charge Gauge */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 224 224">
            {/* Background Bezel Ring Track */}
            <circle
              cx="112"
              cy="112"
              r="102"
              stroke="#e2e8f0"
              strokeWidth="6"
              fill="none"
              className="dark:stroke-slate-800"
            />
            {/* Active Hold-to-Charge Progress Arc */}
            <circle
              cx="112"
              cy="112"
              r="102"
              stroke="#dc2626"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="640.88"
              strokeDashoffset={640.88 - (640.88 * sosHoldProgress) / 100}
              style={{ transition: isSosPressing ? "stroke-dashoffset 40ms linear" : "stroke-dashoffset 150ms ease-out" }}
            />
          </svg>

          {/* Mechanical Inset Bezel Chassis */}
          <div className="absolute inset-4 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center p-2 pointer-events-none" />

          {/* Tactile Spring Physical Actuator Button */}
          <motion.button
            animate={{
              scale: isSosPressing ? 0.94 : 1,
              y: isSosPressing ? 4 : 0,
            }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onPointerDown={handleSosPointerDown}
            onPointerUp={handleSosPointerUp}
            onPointerCancel={handleSosPointerUp}
            onPointerLeave={handleSosPointerUp}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center select-none cursor-pointer outline-none transition-shadow",
              "bg-gradient-to-b from-[#ef4444] to-[#b91c1c] border-2 border-red-300/40 text-white",
              isSosPressing
                ? "shadow-[0_2px_0_#7f1d1d,0_6px_14px_rgba(185,28,28,0.25)]"
                : "shadow-[0_8px_0_#7f1d1d,0_16px_28px_rgba(220,38,38,0.35)] hover:brightness-105"
            )}
            title="Press and hold for 1s for instant SOS, or tap to review dispatch controls"
          >
            {/* Top Gloss Reflection for Hardware Feel */}
            <div className="absolute top-2 inset-x-8 h-8 rounded-t-full bg-white/20 blur-[1px] pointer-events-none" />

            <ShieldAlert className="w-13 h-13 text-white mb-0.5 drop-shadow-sm" strokeWidth={2} />
            <span className="text-3xl font-black tracking-widest text-white drop-shadow-sm leading-none">
              SOS
            </span>
            <span className="text-[10px] font-extrabold tracking-wider text-red-100 uppercase mt-1">
              {isSosPressing ? (sosHoldProgress > 0 ? `HOLD ${Math.round(sosHoldProgress)}%` : "HOLDING") : "PRESS / HOLD"}
            </span>
          </motion.button>
        </div>

        {/* Dynamic Telemetry Feedback Pill */}
        <div
          className={cn(
            "mt-4 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all select-none shadow-xs",
            isSosPressing
              ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse"
              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
          )}
        >
          {isSosPressing ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>ARMING DISPATCH: {Math.min(100, Math.round(sosHoldProgress))}%</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Hold 1s for instant dispatch • Tap to open</span>
            </>
          )}
        </div>
      </section>

      {/* Quick Actions Grid - Tactile Utility Tiles */}
      <section className="grid grid-cols-2 gap-3">
        <GlassCard 
          className="flex flex-col items-center justify-center p-3.5 gap-2.5 cursor-pointer hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all border border-slate-200 select-none shadow-xs rounded-xl" 
          onClick={() => navigate('/fake-call')}
        >
          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <PhoneCall className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-800">Fake Call</span>
        </GlassCard>

        <GlassCard 
          className={`flex flex-col items-center justify-center p-3.5 gap-2.5 cursor-pointer active:scale-[0.98] transition-all border select-none shadow-xs rounded-xl ${isSirenPlaying ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          onClick={toggleSiren}
        >
          <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${isSirenPlaying ? 'bg-amber-600 border-amber-700 text-white animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <Siren className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-800">{isSirenPlaying ? "Stop Siren" : "Siren"}</span>
        </GlassCard>
        
        <GlassCard 
          className={`flex flex-col items-center justify-center p-3.5 gap-2.5 cursor-pointer active:scale-[0.98] transition-all border select-none shadow-xs rounded-xl ${isRecording ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          onClick={toggleRecord}
        >
          <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${isRecording ? 'bg-rose-600 border-rose-700 text-white animate-pulse' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
          </div>
          <span className="font-bold text-xs text-slate-800">{isRecording ? "Stop Recording" : "Record Audio"}</span>
        </GlassCard>

        <GlassCard 
          className="flex flex-col items-center justify-center p-3.5 gap-2.5 cursor-pointer hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all border border-slate-200 select-none shadow-xs rounded-xl" 
          onClick={() => navigate('/ai')}
        >
          <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-slate-800">Safety Guide</span>
        </GlassCard>
      </section>
      
      {/* Forensic Evidence Vault Card */}
      <section className="mt-1">
        <GlassCard
          className="p-4 bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 rounded-xl select-none active:scale-[0.99]"
          onClick={() => navigate("/history")}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-red-700 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-slate-900 truncate">
                Evidence Vault & Incident Dossier
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5 leading-snug line-clamp-1">
                Recorded streams, SHA-256 manifests & police certificates
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0 transition-colors">
            Open →
          </span>
        </GlassCard>
      </section>

      {/* Current Status */}
      <section className="mt-0.5">
        <div className={`rounded-xl p-4 text-white flex items-center justify-between border shadow-xs transition-all select-none ${guardianMode ? 'bg-emerald-900 border-emerald-800' : 'bg-slate-900 border-slate-800'}`}>
          <div>
            <h3 className="font-bold text-sm">Guardian Mode</h3>
            <p className="text-slate-300 text-xs mt-0.5">{guardianMode ? "Live location is masked." : "Standard live location broadcast."}</p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs"
            onClick={() => setGuardianMode(!guardianMode)}
          >
            {guardianMode ? "Disable" : "Enable"}
          </Button>
        </div>
      </section>
      {/* Offline Emergency Comms Modal */}
      <OfflineEmergencyModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        currentCoords={location}
        currentAddress={address}
      />
    </div>
  );
}
