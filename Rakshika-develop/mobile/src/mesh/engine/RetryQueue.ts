/**
 * Retry Queue — Exponential backoff for cloud upload retries.
 */

import { MeshLogger } from '../logging/MeshLogger';

const MAX_RETRIES = 20;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 5 * 60 * 1000; // 5 minutes

export const RetryQueue = {
  /**
   * Calculate the next retry delay using exponential backoff with jitter.
   */
  getNextDelay(retryCount: number): number {
    if (retryCount >= MAX_RETRIES) return -1; // No more retries
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
    const jitter = delay * 0.2 * Math.random(); // 20% jitter
    return Math.floor(delay + jitter);
  },

  /**
   * Whether retries are exhausted.
   */
  isExhausted(retryCount: number): boolean {
    return retryCount >= MAX_RETRIES;
  },

  /**
   * Check if enough time has passed since last retry.
   */
  canRetry(retryCount: number, lastRetryAt: number | undefined): boolean {
    if (retryCount >= MAX_RETRIES) return false;
    if (!lastRetryAt) return true;
    const requiredDelay = this.getNextDelay(retryCount);
    if (requiredDelay < 0) return false;
    return Date.now() - lastRetryAt >= requiredDelay;
  },

  getMaxRetries(): number {
    return MAX_RETRIES;
  },
};
