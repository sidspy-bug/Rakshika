/**
 * Evidence Database — SQLite CRUD for the offline evidence queue.
 */

import * as SQLite from 'expo-sqlite';
import { MESH_DB_NAME } from '../mesh/storage/migrations';

export interface EvidenceQueueRecord {
  id: number;
  emergencyId: string;
  fileUri: string;
  type: 'audio' | 'video' | 'photo';
  status: 'pending' | 'uploading' | 'synced' | 'failed';
  metadata: string; // JSON string
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    // Open the same database where the tables are created
    db = await SQLite.openDatabaseAsync(MESH_DB_NAME);
  }
  return db;
}

export const EvidenceDatabase = {
  /**
   * Enqueue a new evidence record for offline upload.
   */
  async enqueueEvidence(
    emergencyId: string,
    fileUri: string,
    type: 'audio' | 'video' | 'photo',
    metadata: any
  ): Promise<number> {
    try {
      const database = await getDb();
      const now = Date.now();
      const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
      
      const result = await database.runAsync(
        `INSERT INTO evidence_queue 
         (emergency_id, file_uri, type, status, metadata, retry_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [emergencyId, fileUri, type, 'pending', metadataStr, 0, now, now]
      );
      
      return result.lastInsertRowId;
    } catch (e) {
      console.error('EvidenceDatabase: Failed to enqueue evidence', e);
      throw e;
    }
  },

  /**
   * Get all pending evidence records that need syncing.
   */
  async getPendingEvidence(): Promise<EvidenceQueueRecord[]> {
    try {
      const database = await getDb();
      const rows = await database.getAllAsync<any>(
        `SELECT * FROM evidence_queue 
         WHERE status IN ('pending', 'failed')
         ORDER BY created_at ASC`
      );
      
      return rows.map((row) => ({
        id: row.id,
        emergencyId: row.emergency_id,
        fileUri: row.file_uri,
        type: row.type,
        status: row.status,
        metadata: row.metadata,
        retryCount: row.retry_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (e) {
      console.error('EvidenceDatabase: Failed to fetch pending evidence', e);
      return [];
    }
  },

  /**
   * Update the status of an evidence queue item.
   */
  async updateStatus(
    id: number,
    status: 'pending' | 'uploading' | 'synced' | 'failed'
  ): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync(
        'UPDATE evidence_queue SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), id]
      );
    } catch (e) {
      console.error(`EvidenceDatabase: Failed to update status for row ${id}`, e);
    }
  },

  /**
   * Increment retry count and set status back to failed.
   */
  async incrementRetry(id: number): Promise<void> {
    try {
      const database = await getDb();
      const now = Date.now();
      await database.runAsync(
        `UPDATE evidence_queue 
         SET retry_count = retry_count + 1, status = 'failed', updated_at = ? 
         WHERE id = ?`,
        [now, id]
      );
    } catch (e) {
      console.error(`EvidenceDatabase: Failed to increment retry for row ${id}`, e);
    }
  },

  /**
   * Delete a record from the database.
   */
  async deleteEvidence(id: number): Promise<void> {
    try {
      const database = await getDb();
      await database.runAsync('DELETE FROM evidence_queue WHERE id = ?', [id]);
    } catch (e) {
      console.error(`EvidenceDatabase: Failed to delete evidence row ${id}`, e);
    }
  },
};
