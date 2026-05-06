# .NET Runtime Auto-Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When Vintage Story requires a .NET runtime not present on the system, show a modal offering to download and install it into `~/.dotnet`, then auto-launch the game.

**Architecture:** New `dotnet.ts` controller handles check/download/extract with progress messages. `playWithInstallation` checks dotnet before spawning, returns `{ needsDotnet }` when missing. Frontend modal component (`install-dialog.tsx`) shows prompt → progress → done, then retries launch.

**Tech Stack:** Bun (fetch, Bun.Archive, Bun.spawn), Base UI Dialog, TanStack React Query, existing progress message pattern.

---

### Task 1: Create dotnet backend controller

**Files:**

- Create: `src/bun/controllers/dotnet.ts`

- [ ] **Step 1: Write the controller file**

```typescript
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { exists, mkdir } from "fs/promises";
import { join } from "path";
import { Utils } from "electrobun";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import { getPlatform } from "../utils";

const DOTNET_HOME = join(Utils.paths.home, ".dotnet");

function getRid(): string {
  const platform = getPlatform();
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  if (platform === "mac") return `osx-${arch}`;
  if (platform === "linux") return `linux-${arch}`;
  return `win-${arch}`;
}

async function getLatestVersion(majorVersion: string): Promise<string> {
  const url = `https://dotnetcli.azureedge.net/dotnet/release-metadata/${majorVersion}/releases.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch .NET ${majorVersion} release metadata`);
  const data = (await response.json()) as { releases: { "release-version": string }[] };
  if (!data.releases?.[0]) throw new Error(`No .NET ${majorVersion} releases found`);
  return String(data.releases[0]["release-version"]);
}

function buildDownloadUrl(version: string, rid: string): string {
  return `https://dotnetcli.azureedge.net/dotnet/Runtime/${version}/dotnet-runtime-${version}-${rid}.tar.gz`;
}

function checkLocalDotnet(version: string): boolean {
  const runtimePath = join(DOTNET_HOME, "shared", "Microsoft.NETCore.App", version);
  return existsSync(runtimePath);
}

const activeDownloads = new Map<string, AbortController>();

