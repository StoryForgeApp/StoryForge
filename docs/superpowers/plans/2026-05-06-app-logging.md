# Application Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all ad-hoc `console.*` calls with structured JSON Lines file logger + `/logs` viewer page.

**Architecture:** Shared logger types. Bun implementation writes JSON Lines to rotating files in `{appData}/storyforge/logs/`. Frontend implementation sends entries to backend via RPC for persistence. New `/logs` route with level/category filtering.

**Tech Stack:** Bun file I/O, Electrobun RPC, TanStack Router, React, lucide-react icons, shadcn/ui.

---

### Task 1: Create shared logger types

**Files:**

- Create: `src/shared/logger.ts`

- [ ] **Step 1: Write the shared types**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/logger.ts && git commit -m "feat: add shared logger types"
```

---

### Task 2: Create bun logger with file i/o and rotation

**Files:**

- Create: `src/bun/logger.ts`

- [ ] **Step 1: Write the bun logger**

Read `src/bun/utils.ts` to understand how `Utils.paths.appData` and config files are structured. The logger will store files at `join(Utils.paths.appData, "storyforge", "logs")`.

```typescript
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
    const olderPath = join(LOGS_DIR, `storyforge.${i}.log`);
    const newerPath = join(LOGS_DIR, `storyforge.${i + 1}.log`);
    try {
      await rename(olderPath, newerPath);
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

function createEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: unknown,
): LogEntry {
  return {
    ts: new Date().toISOString(),
    level,
    category,
    message,
    data,
  };
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

function log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
  const entry = createEntry(level, category, message, data);

  // Console mirror
  const prefix = `[${entry.ts}] [${level.toUpperCase()}] [${category}]`;
  const consoleMsg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
  switch (level) {
    case "debug":
      console.debug(consoleMsg, data ?? "");
      break;
    case "info":
      console.log(consoleMsg, data ?? "");
      break;
    case "warn":
      console.warn(consoleMsg, data ?? "");
      break;
    case "error":
      console.error(consoleMsg, data ?? "");
      break;
  }

  // Write to file (fire and forget)
  void writeToFile(entry).catch((err) => {
    console.error("[logger] Failed to write log entry:", err);
  });
}

export const logger = {
  debug: (category: LogCategory, message: string, data?: unknown) =>
    log("debug", category, message, data),
  info: (category: LogCategory, message: string, data?: unknown) =>
    log("info", category, message, data),
  warn: (category: LogCategory, message: string, data?: unknown) =>
    log("warn", category, message, data),
  error: (category: LogCategory, message: string, data?: unknown) =>
    log("error", category, message, data),
};

