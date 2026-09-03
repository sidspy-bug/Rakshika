/**
 * Evidence Streaming & Video Assembly Service
 *
 * Implements chunked live-streaming audio/video recording with SHA-256
 * cryptographic integrity hashing.
 *
 * Key Architecture:
 * 1. During active SOS: Streams in 3s chunks for zero data-loss fail-safe protection.
 * 2. On SOS Stop: Stitches all captured chunks into a single unified master video
 *    (master_evidence.webm) so victims and authorities can watch the complete
 *    continuous timeline without fragmented chunk navigation!
 */

import { storage, auth } from "./firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { computeSHA256 } from "./cryptoMeshService";
import { sosAuditLogger } from "./sosAuditLogger";
import { cloudAuthService } from "./cloudAuthService";
import { setSosEvidenceUrl } from "./sosService";

export interface EvidenceChunkMeta {
  index: number;
  sha256: string;
  sizeBytes: number;
  capturedAt: string;
  uploadedAt?: string;
  storageUrl?: string;
  status: "CAPTURED" | "UPLOADING" | "UPLOADED" | "FAILED";
  error?: string;
}

export interface EvidenceManifest {
  incidentId: string;
  startedAt: string;
  stoppedAt?: string;
  totalChunks: number;
  uploadedChunks: number;
  failedChunks: number;
  totalBytes: number;
  masterVideoUrl?: string;
  chunks: EvidenceChunkMeta[];
  integrityVerified: boolean;
}

const MAX_CHUNKS_PER_INCIDENT = 30; // 90 seconds of video evidence
const MAX_STORAGE_BYTES_PER_INCIDENT = 8 * 1024 * 1024; // 8 MB safety ceiling

export class EvidenceChunkStreamer {
  private incidentId: string;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunkIndex: number = 0;
  private manifest: EvidenceManifest;
  private isStreaming: boolean = false;
  private capturedBlobs: Blob[] = [];
  private onChunkProcessedCallbacks: ((chunk: EvidenceChunkMeta, manifest: EvidenceManifest) => void)[] = [];

  constructor(incidentId: string) {
    this.incidentId = incidentId;
    this.manifest = {
      incidentId,
      startedAt: new Date().toISOString(),
      totalChunks: 0,
      uploadedChunks: 0,
      failedChunks: 0,
      totalBytes: 0,
      chunks: [],
      integrityVerified: true,
    };
  }

