/**
 * SQLite schema migrations for the mesh packet queue.
 */

export const MESH_DB_NAME = 'rakshika_mesh.db';

export const MIGRATIONS = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS mesh_packets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        packet_id TEXT UNIQUE NOT NULL,
        sender_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 10,
        hop_count INTEGER NOT NULL DEFAULT 0,
        severity TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        trigger_type TEXT NOT NULL,
        address TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        raw_packet TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_retry_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        relayed_by TEXT,
        synced_at INTEGER
      );`,
      `CREATE INDEX IF NOT EXISTS idx_packets_status ON mesh_packets(status);`,
      `CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON mesh_packets(timestamp);`,
      `CREATE INDEX IF NOT EXISTS idx_packets_packet_id ON mesh_packets(packet_id);`,
      `CREATE TABLE IF NOT EXISTS mesh_peers (
        device_id TEXT PRIMARY KEY,
        rssi INTEGER,
        last_seen INTEGER NOT NULL,
        packet_ids TEXT DEFAULT '[]'
      );`,
      `CREATE TABLE IF NOT EXISTS mesh_seen (
        packet_id TEXT PRIMARY KEY,
        first_seen INTEGER NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS evidence_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emergency_id TEXT NOT NULL,
        file_uri TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        metadata TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_queue(status);`,
      `CREATE INDEX IF NOT EXISTS idx_evidence_emergency ON evidence_queue(emergency_id);`
    ],
  },
];
