export type LogLevel = "info" | "warn" | "error";
export type Logger = (level: LogLevel, message: string, fields?: Record<string, unknown>) => void;

/** One JSON object per line: journald stores it as is and it stays greppable. */
export function formatLogLine(level: LogLevel, message: string, fields: Record<string, unknown> = {}, now = new Date()): string {
  return JSON.stringify({ time: now.toISOString(), level, message, ...fields });
}

export function createLogger(write: (line: string) => void = (line) => process.stdout.write(line + "\n")): Logger {
  return (level, message, fields) => write(formatLogLine(level, message, fields));
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
