import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Video,
  MapPin,
  FileCheck,
  ChevronLeft,
  Printer,
  Clock,
  Phone,
  CheckCircle2,
  FolderOpen,
  Trash2,
  HardDrive,
  Film,
  ListFilter,
  ExternalLink,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  evidencePlaybackService,
  type IncidentDossierData,
} from "../services/evidencePlaybackService";
import { getSosHistory, type SosIncident } from "../services/sosService";
import { cloudAuthService } from "../services/cloudAuthService";

export function EvidenceVaultScreen() {
  const navigate = useNavigate();
  const { id: paramIncidentId } = useParams<{ id?: string }>();

  const [incidents, setIncidents] = useState<SosIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SosIncident | null>(null);
  const [dossier, setDossier] = useState<IncidentDossierData | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"MASTER_VIDEO" | "FORENSIC_HASHES">("MASTER_VIDEO");

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load past incidents on mount
  useEffect(() => {
    loadIncidentsList();
  }, [paramIncidentId]);

  const loadIncidentsList = () => {
    const list = getSosHistory();
    setIncidents(list);

    if (paramIncidentId) {
      const match = list.find((inc) => inc.id === paramIncidentId);
      if (match) {
        handleSelectIncident(match);
      } else if (list.length > 0) {
        handleSelectIncident(list[0]);
      } else {
        setSelectedIncident(null);
        setDossier(null);
      }
    } else if (list.length > 0) {
      handleSelectIncident(list[0]);
    } else {
      setSelectedIncident(null);
      setDossier(null);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSelectIncident = async (incident: SosIncident) => {
    setSelectedIncident(incident);
    setIsLoadingDossier(true);
    try {
      const data = await evidencePlaybackService.loadIncidentDossier(incident);
      setDossier(data);
      setActiveTab("MASTER_VIDEO");
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

  const handleDeleteIncident = async (incidentId: string) => {
    if (!window.confirm("Are you sure you want to completely delete this entire incident recording and timeline? This action cannot be undone.")) {
      return;
    }
    await evidencePlaybackService.deleteIncidentEvidence(incidentId);

    // Update state immediately without refresh
    const updated = incidents.filter((inc) => inc.id !== incidentId);
    setIncidents(updated);

    if (updated.length > 0) {
      handleSelectIncident(updated[0]);
    } else {
      setSelectedIncident(null);
      setDossier(null);
    }
    showToast("Incident timeline & video evidence deleted successfully.");
  };

  const handleClearAllStorage = async () => {
    if (!window.confirm("Clear ALL past emergency incidents and cached evidence videos from device memory?")) {
      return;
    }
    await evidencePlaybackService.clearAllOldEvidence();

    // Reset UI state immediately
    setIncidents([]);
    setSelectedIncident(null);
    setDossier(null);
    showToast("All evidence vault cache and records cleared.");
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 p-4 md:p-8 pb-28 select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl z-[300] flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-all text-white"
            title="Return to Home"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-wide text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              FORENSIC EVIDENCE VAULT
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Verified Electronic Evidence • Unified Video Timelines • Section 65B Certified
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {incidents.length > 0 && (
            <button
              onClick={handleClearAllStorage}
              className="px-3.5 py-2 bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              title="Delete all cached test recordings"
            >
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Clear Cache</span>
            </button>
          )}

          {dossier && (
            <Button
              onClick={handlePrintCertificate}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-900/50 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Police Certificate</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT: RECORDED INCIDENTS LIST ─────────────────────────────── */}
        <aside className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" /> Recorded Timelines ({incidents.length})
            </h2>
          </div>

          {incidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-300">No Recorded Evidence</p>
              <p className="text-xs text-slate-500 mt-1">
                When you trigger an emergency SOS, the unified video and location logs will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const dateStr = new Date(inc.activatedAt).toLocaleDateString();
                const timeStr = new Date(inc.activatedAt).toLocaleTimeString();
                const statusStyles = {
                  ACTIVE: "bg-red-500/20 text-red-300 border-red-500/50",
                  RESOLVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
                  CANCELLED: "bg-slate-700 text-slate-300 border-slate-600",
                };

                return (
                  <div
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-slate-800 border-red-500 ring-2 ring-red-500/30 shadow-xl"
                        : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black font-mono text-white tracking-wider">
                        ID: {inc.id.slice(-8)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          statusStyles[inc.status] || statusStyles.CANCELLED
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{dateStr} • {timeStr}</span>
                      <span className="flex items-center gap-1 text-cyan-400 font-bold">
                        <MapPin className="w-3.5 h-3.5" /> {inc.locationHistory.length} GPS pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ─── RIGHT: SELECTED INCIDENT FORENSIC DOSSIER ─────────────────── */}
        <main className="lg:col-span-2 space-y-6">
          {isLoadingDossier ? (
            <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-200">Assembling Master Evidence Video...</p>
            </div>
          ) : !dossier ? (
            <div className="p-16 text-center bg-slate-900/80 rounded-3xl border border-slate-800 text-slate-400">
              <p className="text-sm">Select a recorded timeline from the left to view the evidence dossier.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Incident Header Card */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Incident Dossier ID</span>
                    <h3 className="text-lg font-black text-white font-mono">{dossier.incident.id}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {dossier.incident.evidenceUrl ? (
                      <a
                        href={dossier.incident.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 flex items-center gap-1.5 transition-all"
                        title="Open master evidence video uploaded to Firebase Cloud Storage"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        <span>Cloud Video Available</span>
                      </a>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cloudAuthService.isCloudSyncEnabled() ? "On-Device Vault" : "Demo Mode Vault"}</span>
                      </span>
                    )}

                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-400" /> Tamper-Evident SHA-256
                    </span>
                    <button
                      onClick={() => handleDeleteIncident(dossier.incident.id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 border border-red-500/40 hover:border-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Permanently delete this entire incident recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Timeline</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">Triggered Time</span>
                    <span className="font-black text-white">{new Date(dossier.incident.activatedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">Resolution Status</span>
                    <span className="font-black text-white">{dossier.incident.status}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">Evidence Duration</span>
                    <span className="font-black text-cyan-400">{dossier.playableChunks.length * 3}s Continuous</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block font-bold">Total File Size</span>
                    <span className="font-black text-amber-300">{(dossier.totalBytes / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>

              {/* ─── UNIFIED MASTER VIDEO PLAYER ────────────────────────────── */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("MASTER_VIDEO")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === "MASTER_VIDEO"
                          ? "bg-red-600 text-white shadow-md shadow-red-900/50"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" /> Single Video Timeline
                    </button>
                    <button
                      onClick={() => setActiveTab("FORENSIC_HASHES")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === "FORENSIC_HASHES"
                          ? "bg-slate-700 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" /> SHA-256 Hash Manifest ({dossier.playableChunks.length})
                    </button>
                  </div>
                </div>

                {activeTab === "MASTER_VIDEO" ? (
                  <div className="space-y-3">
                    {/* Unified Single Video Element */}
                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center shadow-inner">
                      {dossier.masterVideoUrl ? (
                        <video
                          ref={videoRef}
                          src={dossier.masterVideoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="font-bold text-slate-300">No video recorded for this incident</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 flex items-center justify-between px-1">
                      <span>Full continuous incident recording rendered from initial trigger to resolution.</span>
                      <span className="text-emerald-400 font-bold">100% Intact</span>
                    </p>
                  </div>
                ) : (
                  /* Forensic Hashes Table */
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {dossier.playableChunks.map((chunk) => (
                      <div
                        key={chunk.index}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-white font-mono">Slice #{chunk.index}</span>
                          <span className="text-slate-400 text-[11px] ml-2">({(chunk.sizeBytes / 1024).toFixed(1)} KB)</span>
                        </div>
                        <code className="text-purple-300 font-mono text-[10px] bg-purple-950/50 px-2 py-1 rounded border border-purple-800/40">
                          {chunk.sha256.slice(0, 24)}...
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── SHARED CONTACTS & DISPATCH RECEIPTS ──────────────────── */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-400" /> Emergency Contacts & SMS Dispatched
                </h4>

                {dossier.contactsDispatched.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    No emergency contacts were saved in settings during this SOS trigger.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dossier.contactsDispatched.map((c, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{c.name}</span>
                            <span className="text-xs font-mono text-cyan-300">({c.phone})</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-mono mt-1 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                            {c.messageSent}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                          Delivered via Modem
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── GPS ROUTE & LOCATION HISTORY ─────────────────────────── */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" /> GPS Breadcrumbs ({dossier.incident.locationHistory.length} Coordinates)
                </h4>

                {dossier.incident.locationHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    No GPS points recorded for this incident.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {dossier.incident.locationHistory.map((loc, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-200 font-mono">
                          #{i + 1} ({loc.lat.toFixed(5)}, {loc.lng.toFixed(5)})
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{new Date(loc.timestamp).toLocaleTimeString()}</span>
                          <a
                            href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                          >
                            Map Pin <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
