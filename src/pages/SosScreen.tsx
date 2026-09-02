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
  FileText,
  Copy,
  Download,
  Terminal,
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
import { sosAuditLogger, type SosAuditLogEntry } from "../services/sosAuditLogger";

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

  // Connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true)
  );

  // Advanced features state
  const [isGhostMode, setIsGhostModeState] = useState<boolean>(
    () => existingActive?.isGhostMode || false
  );
  const [isCovertBlackout, setIsCovertBlackout] = useState(false);
  const [showJudgeConfigModal, setShowJudgeConfigModal] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("ALL");
  const [auditLogs, setAuditLogs] = useState<SosAuditLogEntry[]>(() => sosAuditLogger.getLogs());

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

  // Track online/offline transitions & audit logs
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubLogs = sosAuditLogger.subscribe((logs) => {
      setAuditLogs([...logs]);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubLogs();
    };
  }, []);

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
        watchIdRef.current = null;
      }
      if (evidenceStreamerRef.current) {
        evidenceStreamerRef.current.stopStream().catch(() => {});
      }
    };
  }, []);

  const triggerSosActions = async () => {
    isStartedRef.current = true;

    // 1. Establish local-first synchronous SOS state
    const localIncident = createOrGetActiveSos();
    if (isGhostMode) {
      setGhostMode(true);
      setIsCovertBlackout(true);
    }
    setIncident(localIncident);
    setShowToast(true);
    setToastMsg(isOnline ? "Emergency SOS Dispatched" : "Offline SOS Activated (Radio Resilient)");
    setTimeout(() => setShowToast(false), 3500);

    // 2. Parallel GPS Acquisition & Multi-Channel Dispatch
    let currentCoords = { lat: 28.6139, lng: 77.2090 };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          cacheUserLocation(currentCoords);
          appendSosLocation(currentCoords);
          dispatchEngine.dispatchAll(localIncident, currentCoords);
        },
        () => {
          const cached = getCachedLastLocation();
          if (cached) {
            currentCoords = { lat: cached.lat, lng: cached.lng };
            sosAuditLogger.log(
              "GPS_TELEMETRY",
              "WARN",
              `Live GPS timeout (Airplane Mode?). Using cached last-known coordinates (${cached.lat.toFixed(5)}, ${cached.lng.toFixed(5)}).`
            );
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
      sosAuditLogger.log("EVIDENCE_STREAM", "WARN", `Evidence streaming could not initialize: ${err}`);
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

  // Judge contacts handlers
  const handleAddJudgeContact = () => {
    if (!newJudgePhone.trim()) return;
    const cleanPhone = newJudgePhone.trim().replace(/[\s\-()]/g, "");
    const updated = [
      ...judgeContacts,
      { name: newJudgeName.trim() || `Tester ${judgeContacts.length + 1}`, phone: cleanPhone },
    ];
    setJudgeContacts(updated);
    localStorage.setItem("rakshika-emergency-contacts", JSON.stringify(updated));
    setNewJudgeName("");
    setNewJudgePhone("");
    setToastMsg(`Added contact ${cleanPhone}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleRemoveJudgeContact = (index: number) => {
    const updated = judgeContacts.filter((_, i) => i !== index);
    setJudgeContacts(updated);
    localStorage.setItem("rakshika-emergency-contacts", JSON.stringify(updated));
  };

  // Pre-Trip Guardian Anchor handlers
  const handleStartAnchor = () => {
    const coords = getCachedLastLocation();
    const anchor = guardianAnchorService.startAnchor(
      anchorMinutes,
      anchorDestination || "Remote Area Zone",
      coords ? { lat: coords.lat, lng: coords.lng } : undefined
    );
    setActiveAnchor(anchor);
    setShowAnchorModal(false);
    setToastMsg(`Guardian Anchor Set for ${anchorMinutes} mins`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCheckInAnchor = () => {
    guardianAnchorService.checkInSafe();
    setActiveAnchor(null);
    setShowAnchorModal(false);
    setToastMsg("Safely Checked In! Anchor Cleared.");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Blackbox log actions
  const handleCopyLogs = () => {
    const text = sosAuditLogger.exportLogsAsText();
    navigator.clipboard.writeText(text);
    setToastMsg("Blackbox logs copied to clipboard!");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleExportLogs = async () => {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
      const text = sosAuditLogger.exportLogsAsText();
      const fileName = `Rakshika_Blackbox_${Date.now()}.log`;
      await Filesystem.writeFile({
        path: `Rakshika/logs/${fileName}`,
        data: text,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      setToastMsg(`Saved to Documents/Rakshika/logs/${fileName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    } catch {
      handleCopyLogs();
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (logFilter === "ALL") return true;
    if (logFilter === "SMS") return l.category === "SMS_CELLULAR";
    if (logFilter === "GPS") return l.category === "GPS_TELEMETRY";
    if (logFilter === "EVIDENCE") return l.category === "EVIDENCE_STREAM";
    if (logFilter === "BLE") return l.category === "BLE_AIRTAG_MESH";
    if (logFilter === "ERRORS") return l.level === "ERROR" || l.level === "CRITICAL" || l.level === "WARN";
    return true;
  });

  // Render Covert Blackout screen if Ghost Mode is active
  if (isCovertBlackout) {
    return (
      <div
        onClick={handleCovertTap}
        className="fixed inset-0 z-[300] bg-black text-black flex items-center justify-center select-none cursor-pointer"
        style={{ backgroundColor: "#000000" }}
      >
        <div className="sr-only">
          Covert Ghost Mode active. Triple tap screen within 1 second to reveal active interface.
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
            className="flex flex-col items-center justify-between w-full h-full p-6 pt-10 pb-8"
          >
            {/* Top Bar: Anchor, Judge Contacts & Blackbox Logs */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 max-w-md px-1">
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
                onClick={() => setShowLogsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Blackbox Logs</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </button>

              <button
                onClick={() => setShowJudgeConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Contacts ({judgeContacts.length})</span>
              </button>
            </div>

            {/* Offline Status Warning Banner */}
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md mt-2 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2"
              >
                <WifiOff className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  <strong>Offline Mode Active:</strong> Cellular SMS, AirTag BLE Mesh, and SHA-256 disk logging will protect you without internet.
                </span>
              </motion.div>
            )}

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

            {/* Bottom Indicator Bar */}
            <div className="w-full max-w-md flex items-center justify-between text-xs text-gray-400 bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>AirTag Mesh: {meshStats.cachedRelaysCount} Relays</span>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-400" />
                )}
                <span>{isOnline ? "Cellular/Cloud Online" : "Offline Protected"}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          // ─── ACTIVATED SCREEN ──────────────────────────────────────────────
          <motion.div
            key="activated-sos"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-between w-full h-full p-6 pt-10 pb-8 bg-gradient-to-b from-[#b71c1c] via-[#5f0909] to-black overflow-y-auto"
          >
            {countdown > 0 ? (
              // Cancellation window (3-second buffer)
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">
                    Dispatching SOS In
                  </h2>
                  <div className="text-8xl font-black text-white">{countdown}</div>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-red-600 hover:bg-gray-200 font-bold px-8 py-4 rounded-full text-lg shadow-2xl"
                  onClick={cancelSos}
                >
                  <X className="w-6 h-6 mr-2" /> Cancel SOS
                </Button>
              </div>
            ) : (
              // ─── FULL ACTIVE SOS DISPATCH DASHBOARD ─────────────────────────
              <div className="flex flex-col items-center w-full max-w-md">
                {/* SOS Active Badge & Top Controls */}
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/30 text-red-200 border border-red-500/40">
                    ID: {incident?.id.slice(-8) || "ACTIVE"}
                  </span>
                  <button
                    onClick={() => setShowLogsModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-cyan-300 border border-cyan-500/50 hover:bg-black/80"
                  >
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Blackbox Log</span>
                  </button>
                </div>

                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2 shadow-2xl">
                  <ShieldAlert className="w-8 h-8 text-red-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                  SOS Active — Help Dispatched
                </h2>
                <p className="text-white/70 text-xs text-center mb-4">
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
                          {dispatchState?.channels.CELLULAR_SMS.status === "SUCCESS"
                            ? "Sent via Modem"
                            : dispatchState?.channels.CELLULAR_SMS.status === "FAILED"
                            ? isOnline
                              ? "Failed"
                              : "Modem Offline (Airplane Mode)"
                            : "Dispatching..."}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60">
                        Plain ASCII SMS + Live Google Maps coordinates
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
                        3s chunks • SHA-256: {lastChunkHash || "Active"} • Cloud + Disk
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

      {/* ─── BLACKBOX DIAGNOSTIC LOGS MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {showLogsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="bg-gray-950 border border-white/10 rounded-3xl p-5 w-full max-w-lg text-white shadow-2xl flex flex-col max-h-[88vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-base">SOS Blackbox Audit Logs</h3>
                    <p className="text-[10px] text-gray-400">
                      Stored in Documents/Rakshika/logs/ • {auditLogs.length} events
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {["ALL", "SMS", "GPS", "EVIDENCE", "BLE", "ERRORS"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        logFilter === filter
                          ? "bg-cyan-500 text-black border-cyan-400 font-black"
                          : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/10 text-gray-200"
                    title="Copy full diagnostic log to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleExportLogs}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-black font-black"
                    title="Export log file to phone documents"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Log List View */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1 font-mono text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-xs">
                    No logs recorded for filter "{logFilter}". Trigger SOS to generate audit events.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const levelColors = {
                      CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
                      ERROR: "bg-red-500/20 text-red-400 border-red-500/30",
                      WARN: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                      SUCCESS: "bg-green-500/20 text-green-300 border-green-500/30",
                      INFO: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                    };
                    const colorClass = levelColors[log.level] || levelColors.INFO;

                    return (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-xl border ${colorClass} flex flex-col gap-1`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75">
                          <span className="font-bold tracking-wider">
                            [{log.category}] • {log.level}
                          </span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-white text-xs leading-relaxed">{log.message}</p>
                        {log.details && (
                          <pre className="text-[10px] text-gray-400 overflow-x-auto bg-black/40 p-1.5 rounded-lg">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  Network:{" "}
                  <strong className={isOnline ? "text-green-400" : "text-amber-400"}>
                    {isOnline ? "ONLINE" : "OFFLINE (Airplane Mode)"}
                  </strong>
                </span>
                <button
                  onClick={() => sosAuditLogger.clearLogs()}
                  className="text-red-400 hover:text-red-300 text-[10px] font-bold"
                >
                  Clear Buffer
                </button>
              </div>
            </div>
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
                  placeholder="Tester / Judge Name (e.g. Mentor Dr. Sharma)"
                  value={newJudgeName}
                  onChange={(e) => setNewJudgeName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Phone with country code (e.g. +918292630529)"
                    value={newJudgePhone}
                    onChange={(e) => setNewJudgePhone(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                  <Button
                    onClick={handleAddJudgeContact}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Contacts List */}
              <div className="max-h-48 overflow-y-auto space-y-2 mb-4 pr-1">
                {judgeContacts.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">
                    No contacts configured. Enter your phone number above!
                  </p>
                ) : (
                  judgeContacts.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{c.name}</p>
                        <p className="text-[11px] font-mono text-gray-400">{c.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveJudgeContact(i)}
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
                className="w-full bg-white text-black font-bold text-sm py-2.5 rounded-2xl hover:bg-gray-200"
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
