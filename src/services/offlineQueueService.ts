/**
 * offlineQueueService
 *
 * Manages an offline queue for volunteer actions (like updating status or location)
 * when the network is down. Syncs automatically when back online.
 */

import { emergencyResponseApi } from "./emergencyResponseApi";
import type { ResponseState } from "../types/volunteer";

export interface QueuedAction {
  id: string;
  type: "UPDATE_STATUS" | "RESOLVE_INCIDENT";
  payload: any;
  timestamp: string;
  retryCount: number;
}

const QUEUE_KEY = "rakshika_offline_action_queue";

export const offlineQueueService = {
  getQueue(): QueuedAction[] {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  setQueue(queue: QueuedAction[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  enqueueAction(type: QueuedAction["type"], payload: any): void {
    const queue = this.getQueue();
    queue.push({
      id: `queue-${Date.now()}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    });
    this.setQueue(queue);
    console.log(`[OfflineQueue] Enqueued action: ${type}`);
  },

  async processQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Processing ${queue.length} queued actions...`);
    
    const remainingQueue: QueuedAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === "UPDATE_STATUS") {
          await emergencyResponseApi.updateResponseStatus(
            action.payload.sosId,
            action.payload.state as ResponseState
          );
        } else if (action.type === "RESOLVE_INCIDENT") {
          await emergencyResponseApi.resolveIncident(
            action.payload.sosId,
            action.payload.resolution
          );
        }
        console.log(`[OfflineQueue] Successfully processed action: ${action.id}`);
      } catch (e) {
        console.error(`[OfflineQueue] Failed to process action: ${action.id}`, e);
        if (action.retryCount < 3) {
          remainingQueue.push({ ...action, retryCount: action.retryCount + 1 });
        } else {
          console.error(`[OfflineQueue] Action ${action.id} dropped after max retries.`);
        }
      }
    }

    this.setQueue(remainingQueue);
  },
};
