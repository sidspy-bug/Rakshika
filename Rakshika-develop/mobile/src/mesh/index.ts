/**
 * Mesh Relay Module — Public API
 *
 * Single entry point for all mesh relay functionality.
 * Import from 'src/mesh' to access any mesh feature.
 */

// Context
export { MeshProvider, useMesh } from './MeshContext';

// Engine
export { RelayEngine } from './engine/RelayEngine';

// Sync
export { ConnectivityMonitor } from './sync/ConnectivityMonitor';
export { CloudSync } from './sync/CloudSync';
export { BackgroundSync } from './sync/BackgroundSync';

// Types
export {
  MeshStatus,
  PacketStatus,
  type MeshPacket,
  type MeshPacketRecord,
  type RelayUploadPayload,
  type MeshPeer,
} from './protocol/PacketTypes';

// Logger
export { MeshLogger } from './logging/MeshLogger';
