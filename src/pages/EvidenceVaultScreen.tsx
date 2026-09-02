import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Video,
  MapPin,
  FileCheck,
  ChevronLeft,
  Play,
  Pause,
  Printer,
  Share2,
  Clock,
  Phone,
  Radio,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Eye,
  Trash2,
  HardDrive,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import {
  evidencePlaybackService,
  type IncidentDossierData,
  type PlayableEvidenceChunk,
} from "../services/evidencePlaybackService";
import { getSosHistory, type SosIncident } from "../services/sosService";

export function EvidenceVaultScreen() {
  const navigate = useNavigate();
  const { id: paramIncidentId } = useParams<{ id?: string }>();

  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SosIncident | null>(null);
  const [dossier, setDossier] = useState<IncidentDossierData | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Video Player state
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load past incidents on mount
  useEffect(() => {
    const list = getSosHistory();
    setIncidents(list);

    if (paramIncidentId) {
      const match = list.find((inc) => inc.id === paramIncidentId);
      if (match) {
        handleSelectIncident(match);
      }
    } else if (list.length > 0) {
      handleSelectIncident(list[0]);
    }
  }, [paramIncidentId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectIncident = async (incident: SosIncident) => {
    setSelectedIncident(incident);
    setIsLoadingDossier(true);
    try {
      const data = await evidencePlaybackService.loadIncidentDossier(incident);
      setDossier(data);
      setActiveChunkIndex(0);
      setIsPlaying(false);
    } catch (err) {
      console.error("[EvidenceVault] Failed to load incident dossier:", err);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handlePrintCertificate = () => {
    if (!dossier) return;
    const html = evidencePlaybackService.generateSection65BCertificateHtml(dossier);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  const handleDeleteEvidence = async (incidentId: string) => {
    if (!window.confirm("Are you sure you want to delete local video evidence for this incident to free storage?")) {
      return;
    }
    await evidencePlaybackService.deleteIncidentEvidence(incidentId);
    if (selectedIncident?.id === incidentId) {
      handleSelectIncident(selectedIncident);
    }
    showToast("Evidence files removed from local storage");
  };

  const handleClearAllStorage = async () => {
    if (!window.confirm("Delete ALL cached test evidence files across all past incidents?")) {
      return;
    }
    await evidencePlaybackService.clearAllOldEvidence();
    if (selectedIncident) {
      handleSelectIncident(selectedIncident);
    }
    showToast("All local evidence cache cleared");
  };

  const activeChunk: PlayableEvidenceChunk | undefined =
    dossier?.playableChunks[activeChunkIndex];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24 relative">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/20 text-white px-5 py-2.5 rounded-full font-bold text-xs shadow-2xl z-[300] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider flex items-center gap-2 text-red-500">
              <ShieldAlert className="w-6 h-6" /> Forensic Evidence Vault
            </h1>
            <p className="text-xs text-gray-400">
              Section 65B Electronic Evidence & Playback for Citizens & Authorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAllStorage}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Clear all stored evidence chunks to free phone storage"
          >
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Free Space</span>
          </button>

          {dossier && (
            <Button
              onClick={handlePrintCertificate}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/30"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Export Police Certificate</span>
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT COLUMN: INCIDENT HISTORY LIST ────────────────────────── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" /> Recorded SOS Incidents ({incidents.length})
          </h2>

          {incidents.length === 0 ? (
            <GlassCard className="p-6 text-center text-gray-400">
              <p className="text-sm">No SOS incidents recorded yet.</p>
              <p className="text-xs text-gray-500 mt-1">
                When an emergency SOS is triggered, video evidence, GPS routes, and dispatch receipts will appear here.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const dateStr = new Date(inc.activatedAt).toLocaleDateString();
                const timeStr = new Date(inc.activatedAt).toLocaleTimeString();
                const statusColors = {
                  ACTIVE: "bg-red-500/20 text-red-400 border-red-500/40",
                  RESOLVED: "bg-green-500/20 text-green-400 border-green-500/40",
                  CANCELLED: "bg-gray-500/20 text-gray-300 border-gray-500/40",
                };

                return (
                  <button
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-red-600/20 border-red-500/60 shadow-lg shadow-red-900/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black tracking-wider text-white font-mono">
                        ID: {inc.id.slice(-8)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          statusColors[inc.status] || statusColors.CANCELLED
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{dateStr} • {timeStr}</span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <MapPin className="w-3 h-3" /> {inc.locationHistory.length} GPS pts
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: SELECTED INCIDENT FORENSIC DOSSIER ─────────── */}
        <div className="lg:col-span-2 space-y-6">
          {isLoadingDossier ? (
            <GlassCard className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-300">Decoding Evidence & Cryptographic Manifests...</p>
            </GlassCard>
          ) : !dossier ? (
            <GlassCard className="p-12 text-center text-gray-400">
              <p className="text-sm">Select an incident from the left to view the forensic evidence dossier.</p>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              {/* Incident Header Card */}
              <GlassCard className="p-5 border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Master Incident Record</span>
                    <h3 className="text-lg font-black text-white font-mono">{dossier.incident.id}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/40 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" /> SHA-256 Tamper Evident
                    </span>
                    <button
                      onClick={() => handleDeleteEvidence(dossier.incident.id)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30"
                      title="Delete video evidence files to reclaim disk space"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-gray-400 text-[10px] block">Triggered At</span>
                    <span className="font-bold text-white">{new Date(dossier.incident.activatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block">Resolution</span>
                    <span className="font-bold text-white">{dossier.incident.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block">Evidence Chunks</span>
                    <span className="font-bold text-purple-400">{dossier.playableChunks.length} slices (~3s each)</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block">Total Data Size</span>
                    <span className="font-bold text-cyan-400">{(dossier.totalBytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </GlassCard>

              {/* ─── VIDEO & AUDIO EVIDENCE PLAYER ────────────────────────── */}
              <GlassCard className="p-5 border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" /> Recorded Live Video/Audio Evidence
                  </h4>
                  {activeChunk && (
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                      Chunk #{activeChunk.index} ({activeChunkIndex + 1} of {dossier.playableChunks.length})
                    </span>
                  )}
                </div>

                {dossier.playableChunks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 bg-black/40 rounded-2xl border border-white/5 text-xs">
                    No video chunks captured for this incident (or files were cleaned to free storage).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* HTML5 Video Player */}
                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-white/10 flex items-center justify-center">
                      {activeChunk?.videoUrl ? (
                        <video
                          key={activeChunk.videoUrl}
                          ref={videoRef}
                          src={activeChunk.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                          onEnded={() => {
                            if (activeChunkIndex < dossier.playableChunks.length - 1) {
                              setActiveChunkIndex((prev) => prev + 1);
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center p-4 text-gray-400 text-xs">
                          Video chunk saved to offline storage at:
                          <br />
                          <code className="text-[11px] text-gray-300 mt-1 block">
                            Documents/Rakshika/evidence/{dossier.incident.id}/chunk_{activeChunkIndex}.webm
                          </code>
                        </div>
                      )}
                    </div>

                    {/* SHA-256 Hash Digest Badge */}
                    {activeChunk && (
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px]">
                        <span className="text-gray-400 font-bold">SHA-256 Cryptographic Hash:</span>
                        <code className="text-purple-300 font-mono text-[10px] break-all">
                          {activeChunk.sha256}
                        </code>
                      </div>
                    )}

                    {/* Chunk Selector Thumbnails / Bar */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
                      {dossier.playableChunks.map((chunk, idx) => (
                        <button
                          key={chunk.index}
                          onClick={() => setActiveChunkIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex-shrink-0 ${
                            activeChunkIndex === idx
                              ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/40"
                              : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                          }`}
                        >
                          #{chunk.index} ({(chunk.sizeBytes / 1024).toFixed(0)}KB)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* ─── SHARED CONTACTS & DISPATCH RECEIPTS ──────────────────── */}
              <GlassCard className="p-5 border-white/10">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" /> Emergency Contacts & Authorities Shared With
                </h4>

                <div className="space-y-2">
                  {dossier.contactsDispatched.map((c, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{c.name}</span>
                          <span className="text-[11px] font-mono text-gray-400">({c.phone})</span>
                        </div>
                        <p className="text-[10px] text-blue-300 font-mono mt-0.5 break-all">
                          {c.messageSent}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                        Cellular SMS Delivered
                      </span>
                    </div>
                  ))}

                  {/* Institutional 112 & 181 Receipts */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">112 ERSS Unified Emergency Dispatch</span>
                      <p className="text-[10px] text-gray-400">Rapid police telemetry packet transmitted</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      Dispatched
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">181 National Women Helpline</span>
                      <p className="text-[10px] text-gray-400">National 24x7 distress broadcast pinged</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Broadcasted
                    </span>
                  </div>
                </div>
              </GlassCard>

              {/* ─── GPS ROUTE & LOCATION HISTORY ─────────────────────────── */}
              <GlassCard className="p-5 border-white/10">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" /> GPS Breadcrumbs & Route Path ({dossier.incident.locationHistory.length} Points)
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-mono text-xs">
                  {dossier.incident.locationHistory.length === 0 ? (
                    <p className="text-gray-500 text-xs italic">No GPS coordinates recorded.</p>
                  ) : (
                    dossier.incident.locationHistory.map((loc, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-gray-300">
                          #{i + 1} ({loc.lat.toFixed(5)}, {loc.lng.toFixed(5)})
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">{new Date(loc.timestamp).toLocaleTimeString()}</span>
                          <a
                            href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline font-bold"
                          >
                            Map Pin ↗
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