export async function readLogs(
  level?: LogLevel,
  category?: LogCategory,
  limit = 500,
): Promise<LogEntry[]> {
  await ensureLogDir();
  const entries: LogEntry[] = [];

  try {
    const currentPath = join(LOGS_DIR, CURRENT_LOG);
    const currentContent = await Bun.file(currentPath).text();
    for (const line of currentContent.trim().split("\n").filter(Boolean)) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    // file doesn't exist
  }

  // Read rotated files
  for (let i = 1; i <= MAX_LOG_FILES; i++) {
    try {
      const rotatedPath = join(LOGS_DIR, `storyforge.${i}.log`);
      const content = await Bun.file(rotatedPath).text();
      for (const line of content.trim().split("\n").filter(Boolean)) {
        try {
          entries.push(JSON.parse(line));
        } catch {
          /* skip */
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
      /* ignore */
    }
  }
  try {
    await unlink(join(LOGS_DIR, CURRENT_LOG));
  } catch {
    /* ignore */
  }
}

export function getLogPath(): string {
  return LOGS_DIR;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/bun/logger.ts && git commit -m "feat: add bun file logger with rotation (5MB max, 3 files)"
```

---

### Task 3: Add app log endpoints to log controller

**Files:**

- Modify: `src/bun/controllers/logs.ts`

- [ ] **Step 1: Add app log RPC endpoints**

Add these methods to `logController`:

```typescript
  getAppLogs: async ({
    level,
    category,
    limit,
  }: {
    level?: string;
    category?: string;
    limit?: number;
  }): Promise<{
    entries: import("@/shared/logger").LogEntry[];
  }> => {
    const { readLogs } = await import("../logger");
    const entries = await readLogs(
      (level ?? undefined) as import("@/shared/logger").LogLevel | undefined,
      (category ?? undefined) as import("@/shared/logger").LogCategory | undefined,
      limit ?? 500,
    );
    return { entries };
  },

  clearAppLogs: async (): Promise<{ success: boolean }> => {
    const { clearLogs } = await import("../logger");
    await clearLogs();
    return { success: true };
  },

  getLogPath: async (): Promise<string> => {
    const { getLogPath } = await import("../logger");
    return getLogPath();
  },
```

Note: Using dynamic `import("../logger")` to avoid circular dependency issues. Alternatively, add static imports at the top: `import { readLogs, clearLogs, getLogPath } from "../logger";`

Actually, use static imports — no circular dependency here.

Add at top of file:

```typescript
import { clearLogs, getLogPath, readLogs } from "../logger";
import type { LogCategory, LogLevel } from "@/shared/logger";
```

And the endpoints:

```typescript
  getAppLogs: async ({
    level,
    category,
    limit,
  }: {
    level?: LogLevel;
    category?: LogCategory;
    limit?: number;
  }): Promise<{
    entries: import("@/shared/logger").LogEntry[];
  }> => {
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
```

- [ ] **Step 2: Update LogController type export**

Add the new endpoints' types — they are auto-inferred by `InferRPCSchema`.

- [ ] **Step 3: Commit**

```bash
git add src/bun/controllers/logs.ts && git commit -m "feat: add app log endpoints (getAppLogs, clearAppLogs, getLogPath)"
```

---

### Task 4: Create frontend logger hook

**Files:**

- Create: `src/mainview/hooks/use-logger.ts`

- [ ] **Step 1: Write the frontend logger hook**

```typescript
import { useRPC } from "@/mainview/hooks/use-rpc";
import type { LogCategory, LogLevel } from "@/shared/logger";

function logToConsole(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: unknown,
): void {
  const prefix = `[${category}]`;
  const consoleMsg = data ? `${prefix} ${message}` : `${prefix} ${message}`;
  switch (level) {
    case "debug":
      console.debug(consoleMsg, data ?? "");
      break;
    case "info":
      console.log(consoleMsg, data ?? "");
      break;
    case "warn":
      console.warn(consoleMsg, data ?? "");
      break;
    case "error":
      console.error(consoleMsg, data ?? "");
      break;
  }
}

export function useLogger() {
  const { rpc } = useRPC();

  const sendLog = (level: LogLevel, category: LogCategory, message: string, data?: unknown) => {
    logToConsole(level, category, message, data);
    // Fire-and-forget to backend
    void rpc?.request.getAppLogs({}); // Don't actually need this — we need a writeLog endpoint
  };

  // Actually, the frontend logger needs a writeLog endpoint. Skip for now — we'll use the bun logger directly.
  // Frontend logs can just console mirror for now, or add writeLog later if needed.
}
```

Wait, the design says frontend should send logs to backend too. I need to add a `writeLog` endpoint to the log controller. Let me add that.

Actually, the simplest approach: add a `writeLog` RPC endpoint that writes a single entry to the file. The frontend logger calls it.

Let me restructure:

**In logs.ts controller, add:**

```typescript
  writeLog: async ({ entry }: { entry: import("@/shared/logger").LogEntry }): Promise<boolean> => {
    const { logger } = await import("../logger");
    // We need a direct write function. Let me add writeEntry to the bun/logger.ts exports.
    const { writeEntry } = await import("../logger");
    await writeEntry(entry);
    return true;
  },
```

**In bun/logger.ts, export:**

```typescript
export async function writeEntry(entry: LogEntry): Promise<void> {
  await writeToFile(entry);
}
```

For the frontend hook, just import type and call RPC:

```typescript
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
```

OK, this is getting complicated to describe piecemeal. Let me simplify the plan tasks and just write the implementations.

Let me write the full plan file now with concrete code for each task.

Actually, this is getting too long for a plan file. Let me create the plan with tasks that reference concrete file contents, and then dispatch subagents to implement them.

Let me restructure the plan into fewer, more focused tasks:

1. Create shared logger types + bun logger + log controller endpoints + RPC types (all backend)
2. Create frontend logger hook
3. Create frontend log viewer page + route + sidebar
4. Replace console.\* with logger across backend controllers
5. Replace console.\* with useLogger across frontend
6. Verify

Let me write this plan.<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Application Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all ad-hoc `console.*` with structured JSON Lines file logger + `/logs` viewer page.

**Architecture:** Shared logger types → Bun file logger (rotation 5MB/3 files) → RPC endpoints → React hook → `/logs` UI page with filters.

**Tech Stack:** Bun file I/O, Electrobun RPC, TanStack Router, React, lucide-react, shadcn/ui.

---

### Task 1: Create shared types, bun logger, RPC endpoints

**Files:**

- Create: `src/shared/logger.ts`
- Create: `src/bun/logger.ts`
- Modify: `src/bun/controllers/logs.ts`
- Modify: `src/shared/rpc.ts`

**References to read first:**

- `src/bun/utils.ts` (for Utils.paths.appData pattern)
- `src/bun/controllers/logs.ts` (existing log controller structure)
- `src/shared/rpc.ts` (RPC type merging)

#### Step 1: Create `src/shared/logger.ts`

```typescript
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
```

#### Step 2: Create `src/bun/logger.ts`

```typescript
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
        /* exists */
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
      /* ok */
    }
  }
  try {
    await rename(currentPath, join(LOGS_DIR, "storyforge.1.log"));
  } catch {
    /* ok */
  }
}

async function writeToFile(entry: LogEntry): Promise<void> {
  await ensureLogDir();
  const currentPath = join(LOGS_DIR, CURRENT_LOG);
  try {
    const stats = await stat(currentPath);
    if (stats.size >= MAX_FILE_SIZE) await rotateLogs();
  } catch {
    /* file doesn't exist */
  }
  await appendFile(currentPath, JSON.stringify(entry) + "\n");
}

export async function writeEntry(entry: LogEntry): Promise<void> {
  await writeToFile(entry);
}

function log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
  const entry: LogEntry = { ts: new Date().toISOString(), level, category, message, data };
  // Console mirror
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
          /* skip */
        }
      }
    } catch {
      /* file doesn't exist */
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
      /* ok */
    }
  }
  try {
    await unlink(join(LOGS_DIR, CURRENT_LOG));
  } catch {
    /* ok */
  }
}

