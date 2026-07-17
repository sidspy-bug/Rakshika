/**
 * Mesh Database — SQLite CRUD for the local packet queue.
 */

import * as SQLite from 'expo-sqlite';
import { MESH_DB_NAME, MIGRATIONS } from './migrations';
import { type MeshPacketRecord, type PacketStatus } from '../protocol/PacketTypes';
import { MeshLogger } from '../logging/MeshLogger';

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(MESH_DB_NAME);
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  for (const migration of MIGRATIONS) {
    for (const sql of migration.statements) {
      await database.execAsync(sql);
    }
  }
  MeshLogger.info('STORAGE', 'Database migrations complete');
}

// ─── Packet Operations ─────────────────────────────────────────────────────────

export const MeshDatabase = {
  async initialize(): Promise<void> {
    await getDb();
  },

  async insertPacket(record: Omit<MeshPacketRecord, 'id'>): Promise<number> {
    const database = await getDb();
    const now = Date.now();
    const result = await database.runAsync(
      `INSERT OR IGNORE INTO mesh_packets 
       (packet_id, sender_id, timestamp, ttl, hop_count, severity, latitude, longitude,
        trigger_type, address, status, raw_packet, retry_count, last_retry_at,
        created_at, updated_at, relayed_by, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.packetId, record.senderId, record.timestamp, record.ttl,
        record.hopCount, record.severity, record.latitude, record.longitude,
        record.triggerType, record.address || null, record.status,
        record.rawPacket, record.retryCount, record.lastRetryAt || null,
        record.createdAt || now, record.updatedAt || now,
        record.relayedBy || null, record.syncedAt || null,
      ],
    );
    MeshLogger.debug('STORAGE', 'Packet inserted', { packetId: record.packetId, rowId: result.lastInsertRowId });
    return result.lastInsertRowId;
  },

  async getPacketByPacketId(packetId: string): Promise<MeshPacketRecord | null> {
    const database = await getDb();
    const row = await database.getFirstAsync<any>(
      'SELECT * FROM mesh_packets WHERE packet_id = ?', [packetId],
    );
    return row ? mapRow(row) : null;
  },

  async getPacketsByStatus(status: PacketStatus): Promise<MeshPacketRecord[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<any>(
      'SELECT * FROM mesh_packets WHERE status = ? ORDER BY timestamp ASC', [status],
    );
    return rows.map(mapRow);
  },

  async getPendingForSync(): Promise<MeshPacketRecord[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM mesh_packets WHERE status IN ('pending', 'received', 'retry', 'advertising')
       ORDER BY timestamp ASC`,
    );
    return rows.map(mapRow);
  },

  async updateStatus(packetId: string, status: PacketStatus): Promise<void> {
    const database = await getDb();
    await database.runAsync(
      'UPDATE mesh_packets SET status = ?, updated_at = ? WHERE packet_id = ?',
      [status, Date.now(), packetId],
    );
  },

  async markSynced(packetId: string): Promise<void> {
    const database = await getDb();
    const now = Date.now();
    await database.runAsync(
      'UPDATE mesh_packets SET status = ?, synced_at = ?, updated_at = ? WHERE packet_id = ?',
      ['synced', now, now, packetId],
    );
  },

  async incrementRetry(packetId: string): Promise<void> {
    const database = await getDb();
    const now = Date.now();
    await database.runAsync(
      'UPDATE mesh_packets SET retry_count = retry_count + 1, last_retry_at = ?, status = ?, updated_at = ? WHERE packet_id = ?',
      [now, 'retry', now, packetId],
    );
  },

  async hasPacket(packetId: string): Promise<boolean> {
    const database = await getDb();
    const row = await database.getFirstAsync<any>(
      'SELECT 1 FROM mesh_packets WHERE packet_id = ?', [packetId],
    );
    return !!row;
  },

  async cleanExpired(maxAgeMs: number): Promise<number> {
    const database = await getDb();
    const cutoff = Date.now() - maxAgeMs;
    const result = await database.runAsync(
      `UPDATE mesh_packets SET status = 'expired', updated_at = ? WHERE timestamp < ? AND status NOT IN ('synced', 'expired')`,
      [Date.now(), cutoff],
    );
    return result.changes;
  },

  // ─── Seen Set ──────────────────────────────────────────────────────────────

  async markSeen(packetId: string): Promise<void> {
    const database = await getDb();
    await database.runAsync(
      'INSERT OR IGNORE INTO mesh_seen (packet_id, first_seen) VALUES (?, ?)',
      [packetId, Date.now()],
    );
  },

  async hasSeen(packetId: string): Promise<boolean> {
    const database = await getDb();
    const row = await database.getFirstAsync<any>(
      'SELECT 1 FROM mesh_seen WHERE packet_id = ?', [packetId],
    );
    return !!row;
  },

  // ─── Peers ────────────────────────────────────────────────────────────────

  async upsertPeer(deviceId: string, rssi: number, packetIds: string[]): Promise<void> {
    const database = await getDb();
    await database.runAsync(
      `INSERT INTO mesh_peers (device_id, rssi, last_seen, packet_ids)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET rssi = ?, last_seen = ?, packet_ids = ?`,
      [deviceId, rssi, Date.now(), JSON.stringify(packetIds),
       rssi, Date.now(), JSON.stringify(packetIds)],
    );
  },

  async getActivePeers(staleMs: number): Promise<Array<{ deviceId: string; rssi: number; lastSeen: number }>> {
    const database = await getDb();
    const cutoff = Date.now() - staleMs;
    return database.getAllAsync<any>(
      'SELECT device_id as deviceId, rssi, last_seen as lastSeen FROM mesh_peers WHERE last_seen > ?',
      [cutoff],
    );
  },

  async close(): Promise<void> {
    if (db) {
      await db.closeAsync();
      db = null;
    }
  },
};

function mapRow(row: any): MeshPacketRecord {
  return {
    id: row.id,
    packetId: row.packet_id,
    senderId: row.sender_id,
    timestamp: row.timestamp,
    ttl: row.ttl,
    hopCount: row.hop_count,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    triggerType: row.trigger_type,
    address: row.address,
    status: row.status,
    rawPacket: row.raw_packet,
    retryCount: row.retry_count,
    lastRetryAt: row.last_retry_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    relayedBy: row.relayed_by,
    syncedAt: row.synced_at,
  };
}
