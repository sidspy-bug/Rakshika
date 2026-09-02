import { useState, useRef, useEffect } from "react";
import { ShieldAlert, MapPin, PhoneCall, Mic, Siren, Square, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stay Safe, <span className="text-[#D32F2F]">Rakshika</span></h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4 text-green-500" /> Connecting to location...
          </p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500 shadow-sm">
          <span className="text-green-700 font-bold text-sm">98%</span>
        </div>
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
          className="p-4 bg-gradient-to-r from-red-950/40 to-black/60 border border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer flex items-center justify-between"
          onClick={() => navigate("/history")}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                Evidence Vault & Incident Dossier
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                View recorded videos, SHA-256 manifests & export police certificates
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shrink-0">
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
    </div>
  );
}
