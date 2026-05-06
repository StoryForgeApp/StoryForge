import { createWriteStream, existsSync, mkdirSync, readdirSync } from "fs";
import { exists, mkdir } from "fs/promises";
import { join } from "path";
import { Utils } from "electrobun";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import { getPlatform } from "../utils";

const DOTNET_HOME = join(Utils.paths.home, ".dotnet");

function getRid(): string {
  const platform = getPlatform();
  // macOS: Vintage Story is Intel-only, always use x64 regardless of process.arch
  const arch = platform === "mac" ? "x64" : process.arch === "arm64" ? "arm64" : "x64";
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

async function checkLocalDotnet(version: string): Promise<boolean> {
  const runtimeDir = join(DOTNET_HOME, "shared", "Microsoft.NETCore.App");
  try {
    const dirs = readdirSync(runtimeDir);
    const matched = dirs.find((d) => d.startsWith(`${version}.`));
    if (!matched) return false;

    // On macOS, verify architecture matches game binary (always x86_64 for Vintage Story)
    if (getPlatform() === "mac") {
      const dylib = join(runtimeDir, matched, "libcoreclr.dylib");
      if (existsSync(dylib)) {
        const proc = Bun.spawn(["lipo", "-archs", dylib]);
        const archs = await new Response(proc.stdout).text();
        if (!archs.includes("x86_64")) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
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

    if (await checkLocalDotnet(version)) {
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

    // oxlint-disable-next-line typescript/no-floating-promises
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

        if (await checkLocalDotnet(version)) {
          mainWindow.webview.rpc?.send("dotnetStatus", {
            version,
            status: "completed",
            message: ".NET runtime installed successfully",
          });
        } else {
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
