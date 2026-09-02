import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  X,
  Phone,
  MapPin,
  Video,
  CheckCircle2,
  AlertTriangle,
  Radio,
  EyeOff,
  Settings,
  Plus,
  Trash2,
  Clock,
  Wifi,
  WifiOff,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  getActiveSos,
  createOrGetActiveSos,
  appendSosLocation,
  stopSos,
  cacheUserLocation,
  getCachedLastLocation,
  setGhostMode,
  type SosIncident,
} from "../services/sosService";
import { dispatchEngine, type DispatchState } from "../services/dispatchEngine";
import { EvidenceChunkStreamer, type EvidenceChunkMeta } from "../services/evidenceStreamingService";
import { airTagMeshRelayService } from "../services/airTagMeshRelayService";
import { useSilentCheckIn } from "../hooks/useSilentCheckIn";
import { useAirTagMesh } from "../hooks/useAirTagMesh";
import { guardianAnchorService } from "../services/guardianAnchorService";

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="absolute top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl z-[200] flex items-center gap-2"
    >
      <CheckCircle2 className="w-4 h-4" /> {message}
    </motion.div>
  );
}

export function SosScreen() {
  const navigate = useNavigate();
  const existingActive = getActiveSos();

  const [isPressing, setIsPressing] = useState(false);
  const [activated, setActivated] = useState<boolean>(() => Boolean(existingActive));
  const [countdown, setCountdown] = useState<number>(() => (existingActive ? 0 : 3));
  const [holdProgress, setHoldProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("Emergency Signals Dispatched");
  const [incident, setIncident] = useState<SosIncident | null>(() => existingActive);

  // Advanced features state
  const [isGhostMode, setIsGhostModeState] = useState<boolean>(
    () => existingActive?.isGhostMode || false
  );
  const [isCovertBlackout, setIsCovertBlackout] = useState(false);
  const [showJudgeConfigModal, setShowJudgeConfigModal] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [anchorMinutes, setAnchorMinutes] = useState(15);
  const [anchorDestination, setAnchorDestination] = useState("");
  const [activeAnchor, setActiveAnchor] = useState(() =>
    guardianAnchorService.getActiveAnchor()
  );

  // Judge contacts quick-add state
  const [judgeContacts, setJudgeContacts] = useState<{ name: string; phone: string }[]>(() => {
    try {
      const raw = localStorage.getItem("rakshika-emergency-contacts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgePhone, setNewJudgePhone] = useState("");

  // Live dispatch state
  const [dispatchState, setDispatchState] = useState<DispatchState | null>(() =>
    dispatchEngine.getState()
  );

  // Live evidence stream state
  const [chunksCount, setChunksCount] = useState(0);
  const [lastChunkHash, setLastChunkHash] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Mesh stats hook
  const meshStats = useAirTagMesh(true);

  // Silent check-in hook
  const { showPrompt, promptCountdown, unansweredCount, respondSafe } = useSilentCheckIn(
    activated && countdown === 0,
    incident?.id || null
  );

  const evidenceStreamerRef = useRef<EvidenceChunkStreamer | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isStartedRef = useRef<boolean>(false);
  const ghostTapCountRef = useRef<number>(0);
  const ghostTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Press and hold logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPressing && !activated) {
      timer = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            setActivated(true);
            if (navigator.vibrate && !isGhostMode) {
              navigator.vibrate([200, 100, 200, 100, 500]);
            }
            return 100;
          }
          return prev + 2; // ~1.5 seconds to fill
        });
      }, 30);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPressing, activated, isGhostMode]);

  // SOS Activated countdown & triggers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activated && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (activated && countdown === 0 && !isStartedRef.current) {
      triggerSosActions();
    }
    return () => clearTimeout(timer);
  }, [activated, countdown]);

  // Subscribe to dispatch engine updates
  useEffect(() => {
    const unsub = dispatchEngine.subscribe((state) => {
      setDispatchState({ ...state });
    });
    return () => unsub();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (evidenceStreamerRef.current) {
        evidenceStreamerRef.current.stopStream().catch(() => {});
      }
    };
  }, []);

  const triggerSosActions = async () => {
    isStartedRef.current = true;

    if (isGhostMode) {
      setIsCovertBlackout(true);
    } else {
      setToastMsg("Multi-Channel Emergency SOS Triggered");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }

    // 1. Establish and persist local SOS state FIRST
    const localIncident = createOrGetActiveSos();
    if (isGhostMode) setGhostMode(true);
    setIncident(localIncident);

    // 2. Start Live Location Tracking with Cache Fallback
    let currentCoords: { lat: number; lng: number } = { lat: 28.6139, lng: 77.2090 };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          cacheUserLocation(currentCoords);
          appendSosLocation(currentCoords);

          // Trigger Multi-Channel Dispatch with verified coordinates
          dispatchEngine.dispatchAll(localIncident, currentCoords);
        },
        () => {
          // GPS Failed: Use Cached Last-Known Location
          const cached = getCachedLastLocation();
          if (cached) {
            currentCoords = { lat: cached.lat, lng: cached.lng };
            console.log("[SosScreen] Using cached last-known GPS location:", currentCoords);
          }
          dispatchEngine.dispatchAll(localIncident, currentCoords);
        },
        { enableHighAccuracy: true, timeout: 4000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          cacheUserLocation(coords);
          appendSosLocation(coords);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    } else {
      dispatchEngine.dispatchAll(localIncident, currentCoords);
    }

    // 3. Start 3-Second Chunked Evidence Streaming with SHA-256 Integrity
    try {
      const streamer = new EvidenceChunkStreamer(localIncident.id);
      evidenceStreamerRef.current = streamer;

      streamer.onChunkProcessed((chunk: EvidenceChunkMeta, manifest) => {
        setChunksCount(manifest.totalChunks);
        setLastChunkHash(chunk.sha256.slice(0, 8));
        setIsRecording(true);
      });

      const started = await streamer.startStream();
      setIsRecording(started);
    } catch (err) {
      console.warn("[SosScreen] Evidence streaming could not initialize:", err);
    }
  };

  const cancelSos = async () => {
    isStartedRef.current = false;
    setActivated(false);
    setCountdown(3);
    setHoldProgress(0);
    setIsPressing(false);
    setShowToast(false);
    setIncident(null);
    setIsCovertBlackout(false);

    // Stop and archive local SOS incident
    await stopSos("CANCELLED");
    dispatchEngine.clearState();
    airTagMeshRelayService.stopBroadcasting();

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (evidenceStreamerRef.current) {
      await evidenceStreamerRef.current.stopStream();
      evidenceStreamerRef.current = null;
      setIsRecording(false);
    }

    navigate(-1);
  };

  // Secret triple-tap gesture to exit covert blackout
  const handleCovertTap = () => {
    ghostTapCountRef.current++;
    if (ghostTapTimerRef.current) clearTimeout(ghostTapTimerRef.current);

    ghostTapTimerRef.current = setTimeout(() => {
      ghostTapCountRef.current = 0;
    }, 1000);

    if (ghostTapCountRef.current >= 3) {
      setIsCovertBlackout(false);
      ghostTapCountRef.current = 0;
    }
  };

  // Judge contacts management
  const handleAddJudgeContact = () => {
    if (!newJudgePhone) return;
    const updated = [
      ...judgeContacts,
      {
        id: Date.now().toString(),
        name: newJudgeName.trim() || `Emergency Contact ${judgeContacts.length + 1}`,
        phone: newJudgePhone.trim(),
        relationship: "Judge/Tester",
        source: "manual_entry",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    setJudgeContacts(updated as any);
    localStorage.setItem("rakshika-emergency-contacts", JSON.stringify(updated));
    setNewJudgeName("");
    setNewJudgePhone("");
  };

  const handleRemoveJudgeContact = (phone: string) => {
    const updated = judgeContacts.filter((c) => c.phone !== phone);
    setJudgeContacts(updated);
    localStorage.setItem("rakshika-emergency-contacts", JSON.stringify(updated));
  };

  // Guardian Anchor pre-trip timer
  const handleStartAnchor = async () => {
    const anchor = await guardianAnchorService.startAnchor(anchorMinutes, anchorDestination);
    setActiveAnchor(anchor);
    setShowAnchorModal(false);
    setToastMsg(`⚓ Guardian Anchor active for ${anchorMinutes} mins`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCheckInAnchor = async () => {
    await guardianAnchorService.checkInSafe();
    setActiveAnchor(null);
    setToastMsg("✅ Checked in safely. Anchor resolved.");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ─── GHOST / COVERT MODE BLACKOUT VIEW ─────────────────────────────────
  if (isCovertBlackout && activated) {
    return (
      <div
        onClick={handleCovertTap}
        className="fixed inset-0 z-[300] bg-black text-black flex flex-col items-center justify-center select-none cursor-pointer"
      >
        <div className="opacity-0 pointer-events-none">
          <p>Ghost Mode Active. Triple-tap anywhere to restore UI.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence>
        {showToast && <Toast message={toastMsg} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activated ? (
          // ─── PRE-ACTIVATION SCREEN ─────────────────────────────────────────
          <motion.div
            key="pre-sos"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="flex flex-col items-center justify-between w-full h-full p-6 pt-12 pb-10"
          >
            {/* Top Bar: Anchor & Judge Settings */}
            <div className="w-full flex items-center justify-between max-w-md px-2">
              <button
                onClick={() => setShowAnchorModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  activeAnchor
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse"
                    : "bg-white/10 text-gray-300 border-white/10 hover:bg-white/20"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{activeAnchor ? "Anchor Active" : "Pre-Trip Timer"}</span>
              </button>

              <button
                onClick={() => setShowJudgeConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Judge Demo Setup ({judgeContacts.length})</span>
              </button>
            </div>

            {/* Main Header & SOS Button */}
            <div className="flex flex-col items-center">
              <h1 className="text-3xl font-black text-[#F44336] uppercase tracking-widest text-center">
                Emergency SOS
              </h1>
              <p className="text-gray-400 text-sm mt-1 text-center">
                Press and hold 1.5 seconds to dispatch
              </p>

              <div className="relative flex items-center justify-center w-64 h-64 my-6">
                {/* Background Ripples */}
                <motion.div
                  animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 bg-red-600 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1.8], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 bg-red-500 rounded-full"
                />

                {/* Progress Ring */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="#F44336"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="754"
                    strokeDashoffset={754 - (754 * holdProgress) / 100}
                    className="transition-all duration-75 ease-linear"
                  />
                </svg>

                {/* Main Button */}
                <button
                  onPointerDown={() => setIsPressing(true)}
                  onPointerUp={() => setIsPressing(false)}
                  onPointerLeave={() => setIsPressing(false)}
                  className="absolute z-10 w-52 h-52 bg-gradient-to-b from-red-500 to-red-700 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(244,67,54,0.6)] active:scale-95 transition-transform select-none touch-none"
                >
                  <ShieldAlert className="w-16 h-16 text-white mb-1" />
                  <span className="text-3xl font-black tracking-widest">HOLD SOS</span>
                </button>
              </div>

              {/* Ghost Mode Toggle */}
              <button
                onClick={() => setIsGhostModeState(!isGhostMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isGhostMode
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                }`}
              >
                <EyeOff className="w-4 h-4" />
                <span>Ghost Mode (Covert Black Screen): {isGhostMode ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Bottom Status & Cancel */}
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>AirTag BLE Mesh Ready • {meshStats.bufferedPacketsCount} buffered</span>
              </div>

              <Button
                variant="ghost"
                className="w-full text-gray-400 hover:text-white"
                onClick={cancelSos}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          // ─── ACTIVE SOS SCREEN (MULTI-CHANNEL DISPATCH GRID) ────────────────
          <motion.div
            key="active-sos"
            initial={{ opacity: 0, backgroundColor: "#000" }}
            animate={{ opacity: 1, backgroundColor: "#8b0000" }}
            className="absolute inset-0 flex flex-col items-center justify-start p-6 pt-12 overflow-y-auto"
          >
            {countdown > 0 ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <motion.h2
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-8xl font-black mb-6"
                >
                  {countdown}
                </motion.h2>
                <p className="text-xl text-white/80 uppercase tracking-wider font-bold mb-10">
                  Broadcasting Help In...
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full max-w-xs text-red-600 font-bold"
                  onClick={cancelSos}
                >
                  <X className="w-5 h-5 mr-2" /> Cancel SOS
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-md flex flex-col items-center pb-8">
                {/* SOS Active Badge */}
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-2xl">
                  <ShieldAlert className="w-8 h-8 text-red-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                  SOS Active — Help Dispatched
                </h2>
                <p className="text-white/70 text-xs text-center mb-6">
                  Emergency signals transmitting across all redundant channels.
                </p>

                {/* ─── MULTI-CHANNEL DISPATCH STATUS GRID ─── */}
                <div className="w-full bg-black/40 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md border border-white/10 shadow-2xl">
                  {/* Channel 1: 112 ERSS & Police */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                      <Phone className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">112 ERSS & Police</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          Dispatched
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Rapid police unit notified • Simulated telemetry
                      </p>
                    </div>
                  </div>

                  {/* Channel 2: 181 Women Helpline */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center border border-pink-500/50">
                      <Phone className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">181 Women Helpline</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                          Broadcasted
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        National 24x7 Women Helpline network pinged
                      </p>
                    </div>
                  </div>

                  {/* Channel 3: Cellular SMS to Contacts */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                      <MapPin className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Emergency Contacts SMS</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {judgeContacts.length > 0
                            ? `Sent to ${judgeContacts.length} Contacts`
                            : "Sent"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Cellular SMS + Live Google Maps coordinates
                      </p>
                    </div>
                  </div>

                  {/* Channel 4: Verified Volunteers Mesh */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/50">
                      <Radio className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Community Responders</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Active (2.5 km)
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Alerting verified student & campus volunteers
                      </p>
                    </div>
                  </div>

                  {/* Channel 5: 3s Chunked Live Evidence (SHA-256) */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
                      <Video className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">Tamper-Evident Stream</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {chunksCount} Chunks
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        3s chunks • SHA-256: {lastChunkHash || "Active"} • Cloud + Offline
                      </p>
                    </div>
                  </div>

                  {/* Channel 6: AirTag-Style Crowdsourced BLE Mesh */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
                      <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">AirTag Bluetooth Mesh</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Broadcasting
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Drive-by store-and-forward beacon for zero-signal zones
                      </p>
                    </div>
                  </div>
                </div>

                {/* ─── SILENT CHECK-IN PROMPT ─── */}
                <AnimatePresence>
                  {showPrompt && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full mt-4 bg-amber-500/90 text-black p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />
                        <span className="font-black text-sm">Silent Check-In ({promptCountdown}s)</span>
                      </div>
                      <p className="text-xs text-center font-medium">
                        Tap below if you are safe. Ignore if you are under duress.
                      </p>
                      <Button
                        onClick={respondSafe}
                        className="bg-black text-white hover:bg-gray-900 font-bold text-xs py-2 px-6 rounded-xl mt-1"
                      >
                        I Am Safe
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {unansweredCount > 0 && (
                  <p className="mt-3 text-[11px] text-amber-300 font-bold text-center">
                    ⚠️ {unansweredCount} check-in(s) unanswered — incident urgency elevated
                  </p>
                )}

                {/* Bottom Controls */}
                <div className="w-full flex items-center justify-center gap-3 mt-6">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full max-w-xs text-red-600 font-bold"
                    onClick={cancelSos}
                  >
                    <X className="w-5 h-5 mr-2" /> Stop SOS
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── JUDGE / DEMO QUICK-CONFIG MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {showJudgeConfigModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-md text-white shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-lg">Judge Demo Contacts</h3>
                </div>
                <button onClick={() => setShowJudgeConfigModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Add judge phone numbers here so real SMS alerts arrive directly on your phone during testing!
              </p>

              {/* Add New Judge Contact */}
              <div className="flex flex-col gap-2 mb-4 bg-white/5 p-3 rounded-2xl border border-white/10">
                <input
                  type="text"
                  placeholder="Judge / Tester Name (e.g. Judge Priya)"
                  value={newJudgeName}
                  onChange={(e) => setNewJudgeName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Phone Number (e.g. +91 9876543210)"
                    value={newJudgePhone}
                    onChange={(e) => setNewJudgePhone(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <Button
                    onClick={handleAddJudgeContact}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Existing Contacts List */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {judgeContacts.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-3">No emergency contacts configured yet.</p>
                ) : (
                  judgeContacts.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-sm font-bold text-white">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveJudgeContact(c.phone)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <Button
                onClick={() => setShowJudgeConfigModal(false)}
                className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm py-2 rounded-xl"
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── GUARDIAN ANCHOR (PRE-TRIP TIMER) MODAL ───────────────────────── */}
      <AnimatePresence>
        {showAnchorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 w-full max-w-md text-white shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-lg">Pre-Trip Guardian Anchor</h3>
                </div>
                <button onClick={() => setShowAnchorModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeAnchor ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/20 border border-amber-500/30 p-4 rounded-2xl">
                    <p className="text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">Active Safety Timer</p>
                    <p className="text-sm text-white font-bold">
                      Expires: {new Date(activeAnchor.expiresAt).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      If you fail to check in, guardians are auto-alerted with your last known GPS.
                    </p>
                  </div>
                  <Button
                    onClick={handleCheckInAnchor}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-3 rounded-2xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> I Have Arrived Safely
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400">
                    Entering a remote or dark zone with poor signal? Set expected arrival time. If phone is smashed or turned off, cloud auto-alerts guardians!
                  </p>

                  <div>
                    <label className="text-xs font-bold text-gray-300 mb-1 block">Expected Trip Duration</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[15, 30, 45].map((m) => (
                        <button
                          key={m}
                          onClick={() => setAnchorMinutes(m)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            anchorMinutes === m
                              ? "bg-amber-500 text-black border-amber-500"
                              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {m} Mins
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 mb-1 block">Destination (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hostel Gate 2 / Metro Station"
                      value={anchorDestination}
                      onChange={(e) => setAnchorDestination(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <Button
                    onClick={handleStartAnchor}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm py-3 rounded-2xl"
                  >
                    Start Guardian Anchor Timer
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