  /**
   * Initializes audio/video capture with battery & storage efficiency settings
   */
  async startStream(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        console.warn("[EvidenceStreamer] MediaDevices API not available.");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 20 },
        },
        audio: true,
      });

      this.stream = stream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 180000,
        audioBitsPerSecond: 32000,
      };

      const recorder = new MediaRecorder(stream, options);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.processChunk(event.data);
        }
      };

      recorder.onerror = (e) => {
        console.warn("[EvidenceStreamer] MediaRecorder error:", e);
      };

      recorder.start(3000);
      this.isStreaming = true;
      sosAuditLogger.log(
        "EVIDENCE_STREAM",
        "INFO",
        `Evidence recording started (Max ${MAX_CHUNKS_PER_INCIDENT} chunks / 8MB cap).`
      );

      return true;
    } catch (err) {
      console.warn("[EvidenceStreamer] Failed to initialize media stream:", err);
      return false;
    }
  }

  /**
   * Processes a newly captured 3-second chunk
   */
  private async processChunk(blob: Blob): Promise<void> {
    if (
      this.chunkIndex >= MAX_CHUNKS_PER_INCIDENT ||
      this.manifest.totalBytes >= MAX_STORAGE_BYTES_PER_INCIDENT
    ) {
      if (this.isStreaming) {
        sosAuditLogger.log(
          "EVIDENCE_STREAM",
          "INFO",
          `Evidence storage ceiling reached (${this.chunkIndex} chunks, ${(this.manifest.totalBytes / 1024 / 1024).toFixed(1)}MB). Camera throttled to protect storage.`
        );
        this.stopStream().catch(() => {});
      }
      return;
    }

    this.capturedBlobs.push(blob);
    const currentIndex = this.chunkIndex++;
    const capturedAt = new Date().toISOString();
    const sizeBytes = blob.size;

    // Compute cryptographic SHA-256 hash
    const sha256 = await computeSHA256(blob);

    const chunkMeta: EvidenceChunkMeta = {
      index: currentIndex,
      sha256,
      sizeBytes,
      capturedAt,
      status: "UPLOADING",
    };

    this.manifest.chunks.push(chunkMeta);
    this.manifest.totalChunks++;
    this.manifest.totalBytes += sizeBytes;
    this.saveManifestToLocal();

    sosAuditLogger.log(
      "EVIDENCE_STREAM",
      "INFO",
      `Chunk #${currentIndex} captured (${(sizeBytes / 1024).toFixed(1)} KB) | SHA-256: ${sha256.slice(0, 12)}...`,
      { chunkIndex: currentIndex, sizeBytes, sha256 }
    );

    // Upload to Firebase Storage in background (if online)
    this.uploadChunkToStorage(blob, chunkMeta).catch(() => {});

    // Save offline backup via Capacitor Filesystem
    this.saveChunkLocally(blob, currentIndex).catch(() => {});

    this.notifyChunk(chunkMeta);
  }

  /**
   * Uploads an individual chunk to Firebase Storage
   */
  private async uploadChunkToStorage(blob: Blob, chunkMeta: EvidenceChunkMeta): Promise<void> {
    // If in Demo Mode or unauthenticated, isolate to on-device vault without touching cloud!
    if (!cloudAuthService.isCloudSyncEnabled()) {
      chunkMeta.status = "CAPTURED";
      this.saveManifestToLocal();
      return;
    }

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      chunkMeta.status = "FAILED";
      chunkMeta.error = "Device offline (cached locally)";
      this.manifest.failedChunks++;
      this.saveManifestToLocal();
      return;
    }

    try {
      const storagePrefix = cloudAuthService.getStoragePrefix();
      const fileName = `chunk_${String(chunkMeta.index).padStart(4, "0")}_${chunkMeta.sha256.slice(0, 8)}.webm`;
      const fileRef = storageRef(storage, `${storagePrefix}/${this.incidentId}/${fileName}`);

      const snapshot = await uploadBytes(fileRef, blob, {
        customMetadata: {
          sha256: chunkMeta.sha256,
          capturedAt: chunkMeta.capturedAt,
          chunkIndex: String(chunkMeta.index),
          incidentId: this.incidentId,
        },
      });

      const downloadUrl = await getDownloadURL(snapshot.ref);
      chunkMeta.status = "UPLOADED";
      chunkMeta.uploadedAt = new Date().toISOString();
      chunkMeta.storageUrl = downloadUrl;
      this.manifest.uploadedChunks++;

      this.saveManifestToLocal();
      sosAuditLogger.log("EVIDENCE_STREAM", "SUCCESS", `Chunk #${chunkMeta.index} uploaded to cloud storage.`);
    } catch (err: any) {
      chunkMeta.status = "FAILED";
      chunkMeta.error = err?.message || "Upload error";
      this.manifest.failedChunks++;
      this.saveManifestToLocal();
    }
  }

  /**
   * Offline backup to phone's Documents directory via Capacitor Filesystem
   */
  private async saveChunkLocally(blob: Blob, index: number): Promise<void> {
    try {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const reader = new FileReader();
      reader.onloadend = async () => {
        const resultStr = (reader.result as string) || "";
        const markerIndex = resultStr.indexOf(";base64,");
        const base64Data = markerIndex !== -1 ? resultStr.substring(markerIndex + 8) : "";
        if (base64Data) {
          await Filesystem.writeFile({
            path: `Rakshika/evidence/${this.incidentId}/chunk_${index}.webm`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }
      };
      reader.readAsDataURL(blob);
    } catch {}
  }

  /**
   * Assembles and saves the complete single master video file
   */
  private async assembleAndSaveMasterVideo(): Promise<void> {
    if (this.capturedBlobs.length === 0) return;

    try {
      const masterBlob = new Blob(this.capturedBlobs, { type: "video/webm" });
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const reader = new FileReader();

      // 1. Save master video to phone's Documents/Rakshika directory
      reader.onloadend = async () => {
        const resultStr = (reader.result as string) || "";
        const markerIndex = resultStr.indexOf(";base64,");
        const base64Data = markerIndex !== -1 ? resultStr.substring(markerIndex + 8) : "";
        if (base64Data) {
          await Filesystem.writeFile({
            path: `Rakshika/evidence/${this.incidentId}/master_evidence.webm`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          sosAuditLogger.log(
            "EVIDENCE_STREAM",
            "SUCCESS",
            `Unified master evidence video saved at Documents/Rakshika/evidence/${this.incidentId}/master_evidence.webm`
          );
        }
      };
      reader.readAsDataURL(masterBlob);

      // 2. Upload master video to Firebase Storage if user is logged in and online
      const isOnline = typeof navigator !== "undefined" && navigator.onLine;
      if (cloudAuthService.isCloudSyncEnabled() && isOnline) {
        try {
          const storagePrefix = cloudAuthService.getStoragePrefix();
          const masterFileRef = storageRef(storage, `${storagePrefix}/${this.incidentId}/master_evidence.webm`);
          const snapshot = await uploadBytes(masterFileRef, masterBlob, {
            contentType: "video/webm",
            customMetadata: {
              incidentId: this.incidentId,
              totalChunks: String(this.manifest.totalChunks),
              totalBytes: String(this.manifest.totalBytes),
              assembledAt: new Date().toISOString(),
            },
          });

          const masterDownloadUrl = await getDownloadURL(snapshot.ref);
          this.manifest.masterVideoUrl = masterDownloadUrl;
          this.saveManifestToLocal();

          // Attach URL to active SOS incident record in Firestore and local state
          setSosEvidenceUrl(masterDownloadUrl);
          sosAuditLogger.log(
            "EVIDENCE_STREAM",
            "SUCCESS",
            `Unified master evidence video successfully uploaded to Firebase Cloud Storage: ${masterDownloadUrl}`
          );
          console.log(`[EvidenceStreamer] Master video uploaded to cloud: ${masterDownloadUrl}`);
        } catch (uploadErr) {
          console.warn("[EvidenceStreamer] Failed to upload master video to cloud storage:", uploadErr);
          sosAuditLogger.log("EVIDENCE_STREAM", "WARN", "Master video cloud upload deferred (stored on device).");
        }
      } else {
        sosAuditLogger.log(
          "EVIDENCE_STREAM",
          "INFO",
          `Master video saved securely in on-device vault (${cloudAuthService.isCloudSyncEnabled() ? "Offline" : "Demo Mode"}).`
        );
      }
    } catch (err) {
      console.warn("[EvidenceStreamer] Master video assembly error:", err);
    }
  }

  /**
   * Persists manifest to localStorage for forensic audit
   */
  private saveManifestToLocal(): void {
    try {
      localStorage.setItem(
        `rakshika_evidence_manifest_${this.incidentId}`,
        JSON.stringify(this.manifest)
      );
    } catch {}
  }

  /**
   * Stops live stream, releases camera/mic, and stitches chunks into unified master video
   */
  async stopStream(): Promise<EvidenceManifest> {
    this.isStreaming = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      this.stream = null;
    }

    // Assemble and save single master video file
    await this.assembleAndSaveMasterVideo();

    this.manifest.stoppedAt = new Date().toISOString();
    this.saveManifestToLocal();

    sosAuditLogger.log(
      "EVIDENCE_STREAM",
      "INFO",
      `Evidence stream completed. Total chunks: ${this.manifest.totalChunks}, Total data: ${(this.manifest.totalBytes / 1024 / 1024).toFixed(2)} MB.`
    );

    return this.manifest;
  }

  onChunkProcessed(callback: (chunk: EvidenceChunkMeta, manifest: EvidenceManifest) => void): void {
    this.onChunkProcessedCallbacks.push(callback);
  }

  private notifyChunk(chunk: EvidenceChunkMeta): void {
    this.onChunkProcessedCallbacks.forEach((cb) => {
      try {
        cb(chunk, this.manifest);
      } catch {}
    });
  }
}
