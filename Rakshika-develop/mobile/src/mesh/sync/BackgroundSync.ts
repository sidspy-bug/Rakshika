/**
 * Background Sync — Uses expo-task-manager for background packet sync.
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { CloudSync } from './CloudSync';
import { RelayEngine } from '../engine/RelayEngine';
import { MeshLogger } from '../logging/MeshLogger';

const BACKGROUND_SYNC_TASK = 'RAKSHIKA_MESH_BACKGROUND_SYNC';

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    MeshLogger.info('SYNC', 'Background sync task fired');

    // Clean up expired packets
    await RelayEngine.cleanupExpired();

    // Attempt to sync queued packets
    const result = await CloudSync.syncAll();

    if (result.synced > 0) {
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    MeshLogger.error('SYNC', 'Background sync task failed', { error: String(error) });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const BackgroundSync = {
  /**
   * Register the background sync task.
   * Runs every 15 minutes (minimum interval on iOS).
   */
  async register(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();

      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        MeshLogger.warn('SYNC', 'Background fetch denied by OS');
        return false;
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        MeshLogger.warn('SYNC', 'Background fetch restricted by OS');
        return false;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      MeshLogger.info('SYNC', 'Background sync task registered');
      return true;
    } catch (error) {
      MeshLogger.error('SYNC', 'Failed to register background sync', { error: String(error) });
      return false;
    }
  },

  /**
   * Unregister the background sync task.
   */
  async unregister(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        MeshLogger.info('SYNC', 'Background sync task unregistered');
      }
    } catch (error) {
      MeshLogger.warn('SYNC', 'Failed to unregister background sync', { error: String(error) });
    }
  },

  /**
   * Check if the background task is registered.
   */
  async isRegistered(): Promise<boolean> {
    return TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  },
};
