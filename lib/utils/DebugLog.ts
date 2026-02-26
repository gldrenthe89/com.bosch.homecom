import Homey from 'homey/lib/Homey';

export interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export type DebugLogFn = (level: DebugLogEntry['level'], message: string) => void;

const MAX_LOG_ENTRIES = 150;
const DEBUG_LOG_KEY = 'debug_log';

const MAX_ERROR_LENGTH = 150;

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  // Fresh regex instances per call to avoid stateful /g lastIndex issues
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]');
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, '[REDACTED]');
  sanitized = sanitized.replace(/(?:refresh_token|access_token|token)[=:]\s*["']?[A-Za-z0-9_.-]{10,}["']?/gi, '[REDACTED]');
  if (sanitized.length > MAX_ERROR_LENGTH) {
    sanitized = sanitized.substring(0, MAX_ERROR_LENGTH) + '...';
  }
  return sanitized;
}

function getEntries(homey: Homey): DebugLogEntry[] {
  try {
    const raw = homey.settings.get(DEBUG_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DebugLogEntry[];
  } catch {
    return [];
  }
}

export function addDebugLogEntry(homey: Homey, level: DebugLogEntry['level'], message: string): void {
  const entries = getEntries(homey);

  entries.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  // Trim to max entries (keep newest)
  if (entries.length > MAX_LOG_ENTRIES) {
    entries.splice(0, entries.length - MAX_LOG_ENTRIES);
  }

  homey.settings.set(DEBUG_LOG_KEY, JSON.stringify(entries));
}

export function clearDebugLog(homey: Homey): void {
  homey.settings.set(DEBUG_LOG_KEY, JSON.stringify([]));
}

export function createDebugLogFn(homey: Homey): DebugLogFn {
  return (level: DebugLogEntry['level'], message: string) => {
    addDebugLogEntry(homey, level, message);
  };
}
