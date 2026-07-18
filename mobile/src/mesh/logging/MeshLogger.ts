/**
 * Mesh Logger
 *
 * Structured logging for all mesh relay events. Provides a consistent
 * log format with timestamps, severity, and component tagging so mesh
 * activity can be traced during debugging without polluting the main
 * app logs.
 *
 * All mesh logs are prefixed with [MESH] and tagged with their subsystem.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type MeshSubsystem =
  | 'BLE'
  | 'PROTOCOL'
  | 'ENGINE'
  | 'STORAGE'
  | 'SYNC'
  | 'CRYPTO'
  | 'PEER'
  | 'RELAY';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: MeshSubsystem;
  message: string;
  data?: Record<string, unknown>;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

/** Set to false in production to suppress debug/info logs */
let verboseLogging = __DEV__;

/** In-memory ring buffer of recent log entries for diagnostics */
const LOG_BUFFER_SIZE = 500;
const logBuffer: LogEntry[] = [];

// ─── Core Logger ───────────────────────────────────────────────────────────────

function createEntry(
  level: LogLevel,
  subsystem: MeshSubsystem,
  message: string,
  data?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    subsystem,
    message,
    data,
  };
}

function pushToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

function formatMessage(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `[MESH][${entry.subsystem}] ${entry.message}${dataStr}`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const MeshLogger = {
  debug(subsystem: MeshSubsystem, message: string, data?: Record<string, unknown>): void {
    const entry = createEntry('DEBUG', subsystem, message, data);
    pushToBuffer(entry);
    if (verboseLogging) {
      console.debug(formatMessage(entry));
    }
  },

  info(subsystem: MeshSubsystem, message: string, data?: Record<string, unknown>): void {
    const entry = createEntry('INFO', subsystem, message, data);
    pushToBuffer(entry);
    if (verboseLogging) {
      console.info(formatMessage(entry));
    }
  },

  warn(subsystem: MeshSubsystem, message: string, data?: Record<string, unknown>): void {
    const entry = createEntry('WARN', subsystem, message, data);
    pushToBuffer(entry);
    console.warn(formatMessage(entry));
  },

  error(subsystem: MeshSubsystem, message: string, data?: Record<string, unknown>): void {
    const entry = createEntry('ERROR', subsystem, message, data);
    pushToBuffer(entry);
    console.error(formatMessage(entry));
  },

  /**
   * Returns the recent log buffer for diagnostics.
   * Useful for attaching to crash reports or debugging screens.
   */
  getRecentLogs(): ReadonlyArray<LogEntry> {
    return [...logBuffer];
  },

  /**
   * Returns recent logs filtered by subsystem.
   */
  getLogsBySubsystem(subsystem: MeshSubsystem): ReadonlyArray<LogEntry> {
    return logBuffer.filter((e) => e.subsystem === subsystem);
  },

  /**
   * Clears the log buffer.
   */
  clearLogs(): void {
    logBuffer.length = 0;
  },

  /**
   * Enable or disable verbose (debug + info) console output.
   */
  setVerbose(enabled: boolean): void {
    verboseLogging = enabled;
  },
};
