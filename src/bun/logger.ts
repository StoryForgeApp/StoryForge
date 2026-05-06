import { appendFile, mkdir, rename, stat, unlink } from "fs/promises";
import { join } from "path";
import { Utils } from "electrobun";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";

const LOGS_DIR = join(Utils.paths.appData, "storyforge", "logs");
const CURRENT_LOG = "storyforge.log";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_LOG_FILES = 3;

let initPromise: Promise<void> | null = null;

async function ensureLogDir(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await mkdir(LOGS_DIR, { recursive: true });
      } catch {
        // directory exists
      }
    })();
  }
  return initPromise;
}

async function rotateLogs(): Promise<void> {
  const currentPath = join(LOGS_DIR, CURRENT_LOG);
  for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
    try {
      await rename(
        join(LOGS_DIR, `storyforge.${i}.log`),
        join(LOGS_DIR, `storyforge.${i + 1}.log`),
      );
    } catch {
      // older file may not exist
    }
  }
  try {
    await rename(currentPath, join(LOGS_DIR, "storyforge.1.log"));
  } catch {
    // current file may not exist
  }
}

async function writeToFile(entry: LogEntry): Promise<void> {
  await ensureLogDir();
  const currentPath = join(LOGS_DIR, CURRENT_LOG);
  try {
    const stats = await stat(currentPath);
    if (stats.size >= MAX_FILE_SIZE) {
      await rotateLogs();
    }
  } catch {
    // file doesn't exist yet
  }
  await appendFile(currentPath, JSON.stringify(entry) + "\n");
}

export async function writeEntry(entry: LogEntry): Promise<void> {
  await writeToFile(entry);
}

function log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
  const entry: LogEntry = { ts: new Date().toISOString(), level, category, message, data };
  const prefix = `[${category}] ${message}`;
  switch (level) {
    case "debug":
      console.debug(prefix, data ?? "");
      break;
    case "info":
      console.log(prefix, data ?? "");
      break;
    case "warn":
      console.warn(prefix, data ?? "");
      break;
    case "error":
      console.error(prefix, data ?? "");
      break;
  }
  void writeToFile(entry).catch((err) => console.error("[logger] write failed:", err));
}

export const logger = {
  debug: (c: LogCategory, m: string, d?: unknown) => log("debug", c, m, d),
  info: (c: LogCategory, m: string, d?: unknown) => log("info", c, m, d),
  warn: (c: LogCategory, m: string, d?: unknown) => log("warn", c, m, d),
  error: (c: LogCategory, m: string, d?: unknown) => log("error", c, m, d),
};

export async function readLogs(
  level?: LogLevel,
  category?: LogCategory,
  limit = 500,
): Promise<LogEntry[]> {
  await ensureLogDir();
  const entries: LogEntry[] = [];
  const allFiles = [CURRENT_LOG];
  for (let i = 1; i <= MAX_LOG_FILES; i++) allFiles.push(`storyforge.${i}.log`);
  for (const file of allFiles) {
    try {
      const content = await Bun.file(join(LOGS_DIR, file)).text();
      for (const line of content.trim().split("\n").filter(Boolean)) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // file doesn't exist
    }
  }
  let filtered = entries
    .filter((e) => !level || e.level === level)
    .filter((e) => !category || e.category === category)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return filtered.slice(0, limit);
}

export async function clearLogs(): Promise<void> {
  await ensureLogDir();
  for (let i = 1; i <= MAX_LOG_FILES; i++) {
    try {
      await unlink(join(LOGS_DIR, `storyforge.${i}.log`));
    } catch {
      // file doesn't exist
    }
  }
  try {
    await unlink(join(LOGS_DIR, CURRENT_LOG));
  } catch {
    // file doesn't exist
  }
}

export function getLogPath(): string {
  return LOGS_DIR;
}