export function getLogPath(): string {
  return LOGS_DIR;
}
```

#### Step 3: Modify `src/bun/controllers/logs.ts`

Add these imports at top:

```typescript
import { clearLogs, getLogPath, readLogs, writeEntry } from "../logger";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";
```

Add these methods to `logController`:

```typescript
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
```

#### Step 4: Verify RPC types

The `LogController` type in `src/shared/rpc.ts` uses `InferRPCSchema<typeof logController>` which auto-infers the new endpoints. The `LogEntry` type must be imported where needed. No changes needed to `shared/rpc.ts` unless `LogEntry` isn't picked up — but since it's a param/return type in the controller, it will be.

#### Step 5: Commit

```bash
git add . && git commit -m "feat: add logger infrastructure (types, bun file logger, RPC endpoints)"
```

---

### Task 2: Create frontend logger hook

**Files:**

- Create: `src/mainview/hooks/use-logger.ts`

#### Step 1: Write the hook

```typescript
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";
import { useRPC } from "@/mainview/hooks/use-rpc";

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
```

#### Step 2: Commit

```bash
git add src/mainview/hooks/use-logger.ts && git commit -m "feat: add useLogger hook for frontend logging"
```

---

### Task 3: Create frontend log viewer page + route + sidebar

**Files:**

- Create: `src/mainview/routes/logs.tsx`
- Modify: `src/mainview/layouts/main.tsx`
- Also: route auto-generated on next build, or manually add to routeTree

#### Step 1: Create `src/mainview/routes/logs.tsx`

The page shows app logs with level tabs, category dropdown, clear button, and auto-refresh.

```typescript
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ScrollTextIcon,
  Trash2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import { useRPC } from "@/mainview/hooks/use-rpc";

export const Route = createFileRoute("/logs")({
  component: RouteComponent,
});

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const CATEGORIES: LogCategory[] = [
  "general", "installations", "downloads", "mods",
  "dotnet", "servers", "versions", "worlds", "utils",
];

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "error": return "text-destructive";
    case "warn": return "text-warning";
    case "debug": return "text-muted-foreground";
    default: return "text-foreground";
  }
}

