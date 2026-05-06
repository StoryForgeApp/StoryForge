import type { FSWatcher } from "fs";
import { watch } from "fs";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { InferRPCSchema } from "@/shared/helper";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";
import { mainWindow } from "..";
import { clearLogs, getLogPath, readLogs, writeEntry } from "../logger";

async function getDirSize(dirPath: string): Promise<number> {
  const entries = await readdir(dirPath, {
    withFileTypes: true,
    recursive: true,
  });

  const sizes = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isFile()) {
        const { size } = await stat(join(entry.parentPath, entry.name));
        return size;
      }
      return 0;
    }),
  );

  return sizes.reduce((acc, size) => acc + size, 0);
}

// Track active log watchers
const activeLogWatchers = new Map<string, Map<string, FSWatcher>>();

// File positions for incremental reading
const filePositions = new Map<string, number>();

type LogType = "main" | "chat" | "audit" | "debug";

const LOG_FILES: Record<LogType, string> = {
  main: "client-main.log",
  chat: "client-chat.log",
  audit: "client-audit.log",
  debug: "client-debug.log",
};

async function readNewContent(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath);
    const stats = await file.stat();
    const currentSize = stats.size;
    const lastPosition = filePositions.get(filePath) || 0;

    if (currentSize < lastPosition) {
      // File was truncated, reset position
      filePositions.set(filePath, 0);
      return await file.text();
    }

    if (currentSize === lastPosition) {
      // No new content
      return "";
    }

    // Read only new content
    const newContent = await file.slice(lastPosition, currentSize).text();
    filePositions.set(filePath, currentSize);
    return newContent;
  } catch {
    return "";
  }
}

function setupLogWatcher(installationPath: string, logType: LogType): void {
  const logFileName = LOG_FILES[logType];
  const logFilePath = join(installationPath, "Logs", logFileName);

  // Initialize file position
  void (async () => {
    try {
      const file = Bun.file(logFilePath);
      const stats = await file.stat();
      filePositions.set(logFilePath, stats.size);
    } catch {
      filePositions.set(logFilePath, 0);
    }
  })();

  const watcher = watch(logFilePath, { persistent: true }, async (eventType: string) => {
    if (eventType === "change") {
      const newContent = await readNewContent(logFilePath);
      if (newContent) {
        mainWindow.webview.rpc?.send("logUpdate", {
          installationPath,
          logType,
          newContent,
          timestamp: Date.now(),
        });
      }
    }
  });

  // Store watcher
  let installationWatchers = activeLogWatchers.get(installationPath);
  if (!installationWatchers) {
    installationWatchers = new Map();
    activeLogWatchers.set(installationPath, installationWatchers);
  }
  installationWatchers.set(logType, watcher);
}

export const logController = {
  getLogs: async ({
    path,
  }: {
    path: string;
  }): Promise<{
    size: number;
    logs: { main: string; chat: string; audit: string; debug: string };
  }> => {
    const logsPath = join(path, "Logs");
    const size = await getDirSize(logsPath);
    const mainLog = await Bun.file(join(logsPath, "client-main.log")).text();
    const chatLog = await Bun.file(join(logsPath, "client-chat.log")).text();
    const auditLog = await Bun.file(join(logsPath, "client-audit.log")).text();
    const debugLog = await Bun.file(join(logsPath, "client-debug.log")).text();

    // Initialize file positions after reading full content
    for (const [, fileName] of Object.entries(LOG_FILES)) {
      const filePath = join(logsPath, fileName);
      try {
        const file = Bun.file(filePath);
        const stats = await file.stat();
        filePositions.set(filePath, stats.size);
      } catch {
        filePositions.set(filePath, 0);
      }
    }

    return {
      size,
      logs: {
        main: mainLog,
        chat: chatLog,
        audit: auditLog,
        debug: debugLog,
      },
    };
  },

  startLogWatcher: async ({
    path,
  }: {
    path: string;
  }): Promise<{ success: boolean; message: string }> => {
    // Stop any existing watchers for this installation
    const existingWatchers = activeLogWatchers.get(path);
    if (existingWatchers) {
      for (const watcher of existingWatchers.values()) {
        watcher.close();
      }
      activeLogWatchers.delete(path);
    }

    // Set up watchers for all log types
    (Object.keys(LOG_FILES) as LogType[]).forEach((logType) => {
      setupLogWatcher(path, logType);
    });

    return { success: true, message: "Log watcher started" };
  },

  stopLogWatcher: async ({
    path,
  }: {
    path: string;
  }): Promise<{ success: boolean; message: string }> => {
    const installationWatchers = activeLogWatchers.get(path);
    if (installationWatchers) {
      for (const watcher of installationWatchers.values()) {
        watcher.close();
      }
      activeLogWatchers.delete(path);

      // Clean up file positions for this installation
      for (const fileName of Object.values(LOG_FILES)) {
        filePositions.delete(join(path, "Logs", fileName));
      }

      return { success: true, message: "Log watcher stopped" };
    }

    return { success: false, message: "No active watcher found" };
  },

  writeLog: async ({ entry }: { entry: LogEntry }): Promise<boolean> => {
    await writeEntry(entry);
    return true;
  },

  getAppLogs: async ({
    level,
    category,
    limit,
  }: {
    level?: LogLevel;
    category?: LogCategory;
    limit?: number;
  }): Promise<{ entries: LogEntry[] }> => {
    const entries = await readLogs(level, category, limit ?? 500);
    return { entries };
  },

  clearAppLogs: async (): Promise<{ success: boolean }> => {
    await clearLogs();
    return { success: true };
  },

  getLogPath: async (): Promise<string> => {
    return getLogPath();
  },
};

export type LogController = InferRPCSchema<typeof logController> & {
  messages: {
    logUpdate: {
      installationPath: string;
      logType: LogType;
      newContent: string;
      timestamp: number;
    };
  };
};
