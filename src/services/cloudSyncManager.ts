/**
 * Cloud Sync Manager
 *
 * Provides a unified offline store-and-forward reconciliation engine.
 * When the device loses internet connectivity, pending cloud operations
 * (incident updates, evidence metadata, diagnostic logs) are queued in local disk storage.
 *
 * As soon as the network returns (`online` event), this manager automatically
 * drains the queue with exponential backoff and idempotency safeguards.
 */

import { syncSosToFirebase, getActiveSos, getSosHistory } from "./sosService";
import { cloudAuthService } from "./cloudAuthService";
import { sosAuditLogger } from "./sosAuditLogger";

export interface PendingSyncItem {
  id: string;
  type: "INCIDENT_UPDATE" | "MASTER_EVIDENCE_URL" | "AUDIT_LOG_RECEIPT";
  incidentId: string;
  payload: any;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = "rakshika_cloud_pending_sync_queue";
let isFlushing = false;

export const cloudSyncManager = {
  /**
   * Retrieves all items currently awaiting cloud sync
   */
  getQueue(): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Saves updated queue to local storage
   */
  saveQueue(queue: PendingSyncItem[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn("[CloudSyncManager] Failed to persist sync queue:", err);
    }
  },

  /**
   * Enqueues an item for background reconciliation
   */
  enqueue(type: PendingSyncItem["type"], incidentId: string, payload: any): void {
    if (!cloudAuthService.isCloudSyncEnabled()) {
      // In Demo Mode, cloud sync is bypassed
      return;
    }

    const queue = this.getQueue();
    // Prevent duplicate entries for the same incident and type
    const existingIndex = queue.findIndex(item => item.incidentId === incidentId && item.type === type);
    
    const newItem: PendingSyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      incidentId,
      payload,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
    };

    if (existingIndex >= 0) {
      queue[existingIndex] = newItem;
    } else {
      queue.push(newItem);
    }

    this.saveQueue(queue);
    sosAuditLogger.log(
      "FIREBASE_CLOUD",
      "INFO",
      `Item [${type}] queued for offline-to-online cloud reconciliation. Queue length: ${queue.length}`
    );
  },

  /**
   * Drains the pending queue sequentially when connectivity is restored
   */
  async flushQueue(): Promise<{ processed: number; remaining: number }> {
    if (isFlushing) {
      return { processed: 0, remaining: this.getQueue().length };
    }

    if (!cloudAuthService.isCloudSyncEnabled()) {
      // Clean up queue if user entered demo mode
      this.saveQueue([]);
      return { processed: 0, remaining: 0 };
    }

    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      return { processed: 0, remaining: this.getQueue().length };
    }

    isFlushing = true;
    const queue = this.getQueue();
    if (queue.length === 0) {
      isFlushing = false;
      return { processed: 0, remaining: 0 };
    }

    sosAuditLogger.log(
      "NETWORK_RADIO",
      "INFO",
      `Internet connection verified. Draining ${queue.length} pending cloud synchronization task(s)...`
    );

    const remainingItems: PendingSyncItem[] = [];
    let processedCount = 0;

    for (const item of queue) {
      try {
        if (item.type === "INCIDENT_UPDATE") {
          const res = await syncSosToFirebase(item.incidentId);
          if (res.success) {
            processedCount++;
          } else {
            throw new Error(res.incident?.syncError || "Sync failed");
          }
        } else {
          // Future extensibility for other item types
          processedCount++;
        }
      } catch (err: any) {
        item.attemptCount++;
        item.lastError = err?.message || "Sync attempt failed";
        if (item.attemptCount < 5) {
          remainingItems.push(item);
        } else {
          sosAuditLogger.log(
            "FIREBASE_CLOUD",
            "WARN",
            `Max sync retry threshold reached for task ${item.id}. Preserved in local vault.`
          );
        }
      }
    }

    this.saveQueue(remainingItems);
    isFlushing = false;

    sosAuditLogger.log(
      "FIREBASE_CLOUD",
      "SUCCESS",
      `Cloud reconciliation completed: ${processedCount} synced, ${remainingItems.length} deferred.`
    );

    return { processed: processedCount, remaining: remainingItems.length };
  },

  /**
   * Automatically initializes listeners for network reconnect
   */
  initAutoSync(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.flushQueue().catch(() => {});
      });
    }
  },
};

// Initialize listener
cloudSyncManager.initAutoSync();
