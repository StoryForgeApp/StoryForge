export type LogCategory =
  | "general"
  | "installations"
  | "downloads"
  | "mods"
  | "dotnet"
  | "servers"
  | "versions"
  | "worlds"
  | "utils";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
}
