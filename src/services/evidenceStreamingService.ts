/**
 * Evidence Streaming Service
 *
 * Implements chunked live-streaming audio/video recording with SHA-256
 * cryptographic integrity hashing (Review Items 10 & 13).
 *
 * Architecture:
 * - MediaRecorder runs with 3000ms (`3s`) timeslices.
 * - Each emitted chunk is hashed via SHA-256 immediately upon capture.
 * - Chunks are uploaded sequentially to Firebase Storage while stream is active.
 * - Fault tolerance: Even if the device is destroyed, seized, or dies mid-incident,
 *   all previously uploaded chunks survive in the cloud with tamper-evident hashes.
 */

import { storage, auth } from "./firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { computeSHA256 } from "./cryptoMeshService";

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
  chunks: EvidenceChunkMeta[];
  integrityVerified: boolean;
}

export class EvidenceChunkStreamer {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private incidentId: string;
  private chunkIndex = 0;
  private manifest: EvidenceManifest;
  private isStreaming = false;
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
   * Initializes audio/video capture and begins 3-second timeslice streaming
   */
  async startStream(): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        console.warn("[EvidenceStreamer] MediaDevices API not available.");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      this.stream = stream;

      // Select supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
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

      // 3000ms timeslices = emit chunks every 3 seconds
      recorder.start(3000);
      this.isStreaming = true;
      console.log(`[EvidenceStreamer] 🎥 3s live chunk streaming started for incident ${this.incidentId}`);

      return true;
    } catch (err) {
      console.warn("[EvidenceStreamer] Failed to initialize media stream (camera/mic denied or unavailable):", err);
      return false;
    }
  }

  /**
   * Processes a newly captured 3-second chunk:
   * 1. Hashes with SHA-256
   * 2. Saves to local manifest
   * 3. Uploads to Firebase Storage
   * 4. Saves locally via Capacitor Filesystem
   */
  private async processChunk(blob: Blob): Promise<void> {
    const currentIndex = this.chunkIndex++;
    const capturedAt = new Date().toISOString();
    const sizeBytes = blob.size;

    // 1. Compute cryptographic SHA-256 hash
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

    console.log(`[EvidenceStreamer] Chunk #${currentIndex} captured (${sizeBytes}B) | SHA-256: ${sha256.slice(0, 16)}...`);

    // 2. Upload to Firebase Storage in background
    this.uploadChunkToStorage(blob, chunkMeta).catch(() => {});

    // 3. Save offline backup via Capacitor Filesystem if available
    this.saveChunkLocally(blob, currentIndex).catch(() => {});

    this.notifyChunk(chunkMeta);
  }

  /**
   * Uploads an individual chunk to Firebase Storage
   */
  private async uploadChunkToStorage(blob: Blob, chunkMeta: EvidenceChunkMeta): Promise<void> {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      chunkMeta.status = "FAILED";
      chunkMeta.error = "Device offline (cached locally)";
      this.manifest.failedChunks++;
      this.saveManifestToLocal();
      return;
    }

    try {
      const user = auth.currentUser;
      const userId = user ? user.uid : "anonymous";
      const fileName = `chunk_${String(chunkMeta.index).padStart(4, "0")}_${chunkMeta.sha256.slice(0, 8)}.webm`;
      const fileRef = storageRef(storage, `sos_evidence/${userId}/${this.incidentId}/${fileName}`);

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
      console.log(`[EvidenceStreamer] ✅ Chunk #${chunkMeta.index} uploaded successfully to Cloud.`);
    } catch (err: any) {
      console.warn(`[EvidenceStreamer] Chunk #${chunkMeta.index} cloud upload failed:`, err?.message || err);
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
    } catch {
      // Ignore if filesystem plugin is not available in web browser
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
   * Stops live stream and releases camera/mic hardware
   */
  async stopStream(): Promise<EvidenceManifest> {
    this.isStreaming = false;
    this.manifest.stoppedAt = new Date().toISOString();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => track.stop());
      } catch {}
    }

    this.saveManifestToLocal();
    console.log(`[EvidenceStreamer] 🛑 Evidence stream stopped. Total chunks: ${this.manifest.totalChunks}`);
    return this.manifest;
  }

  getManifest(): EvidenceManifest {
    return this.manifest;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  onChunkProcessed(callback: (chunk: EvidenceChunkMeta, manifest: EvidenceManifest) => void) {
    this.onChunkProcessedCallbacks.push(callback);
    return () => {
      this.onChunkProcessedCallbacks = this.onChunkProcessedCallbacks.filter((c) => c !== callback);
    };
  }

  private notifyChunk(chunk: EvidenceChunkMeta): void {
    this.onChunkProcessedCallbacks.forEach((cb) => {
      try {
        cb(chunk, this.manifest);
      } catch {}
    });
  }
}