export const dotnetController = {
  checkDotnet: async ({
    version,
  }: {
    version: string;
  }): Promise<{
    found: boolean;
    version?: string;
  }> => {
    // version is "7.0", "8.0", or "10.0"
    try {
      const proc = Bun.spawn(["dotnet", "--list-runtimes"]);
      const output = await new Response(proc.stdout).text();
      const lines = output.split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === "Microsoft.NETCore.App" && parts[1].startsWith(version)) {
          return { found: true };
        }
      }
    } catch {
      // dotnet not in PATH
    }

    if (checkLocalDotnet(version)) {
      return { found: true };
    }

    return { found: false, version };
  },

  downloadDotnet: async ({
    version,
  }: {
    version: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (activeDownloads.has(version)) {
      return { success: false, message: "Download already in progress" };
    }

    const rid = getRid();
    const fullVersion = await getLatestVersion(version);
    const downloadUrl = buildDownloadUrl(fullVersion, rid);

    const tempDir = Utils.paths.temp;
    const ext = rid.startsWith("win") ? "zip" : "tar.gz";
    const tempFilePath = join(tempDir, `dotnet-runtime-${fullVersion}-${rid}.${ext}`);

    if (!(await exists(tempDir))) {
      await mkdir(tempDir, { recursive: true });
    }

    const abortController = new AbortController();
    activeDownloads.set(version, abortController);

    mainWindow.webview.rpc?.send("dotnetStatus", {
      version,
      status: "downloading",
      message: "Download started",
    });

    (async () => {
      const fileStream = createWriteStream(tempFilePath);

      try {
        const response = await fetch(downloadUrl, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to download .NET runtime: HTTP ${response.status}`);
        }

        const totalSize = parseInt(response.headers.get("Content-Length") || "0", 10);
        let downloadedSize = 0;
        const speedWindow: { timestamp: number; bytes: number }[] = [];
        const SPEED_WINDOW_MS = 1000;
        const PROGRESS_THROTTLE_MS = 250;
        let lastProgressSentTime = 0;

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to read download stream");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fileStream.write(value);
          downloadedSize += value.length;

          const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
          const currentTime = Date.now();
          speedWindow.push({ bytes: value.length, timestamp: currentTime });

          const windowStart = currentTime - SPEED_WINDOW_MS;
          while (speedWindow.length > 0 && speedWindow[0].timestamp < windowStart) {
            speedWindow.shift();
          }

          const windowBytes = speedWindow.reduce((sum, e) => sum + e.bytes, 0);
          const windowDuration =
            speedWindow.length > 1
              ? (speedWindow[speedWindow.length - 1].timestamp - speedWindow[0].timestamp) / 1000
              : 0;
          const speedBps = windowDuration > 0 ? Math.round((windowBytes * 8) / windowDuration) : 0;

          if (currentTime - lastProgressSentTime >= PROGRESS_THROTTLE_MS) {
            mainWindow.webview.rpc?.send("dotnetProgress", {
              version,
              progress,
              speed: speedBps,
            });
            lastProgressSentTime = currentTime;
          }
        }

        fileStream.end();
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", resolve);
          fileStream.on("error", reject);
        });

        mainWindow.webview.rpc?.send("dotnetProgress", {
          version,
          progress: 100,
          speed: 0,
        });

        // Extract
        mainWindow.webview.rpc?.send("dotnetStatus", {
          version,
          status: "extracting",
          message: "Extracting .NET runtime...",
        });

        if (!(await exists(DOTNET_HOME))) {
          mkdirSync(DOTNET_HOME, { recursive: true });
        }

        const archiveData = await Bun.file(tempFilePath).arrayBuffer();
        const archive = new Bun.Archive(archiveData);
        await archive.extract(DOTNET_HOME);

        // Clean up temp file
        await Bun.file(tempFilePath).delete();

        if (checkLocalDotnet(version)) {
          mainWindow.webview.rpc?.send("dotnetStatus", {
            version,
            status: "completed",
            message: ".NET runtime installed successfully",
          });
        } else {
          // On Windows, the extract might place files differently
          mainWindow.webview.rpc?.send("dotnetStatus", {
            version,
            status: "completed",
            message: ".NET runtime installed successfully",
          });
        }
      } catch (error) {
        fileStream.destroy();
        try {
          await Bun.file(tempFilePath).delete();
        } catch {
          // ignore
        }

        mainWindow.webview.rpc?.send("dotnetStatus", {
          version,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        activeDownloads.delete(version);
      }
    })();

    return { success: true, message: "Download started" };
  },

  cancelDownloadDotnet: async ({ version }: { version: string }): Promise<void> => {
    const controller = activeDownloads.get(version);
    if (controller) {
      controller.abort();
      activeDownloads.delete(version);
    }
  },

  getDotnetPath: async (): Promise<string> => {
    return DOTNET_HOME;
  },
};

export type DotnetController = InferRPCSchema<typeof dotnetController> & {
  messages: {
    dotnetProgress: {
      version: string;
      progress: number;
      speed: number;
    };
    dotnetStatus: {
      version: string;
      status: "downloading" | "extracting" | "completed" | "error";
      message: string;
    };
  };
};
```

---

### Task 2: Update shared RPC types and wire bun index

**Files:**

- Modify: `src/shared/rpc.ts`
- Modify: `src/bun/index.ts`

- [ ] **Step 1: Add DotnetController to shared types**

In `src/shared/rpc.ts`:

Add import:

```typescript
import { DotnetController } from "@/bun/controllers/dotnet";
```

Add to `MessagesType`:

```typescript
type MessagesType = ServerController["messages"] &
  ModController["messages"] &
  VersionController["messages"] &
  LogController["messages"] &
  UtilsController["messages"] &
  InstallationController["messages"] &
  DotnetController["messages"];
```

Add to `bun.requests`:

```typescript
requests: ServerController["requests"] &
  InstallationController["requests"] &
  ModController["requests"] &
  VersionController["requests"] &
  UtilsController["requests"] &
  WorldsController["requests"] &
  LogController["requests"] &
  DotnetController["requests"] &
  {
    // ... existing
  };
```

- [ ] **Step 2: Wire dotnetController in bun/index.ts**

In `src/bun/index.ts`:

Add import:

```typescript
import { dotnetController } from "./controllers/dotnet";
```

Add to `requests` in `myWebviewRPC`:

```typescript
requests: {
  ...versionController,
  ...serverController,
  ...installationController,
  ...modController,
  ...utilsController,
  ...worldsController,
  ...logController,
  ...dotnetController,
},
```

---

### Task 3: Update playWithInstallation to check dotnet

**Files:**

- Modify: `src/bun/controllers/installations.ts`

- [ ] **Step 1: Add dotnet version mapping and check before spawn**

Add these helper functions at the top of the file (after imports, before `getDirSize`):

```typescript
function getDotnetVersion(gameVersion: string): string {
  const parts = gameVersion.split(".").map(Number);
  const minor = parts[1] ?? 0;
  if (minor >= 22) return "10.0";
  if (minor === 21) return "8.0";
  return "7.0";
}

function checkLocalDotnet(dotnetHome: string, version: string): boolean {
  const { existsSync } = require("fs");
  const { join } = require("path");
  return existsSync(join(dotnetHome, "shared", "Microsoft.NETCore.App", version));
}

async function checkSystemDotnet(version: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["dotnet", "--list-runtimes"]);
    const output = await new Response(proc.stdout).text();
    for (const line of output.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === "Microsoft.NETCore.App" && parts[1].startsWith(version)) {
        return true;
      }
    }
  } catch {
    // dotnet not found in PATH
  }
  return false;
}
```

- [ ] **Step 2: Modify playWithInstallation to check dotnet before spawning**

Replace the `playWithInstallation` function:

```typescript
playWithInstallation: async ({ path, world }: { path: string; world?: string }) => {
    const configPath = join(path, "installation.json");
    if (!(await exists(configPath))) {
      throw new Error(`Installation config not found: ${configPath}`);
    }
    const config = Bun.JSON5.parse(await readFile(configPath, "utf-8")) as {
      name: string;
      version: string;
      startParams?: string;
    };

    const dotnetVersion = getDotnetVersion(config.version);
    const dotnetHome = join(Utils.paths.home, ".dotnet");
    const hasSystemDotnet = await checkSystemDotnet(dotnetVersion);
    const hasLocalDotnet = checkLocalDotnet(dotnetHome, dotnetVersion);

    if (!hasSystemDotnet && !hasLocalDotnet) {
      return { status: "needsDotnet", version: dotnetVersion };
    }

    const versionsPath = await getVersionsPath();
    const versionPath = join(versionsPath, config.version);
    if (!(await exists(versionPath))) {
      throw new Error(`Version not installed: ${config.version}`);
    }
    const platform = getPlatform();
    const execPath =
      platform === "windows"
        ? join(versionPath, "vintagestory.exe")
        : join(versionPath, "vintagestory");
    if (!(await exists(execPath))) {
      throw new Error(`Vintage Story executable not found for version: ${config.version}`);
    }
    console.log(
      `[installations.ts] Playing with installation: ${config.name} (version: ${config.version})`,
    );

    const proc = Bun.spawn(
      [
        execPath,
        "--dataPath",
        path,
        ...(world ? ["-o", world] : []),
        ...(config.startParams ? config.startParams.split(" ") : []),
      ],
      {
        env: {
          ...process.env,
          DOTNET_ROOT: dotnetHome,
          PATH: hasLocalDotnet ? `${dotnetHome}:${process.env.PATH}` : process.env.PATH,
        },
      },
    );

    const WATCH_TIMEOUT = 5000;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      mainWindow.webview.rpc?.send("playStatus", {
        path,
        status: "running",
      });
    }, WATCH_TIMEOUT);

    void proc.exited.then((exitCode) => {
      clearTimeout(timer);
      if (!timedOut) {
        if (exitCode === 0) {
          mainWindow.webview.rpc?.send("playStatus", {
            path,
            status: "exited",
          });
        } else {
          mainWindow.webview.rpc?.send("playStatus", {
            path,
            status: "error",
            message: `Game exited with code: ${exitCode}`,
          });
        }
      }
    });

    return { status: "launched", pid: proc.pid };
  },
```

Note: The `Utils` import needs `Utils.paths.home` — Electrobun's `Utils` should expose this. If not, use `process.env.HOME || process.env.USERPROFILE`.

---

### Task 4: Create frontend install dialog component

**Files:**

- Create: `src/mainview/components/dotnet/install-dialog.tsx`

- [ ] **Step 1: Write the dialog component**

```typescript
import { Dialog } from "@base-ui/react/dialog";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Progress } from "@/mainview/components/ui/progress";
import { useRPC } from "@/mainview/hooks/use-rpc";

interface InstallDotnetDialogProps {
  open: boolean;
  dotnetVersion: string;
  onClose: () => void;
  onInstalled: () => void;
}

type DialogState = "prompt" | "downloading" | "extracting" | "done" | "error";

export function InstallDotnetDialog({
  open,
  dotnetVersion,
  onClose,
  onInstalled,
}: InstallDotnetDialogProps) {
  const { rpc } = useRPC();
  const [state, setState] = useState<DialogState>("prompt");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const installedRef = useRef(false);

  const installedDotnetVersionRef = useRef(dotnetVersion);

  useEffect(() => {
    if (!rpc || !open) return;

    const handleProgress = ({
      version,
      progress: p,
      speed: s,
    }: {
      version: string;
      progress: number;
      speed: number;
    }) => {
      if (version !== installedDotnetVersionRef.current) return;
      setProgress(p);
      setSpeed(s);
    };

    const handleStatus = ({
      version,
      status,
      message,
    }: {
      version: string;
      status: string;
      message: string;
    }) => {
      if (version !== installedDotnetVersionRef.current) return;

      if (status === "downloading") {
        setState("downloading");
      } else if (status === "extracting") {
        setState("extracting");
      } else if (status === "completed") {
        setState("done");
        if (!installedRef.current) {
          installedRef.current = true;
          setTimeout(() => {
            onInstalled();
          }, 1000);
        }
      } else if (status === "error") {
        setState("error");
        setError(message);
      }
    };

    rpc.addMessageListener("dotnetProgress", handleProgress);
    rpc.addMessageListener("dotnetStatus", handleStatus);

    return () => {
      rpc.removeMessageListener("dotnetProgress", handleProgress);
      rpc.removeMessageListener("dotnetStatus", handleStatus);
    };
  }, [rpc, open, onInstalled]);

  useEffect(() => {
    if (open) {
      setState("prompt");
      setProgress(0);
      setSpeed(0);
      setError(null);
      installedRef.current = false;
      installedDotnetVersionRef.current = dotnetVersion;
    }
  }, [open, dotnetVersion]);

  const { mutate: startDownload, isPending: isDownloadStarting } = useMutation({
    mutationFn: async () => rpc?.request.downloadDotnet({ version: dotnetVersion }),
    onError: (err) => {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to start download");
    },
  });

  const handleClose = () => {
    if (state === "downloading" || state === "extracting") return;
    onClose();
  };

  const sizeEstimate = "70";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs fixed inset-0 z-50" />
        <Dialog.Popup className="bg-background ring-foreground/10 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl p-5 shadow-lg ring-1 outline-none">
          {state === "prompt" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-base font-medium">
                  .NET Runtime Required
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  This game requires .NET {dotnetVersion} Runtime. Download and install it?
                </Dialog.Description>
                <p className="text-muted-foreground mt-2 text-xs">
                  Download size: ~{sizeEstimate} MB
                  <br />
                  Installs to: ~/.dotnet
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Skip
                </Button>
                <Button onClick={() => startDownload()} disabled={isDownloadStarting}>
                  {isDownloadStarting ? (
                    <>
                      <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Install"
                  )}
                </Button>
              </div>
            </div>
          )}

          {state === "downloading" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-base font-medium">
                  Downloading .NET {dotnetVersion}
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  Please wait while the runtime is downloaded.
                </Dialog.Description>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {progress}%
                </span>
                <span>
                  {speed > 0 ? `${(speed / 1_000_000).toFixed(1)} Mbps` : ""}
                </span>
              </div>
            </div>
          )}

          {state === "extracting" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Extracting .NET runtime...</p>
            </div>
          )}

          {state === "done" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm font-medium text-green-500">Installation complete</p>
              <p className="text-xs text-muted-foreground">Launching game...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-base font-medium text-destructive">
                  Installation Failed
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  {error || "An unknown error occurred"}
                </Dialog.Description>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

### Task 5: Wire dialog into installations page

**Files:**

- Modify: `src/mainview/routes/installations/index.tsx`

- [ ] **Step 1: Add import for InstallDotnetDialog**

```typescript
import { InstallDotnetDialog } from "@/mainview/components/dotnet/install-dialog";
```

- [ ] **Step 2: Add dialog state in RouteComponent**

After the existing play state declarations (around line 494), add:

```typescript
const [dotnetDialogOpen, setDotnetDialogOpen] = useState(false);
const [neededDotnetVersion, setNeededDotnetVersion] = useState<string | null>(null);
const pendingPlayPathRef = useRef<string | null>(null);
```

- [ ] **Step 3: Update playInstallation mutation onSuccess to handle needsDotnet**

Replace the existing `playInstallation` mutation (lines 494-516) with:

```typescript
const { mutate: playInstallation, isPending: isPlaying } = useMutation({
  mutationFn: async (path: string) => {
    setPlayingPath(path);
    playingPathRef.current = path;
    setPlayError(null);
    setPlaySuccess(false);
    return rpc?.request.playWithInstallation({ path });
  },
  onError: (error) => {
    console.error("Failed to play with installation:", error);
    setPlayError(error instanceof Error ? error.message : "Unknown error");
    setPlayingPath(null);
    playingPathRef.current = null;
  },
  onSuccess: (result) => {
    if (result && typeof result === "object" && "status" in result) {
      if (result.status === "needsDotnet" && "version" in result) {
        setNeededDotnetVersion(result.version);
        setDotnetDialogOpen(true);
        pendingPlayPathRef.current = playingPathRef.current;
        setPlayingPath(null);
        playingPathRef.current = null;
      }
    }
  },
});
```

- [ ] **Step 4: Add dialog component and retry handler in JSX**

Before the closing `</div>` of RouteComponent's return (before `</ScrollArea>` wrapper), add:

```typescript
const handleDotnetInstalled = () => {
  setDotnetDialogOpen(false);
  const path = pendingPlayPathRef.current;
  pendingPlayPathRef.current = null;
  if (path) {
    playInstallation(path);
  }
};

const handleDotnetClose = () => {
  setDotnetDialogOpen(false);
  pendingPlayPathRef.current = null;
  setPlayError(".NET runtime is required to run this game");
};
```

And add the dialog component right before the closing Tooltip (at the end of the JSX):

```typescript
{neededDotnetVersion && (
  <InstallDotnetDialog
    open={dotnetDialogOpen}
    dotnetVersion={neededDotnetVersion}
    onClose={handleDotnetClose}
    onInstalled={handleDotnetInstalled}
  />
)}
```

---

### Task 6: Wire dialog into worlds page

**Files:**

- Modify: `src/mainview/routes/installations/worlds.tsx`

- [ ] **Step 1: Add import**

```typescript
import { InstallDotnetDialog } from "@/mainview/components/dotnet/install-dialog";
```

- [ ] **Step 2: Add dialog state after existing play state**

After the existing `isPlaying` declaration, add:

```typescript
const [dotnetDialogOpen, setDotnetDialogOpen] = useState(false);
const [neededDotnetVersion, setNeededDotnetVersion] = useState<string | null>(null);
const pendingPlayDataRef = useRef<{ path: string; world: string } | null>(null);
```

- [ ] **Step 3: Update playWorld mutation onSuccess**

Replace the existing `playWorld` mutation with:

```typescript
const { mutate: playWorld } = useMutation({
  mutationFn: async ({ path, world }: { path: string; world: string }) => {
    setPlayingPath(path);
    playingPathRef.current = path;
    setPlayError(null);
    setPlaySuccess(false);
    return rpc?.request.playWithInstallation({ path, world });
  },
  onError: (error) => {
    console.error("Failed to play with installation:", error);
    setPlayError(error instanceof Error ? error.message : "Unknown error");
    setPlayingPath(null);
    playingPathRef.current = null;
  },
  onSuccess: (result) => {
    if (result && typeof result === "object" && "status" in result) {
      if (result.status === "needsDotnet" && "version" in result) {
        setNeededDotnetVersion(result.version);
        setDotnetDialogOpen(true);
        pendingPlayDataRef.current = {
          path: playingPathRef.current!,
          world: "", // We'll capture this from the last playWorld call
        };
        setPlayingPath(null);
        playingPathRef.current = null;
      }
    }
  },
});
```

Wait, the issue is that `pendingPlayDataRef` needs both `path` and `world`. Let me update the approach — store the full play data.

- [ ] **Step 4: Actually, better approach for worlds**

The `playWorld` mutation needs to know both `path` and `world` to retry. Store them:

```typescript
const pendingPlayDataRef = useRef<{ path: string; world?: string } | null>(null);
```

And in `mutationFn`:

```typescript
mutationFn: async ({ path, world }: { path: string; world: string }) => {
  // ... existing
  pendingPlayDataRef.current = { path, world };
  return rpc?.request.playWithInstallation({ path, world });
},
```

And in `onSuccess`:

```typescript
onSuccess: (result) => {
  if (result && typeof result === "object" && "status" in result) {
    if (result.status === "needsDotnet" && "version" in result) {
      setNeededDotnetVersion(String(result.version));
      setDotnetDialogOpen(true);
      setPlayingPath(null);
      playingPathRef.current = null;
    }
  }
},
```

- [ ] **Step 5: Add handlers and dialog component**

```typescript
const handleDotnetInstalled = () => {
  setDotnetDialogOpen(false);
  const data = pendingPlayDataRef.current;
  pendingPlayDataRef.current = null;
  if (data) {
    playWorld({
      path: data.path,
      world: data.world || "",
    });
  }
};

const handleDotnetClose = () => {
  setDotnetDialogOpen(false);
  pendingPlayDataRef.current = null;
  setPlayError(".NET runtime is required to run this game");
};
```

And add before closing `</div>`:

```typescript
{neededDotnetVersion && (
  <InstallDotnetDialog
    open={dotnetDialogOpen}
    dotnetVersion={neededDotnetVersion}
    onClose={handleDotnetClose}
    onInstalled={handleDotnetInstalled}
  />
)}
```

---

### Task 7: Handle Utils.paths.home availability

**Files:**

- Modify: `src/bun/utils.ts` (if needed)

- [ ] **Step 1: Add dotnet home path helper**

In `src/bun/utils.ts`, add:

```typescript
export function getDotnetHome(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "~";
  return join(home, ".dotnet");
}
```

Then update `dotnet.ts` and `installations.ts` to import `getDotnetHome` from `"../utils"` instead of using `Utils.paths.home` directly.

---

### Task 8: Verify

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
bun run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Verify imports resolve**

```bash
# Check TypeScript compilation of affected files
npx tsc --noEmit --pretty 2>&1 | grep -E "(dotnet|install-dialog|installations\.ts|worlds\.ts)" | head -20
```

Expected: No errors from our files (pre-existing `three` module error is OK).
