import { useState, useRef, useEffect } from "react";
import { ShieldAlert, MapPin, PhoneCall, Mic, Siren, Square, CheckCircle2, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { useUserLocation } from "../hooks/useUserLocation";
import { reverseGeocode } from "../services/gisService";
import { OfflineEmergencyModal } from "../components/emergency/OfflineEmergencyModal";

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
          className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl shadow-md shadow-red-600/30 active:scale-95 transition-all text-xs font-bold border border-red-400/30 group"
          title="Offline Emergency Chat & Coordinates (Zero Internet Mode)"
        >
          <div className="relative flex items-center justify-center">
            <Radio className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <div className="text-left leading-tight hidden xs:block sm:block">
            <div className="text-[9px] uppercase tracking-wider text-red-200 font-extrabold flex items-center gap-1">
              Zero-Net
            </div>
            <div className="text-xs font-black">Offline Chat</div>
          </div>
          <span className="xs:hidden sm:hidden text-xs font-bold">Offline</span>
        </button>
      </header>

      {/* Main SOS Action */}
      <section className="flex flex-col items-center justify-center py-8">
        <div className="relative group cursor-pointer" onClick={() => navigate('/sos')}>
          <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
          <button className="relative w-48 h-48 bg-gradient-to-b from-[#ff4b4b] to-[#b71c1c] rounded-full shadow-[0_10px_40px_rgba(211,47,47,0.4)] flex flex-col items-center justify-center border-4 border-white/20 transition-transform active:scale-95 duration-200">
            <ShieldAlert className="w-16 h-16 text-white mb-2" strokeWidth={1.5} />
            <span className="text-white text-3xl font-bold tracking-widest">SOS</span>
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-500 font-medium tracking-wide uppercase">Press for Emergency Help</p>
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-4">
        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200" onClick={() => navigate('/fake-call')}>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <PhoneCall className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Fake Call</span>
        </GlassCard>

        <GlassCard 
          className={`flex flex-col items-center justify-center p-4 gap-3 cursor-pointer transition-colors border-2 ${isSirenPlaying ? 'border-orange-500 bg-orange-50' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
          onClick={toggleSiren}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSirenPlaying ? 'bg-orange-500 text-white animate-pulse' : 'bg-orange-100 text-orange-600'}`}>
            <Siren className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">{isSirenPlaying ? "Stop Siren" : "Siren"}</span>
        </GlassCard>
        
        <GlassCard 
          className={`flex flex-col items-center justify-center p-4 gap-3 cursor-pointer transition-colors border-2 ${isRecording ? 'border-purple-500 bg-purple-50' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
          onClick={toggleRecord}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isRecording ? 'bg-purple-500 text-white animate-pulse' : 'bg-purple-100 text-purple-600'}`}>
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
          </div>
          <span className="font-semibold text-sm text-gray-800">{isRecording ? "Stop Recording" : "Record"}</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200" onClick={() => navigate('/ai')}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">AI Advice</span>
        </GlassCard>
      </section>
      
      {/* Forensic Evidence Vault Card */}
      <section className="mt-1">
        <GlassCard
          className="p-4 bg-white/95 border-2 border-red-200/90 hover:border-red-400 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between gap-3 group"
          onClick={() => navigate("/history")}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-gray-950 flex items-center gap-2">
                Evidence Vault & Incident Dossier
              </h4>
              <p className="text-xs text-gray-700 font-medium mt-0.5 leading-relaxed">
                View recorded videos, SHA-256 manifests & export police certificates
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3.5 py-2 rounded-xl shadow-sm shadow-red-600/30 shrink-0 transition-colors flex items-center gap-1">
            Open Vault →
          </span>
        </GlassCard>
      </section>

      {/* Current Status */}
      <section className="mt-1">
        <div className={`rounded-2xl p-5 text-white flex items-center justify-between shadow-lg transition-colors ${guardianMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-800' : 'bg-gradient-to-r from-gray-900 to-gray-800'}`}>
          <div>
            <h3 className="font-bold text-lg">Guardian Mode</h3>
            <p className="text-gray-300 text-sm mt-1">{guardianMode ? "Live location actively hidden." : "Live location hidden."}</p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
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