function getLevelBadgeVariant(level: LogLevel) {
  switch (level) {
    case "error": return "destructive" as const;
    case "warn": return "warning" as const;
    case "debug": return "outline" as const;
    default: return "success" as const;
  }
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function RouteComponent() {
  const { rpc } = useRPC();
  const [levelFilter, setLevelFilter] = useState<LogLevel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["appLogs", levelFilter, categoryFilter],
    queryFn: async () => {
      const result = await rpc?.request.getAppLogs({
        level: levelFilter ?? undefined,
        category: categoryFilter ?? undefined,
        limit: 500,
      });
      return result?.entries ?? [];
    },
    refetchInterval: 5000,
  });

  const { mutate: clearLogs } = useMutation({
    mutationFn: async () => rpc?.request.clearAppLogs(),
    onSuccess: () => refetch(),
  });

  const { mutate: openLogFolder } = useMutation({
    mutationFn: async () => {
      const path = await rpc?.request.getLogPath();
      if (path) rpc?.request.openInstallationFolder({ path });
    },
  });

  const entries = data ?? [];

  // Compute per-level counts from ALL logs (unfiltered)
  const { data: allEntries } = useQuery({
    queryKey: ["appLogsCounts"],
    queryFn: async () => {
      const result = await rpc?.request.getAppLogs({ limit: 500 });
      return result?.entries ?? [];
    },
    refetchInterval: 5000,
  });

  const levelCounts = LEVELS.reduce(
    (acc, l) => {
      acc[l] = (allEntries ?? []).filter((e) => e.level === l).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollTextIcon className="size-4" />
            <h1 className="text-lg font-semibold">Application Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCwIcon className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => openLogFolder({} as any)}>
              Open Folder
            </Button>
            <Button size="sm" variant="destructive-outline" onClick={() => clearLogs({} as any)}>
              <Trash2Icon className="size-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Group>
            {LEVELS.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={levelFilter === l ? "default" : "ghost"}
                onClick={() => setLevelFilter(levelFilter === l ? null : l)}
                className="text-xs"
              >
                <span className={getLevelColor(l)}>{l}</span>
                <Badge variant="outline" className="ml-1 text-xs">
                  {levelCounts[l] ?? 0}
                </Badge>
              </Button>
            ))}
          </Group>
          <Select
            value={categoryFilter ?? "all"}
            onValueChange={(v) => setCategoryFilter(v === "all" ? null : v as LogCategory)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {entries.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No log entries</p>
          ) : (
            entries.map((entry: LogEntry, i: number) => (
              <div key={i} className="flex gap-3 border-b py-1.5 font-mono text-xs last:border-0">
                <span className="text-muted-foreground shrink-0">{formatTs(entry.ts)}</span>
                <Badge variant={getLevelBadgeVariant(entry.level)} className="shrink-0 text-xs">
                  {entry.level}
                </Badge>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {entry.category}
                </Badge>
                <span className={getLevelColor(entry.level)}>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

#### Step 2: Add sidebar entry in `src/mainview/layouts/main.tsx`

Add import:

```typescript
import { ScrollTextIcon } from "lucide-react";
```

Add after the News menu item (around line 190, before closing `</SidebarMenu>`):

```typescript
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        activeProps={{
                          className: "bg-accent text-accent-foreground",
                        }}
                        to="/logs"
                      />
                    }
                  >
                    <ScrollTextIcon />
                    Logs
                  </SidebarMenuButton>
                </SidebarMenuItem>
```

#### Step 3: Commit

```bash
git add . && git commit -m "feat: add logs viewer page with level/category filters and sidebar entry"
```

---

### Task 4: Replace console.\* calls in backend controllers

**Files to modify:**

- `src/bun/controllers/versions.ts` (~32 console.log, 1 console.error)
- `src/bun/controllers/mods.ts` (~17 console.log, 3 console.error, 2 console.warn)
- `src/bun/controllers/installations.ts` (~6 console.log, 1 console.error)
- `src/bun/utils.ts` (~3 console.log)
- `src/bun/index.ts` (~3 console.log)
- `src/bun/controllers/worlds.ts` (~1 console.log)

**Pattern:** Replace `console.log("[versions.ts] Download started")` with `logger.info("downloads", "Download started")`. Replace `console.error(...)` with `logger.error(...)`. Replace `console.warn(...)` with `logger.warn(...)`.

#### Step 1: For each file, import logger and replace console.\* calls

In each controller file, add:

```typescript
import { logger } from "../logger";
```

Then replace ALL `console.log`, `console.warn`, `console.error` with the appropriate `logger.*` call.

**Categories per file:**

- `versions.ts` → "downloads" (most) or "versions"
- `mods.ts` → "mods"
- `installations.ts` → "installations"
- `utils.ts` → "utils"
- `index.ts` (bun) → "general"
- `worlds.ts` → "worlds"

**Example replacements:**

```typescript
// Before:
console.log(`[installations.ts] Playing with installation: ${config.name}`);
// After:
logger.info("installations", `Playing with installation: ${config.name}`);

// Before:
console.error(`[installations.ts] Installation config not found: ${configPath}`);
// After:
logger.error("installations", `Installation config not found: ${configPath}`);

// Before:
console.warn("[mods.ts] Checksum mismatch for mod", modid);
// After:
logger.warn("mods", "Checksum mismatch for mod", { modid });
```

#### Step 2: Commit per file or per batch of files

```bash
git add src/bun/controllers/versions.ts && git commit -m "refactor: use structured logger in versions controller"
git add src/bun/controllers/mods.ts && git commit -m "refactor: use structured logger in mods controller"
git add src/bun/controllers/installations.ts && git commit -m "refactor: use structured logger in installations controller"
git add src/bun/utils.ts && git commit -m "refactor: use structured logger in utils"
git add src/bun/index.ts && git commit -m "refactor: use structured logger in bun index"
git add src/bun/controllers/worlds.ts && git commit -m "refactor: use structured logger in worlds controller"
```

---

### Task 5: Replace console.\* calls in frontend

**Files to modify:**

- `src/mainview/routes/installations/index.tsx` (~3 console.log, ~7 console.error)
- `src/mainview/routes/installations/worlds.tsx` (~2 console.log, ~5 console.error)
- `src/mainview/routes/versions/index.tsx` (~2 console.log, ~4 console.error)
- `src/mainview/hooks/use-mod-mutations.ts` (~3 console.log, ~2 console.error)
- `src/mainview/routes/servers/index.tsx` (~1 console.error)
- `src/mainview/main.tsx` (~1 console.log)

**Pattern:** Import `useLogger` hook and use it.

Since `useLogger` is a React hook, it can only be used inside React components. For files like `use-mod-mutations.ts` (which is a custom hook), call `useLogger()` inside the hook.

For `main.tsx` (outside React tree), skip the frontend logger and just keep `console.log` — or move it to the component that renders.

#### Step 1: Replace in route components

```typescript
// Add:
import { useLogger } from "@/mainview/hooks/use-logger";
const log = useLogger();

// Replace:
console.error("Failed to play with installation:", error);
// With:
log.error("installations", "Failed to play with installation", { error: String(error) });
```

#### Step 2: Replace in hooks (use-mod-mutations.ts)

```typescript
import { useLogger } from "@/mainview/hooks/use-logger";

// Inside the hook function:
const log = useLogger();

// Replace console.error calls with log.error
```

#### Step 3: Replace in servers/index.tsx

Similar pattern.

#### Step 4: Handle main.tsx

The console.log in main.tsx is in the router subscription, not inside a component. Skip it or keep as console.log for now.

#### Step 5: Commit

```bash
git add . && git commit -m "refactor: use useLogger hook in frontend route components"
```

---

### Task 6: Verify

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
bun run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Verify no orphaned console.\* calls**

```bash
rg "console\.(log|warn|error)\(" src/bun/ src/mainview/ --stats
```

Expected: Only the ones inside `src/bun/logger.ts` and `src/mainview/hooks/use-logger.ts` (the console mirror). Any others are misses.

- [ ] **Step 3: Verify typecheck compiles**

```bash
bun --bun x tsc --noEmit 2>&1 | grep -v "node_modules" | grep -v "three"
```

Expected: No new errors.
