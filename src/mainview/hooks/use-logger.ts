import { useRPC } from "@/mainview/hooks/use-rpc";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";

export function useLogger() {
  const { rpc } = useRPC();

  const log = (level: LogLevel, category: LogCategory, message: string, data?: unknown) => {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Console mirror
    const prefix = `[${category}]`;
    switch (level) {
      case "debug":
        console.debug(prefix, message, data ?? "");
        break;
      case "info":
        console.log(prefix, message, data ?? "");
        break;
      case "warn":
        console.warn(prefix, message, data ?? "");
        break;
      case "error":
        console.error(prefix, message, data ?? "");
        break;
    }

    // Send to backend for file persistence
    void rpc?.request.writeLog({ entry });
  };

  return {
    debug: (category: LogCategory, message: string, data?: unknown) =>
      log("debug", category, message, data),
    info: (category: LogCategory, message: string, data?: unknown) =>
      log("info", category, message, data),
    warn: (category: LogCategory, message: string, data?: unknown) =>
      log("warn", category, message, data),
    error: (category: LogCategory, message: string, data?: unknown) =>
      log("error", category, message, data),
  };
}
