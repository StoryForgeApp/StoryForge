import { InferRPCSchema } from "@/shared/helper";
import { createZipReader } from "@holmlibs/unzip";
import { createWriteStream } from "fs";
import { exists, mkdir, readdir, symlink } from "fs/promises";
import { join } from "path";
import { mainWindow } from "..";
import { getModsCachePath } from "../utils";

interface Mod {
  modid: number;
  assetid: number;
  downloads: number;
  follows: number;
  trendingpoints: number;
  comments: number;
  name: string;
  summary: string;
  modidstrs: string[];
  author: string;
  urlalias: string | null;
  side: "both" | "client" | "server";
  type: string;
  logo: string | null;
  tags: string[];
  lastreleased: string;
}

interface ModResponse {
  mod: ModInfo;
  statuscode: string;
}

interface ModInfo {
  modid: number;
  assetid: number;
  name: string;
  text?: string;
  author: string;
  urlalias: string | null;
  logofilename: string | null;
  logofile: string | null;
  logofiledb: string | null;
  homepageurl: string;
  sourcecodeurl: string;
  trailervideourl: string;
  issuetrackerurl: string;
  wikiurl: string;
  downloads: number;
  follows: number;
  trendingpoints: number;
  comments: number;
  side: "both" | "client" | "server";
  type: string;
  created: string;
  lastreleased: string;
  lastmodified: string;
  tags: string[];
  releases: Release[];
  screenshots: string[];
}

interface Release {
  releaseid: number;
  mainfile: string;
  filename: string;
  fileid: number;
  downloads: number;
  tags: string[];
  modidstr: string;
  modversion: string;
  created: string;
  changelog: string;
}

interface Update {
  releaseid: number;
  mainfile: string;
  filename: string;
  fileid: number;
  downloads: number;
  tags: string[];
  modidstr: string;
  modversion: string;
  created: string;
}

const modsCachePath = await getModsCachePath();
const modsCacheFile = join(modsCachePath, "cache.json");

// Track active downloads for cancellation
const activeDownloads = new Map<
  string,
  {
    abortController: AbortController;
    fileStream?: ReturnType<typeof createWriteStream>;
    tempFilePath?: string;
    reader?: ReadableStreamDefaultReader<Uint8Array>;
  }
>();

export const modController = {
  cancelModDownload: async ({ modid }: { modid: number }): Promise<void> => {
    console.log("[mods.ts] Cancelling download for modid:", modid);
    const download = activeDownloads.get(modid.toString());
    if (download) {
      // Abort the fetch
      download.abortController.abort();

      // Close the file stream
      if (download.fileStream) {
        download.fileStream.destroy();
      }

      // Cancel the reader
      if (download.reader) {
        try {
          await download.reader.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }

      // Clean up temp file
      if (download.tempFilePath) {
        try {
          await Bun.file(download.tempFilePath).delete();
          console.log("[mods.ts] Cleaned up temp file:", download.tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }

      activeDownloads.delete(modid.toString());
      console.log("[mods.ts] Download cancelled and cleaned up for modid:", modid);
    } else {
      console.log("[mods.ts] No active download found for modid:", modid);
    }
  },
  installMod: async ({
    path,
    url,
    modid,
  }: {
    path: string;
    url: string;
    modid: number;
  }): Promise<{ success: boolean; message: string; cacheHit?: boolean }> => {
    const installationModsPath = join(path, "Mods");
    await mkdir(installationModsPath, { recursive: true });

    // Check in modsCacheFile if we have a cached version of the mod for this URL
    const cacheFileRef = Bun.file(modsCacheFile);
    const cacheFileExists = await cacheFileRef.exists();
    let cache: Record<string, string> = cacheFileExists
      ? (Bun.JSON5.parse(await cacheFileRef.text()) as Record<string, string>)
      : {};

    if (cache[url]) {
      // We have a cached version of the mod, we can use it
      const cachedModPath = cache[url];
      // Make a symlink of the cached mod to the installation's Mods folder
      await symlink(
        join(modsCachePath, cachedModPath),
        join(installationModsPath, cachedModPath),
        "file",
      );
      console.log(`[mods.ts] Installed mod from cache for URL: ${url}`);
      return { success: true, message: "Mod installed from cache", cacheHit: true };
    }

    // No cached version, we need to download it with progress tracking
    const abortController = new AbortController();
    const { signal } = abortController;

    console.log("[mods.ts] Starting download for modid:", modid, "URL:", url);

    // Check if already downloading
    if (activeDownloads.has(modid.toString())) {
      return { success: false, message: "Download already in progress" };
    }

    const modFileName = url.split("=").pop() || `mod_${Date.now()}.zip`;
    const modFilePath = join(modsCachePath, modFileName);

    // Ensure the mods cache directory exists before writing
    await mkdir(modsCachePath, { recursive: true });

    const fileStream = createWriteStream(modFilePath);

    // Track this download for cancellation
    activeDownloads.set(modid.toString(), {
      abortController,
      fileStream,
      tempFilePath: modFilePath,
    });

    // Send initial status event
    mainWindow.webview.rpc?.send("downloadModStatus", {
      modid,
      status: "downloading",
      message: "Download started",
    });

    // Start the download process asynchronously (don't await)
    // oxlint-disable-next-line typescript/no-floating-promises
    (async () => {
      try {
        const response = await fetch(url, { signal });
        console.log("[mods.ts] Download response status:", response.status);

        if (!response.ok) {
          throw new Error(`Failed to download mod from URL: ${url}`);
        }

        const totalSize = parseInt(response.headers.get("Content-Length") || "0", 10);
        console.log("[mods.ts] Total file size:", totalSize);
        let downloadedSize = 0;
        const SPEED_WINDOW_MS = 1000; // Calculate speed over 1 second window
        const speedWindow: { timestamp: number; bytes: number }[] = [];
        const PROGRESS_THROTTLE_MS = 250; // Only send progress updates every 250ms
        let lastProgressSentTime = 0;

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to read download stream");
        }

        // Update tracking with reader
        const download = activeDownloads.get(modid.toString());
        if (download) {
          download.reader = reader;
        }

        console.log("[mods.ts] Starting download...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          // Check if download was cancelled (cancelModDownload removes from activeDownloads)
          if (!activeDownloads.has(modid.toString())) {
            console.log("[mods.ts] Download was cancelled during streaming");
            break;
          }

          // Write chunk to file
          fileStream.write(value);

          downloadedSize += value.length;
          const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;

          // Track this chunk in the speed window
          const currentTime = Date.now();
          speedWindow.push({ bytes: value.length, timestamp: currentTime });

          // Remove old entries outside the window
          const windowStart = currentTime - SPEED_WINDOW_MS;
          while (speedWindow.length > 0 && speedWindow[0].timestamp < windowStart) {
            speedWindow.shift();
          }

          // Calculate speed over the window
          const windowBytes = speedWindow.reduce((sum, entry) => sum + entry.bytes, 0);
          const windowDuration =
            speedWindow.length > 1
              ? (speedWindow[speedWindow.length - 1].timestamp - speedWindow[0].timestamp) / 1000
              : 0;
          const speedBps = windowDuration > 0 ? Math.round((windowBytes * 8) / windowDuration) : 0;

          // Throttle progress updates to avoid overwhelming the frontend
          const shouldSendProgress = currentTime - lastProgressSentTime >= PROGRESS_THROTTLE_MS;
          if (shouldSendProgress) {
            console.log(
              "[mods.ts] Download progress:",
              progress,
              "%, Speed:",
              speedBps,
              "bps (window:",
              windowBytes,
              "bytes over",
              windowDuration.toFixed(2),
              "s)",
            );
            mainWindow.webview.rpc?.send("downloadModProgress", {
              modid,
              progress,
              speed: speedBps,
            });
            lastProgressSentTime = currentTime;
          }
        }

        // Check if download was cancelled (cancelModDownload removes from activeDownloads)
        if (!activeDownloads.has(modid.toString()) || signal.aborted) {
          fileStream.destroy();
          throw new Error("Download cancelled");
        }

        console.log("[mods.ts] Download complete");
        fileStream.end();

        // Wait for file to finish writing
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", () => {
            console.log("[mods.ts] File stream finished");
            resolve();
          });
          fileStream.on("error", reject);
        });

        mainWindow.webview.rpc?.send("downloadModProgress", {
          modid,
          progress: 100,
          speed: 0,
        });

        // Cache the downloaded mod
        cache[url] = modFileName;
        await Bun.write(modsCacheFile, Bun.JSON5.stringify(cache, null, 2) || "");

        // Symlink the mod to the installation's Mods folder
        await symlink(modFilePath, join(installationModsPath, modFileName), "file");
        console.log(`[mods.ts] Installed mod from URL and cached it for future use: ${url}`);

        // Send success status event
        mainWindow.webview.rpc?.send("downloadModStatus", {
          modid,
          status: "completed",
          message: "Download and installation completed successfully",
        });
      } catch (error) {
        if (signal.aborted) {
          console.log("[mods.ts] Download was cancelled");
          // Send cancelled status event
          mainWindow.webview.rpc?.send("downloadModStatus", {
            modid,
            status: "cancelled",
            message: "Download was cancelled",
          });
        } else {
          console.error("[mods.ts] Error during download:", error);
          fileStream.destroy();
          // Clean up temp file on error
          try {
            await Bun.file(modFilePath).delete();
          } catch {
            // Ignore cleanup errors
          }
          // Send error status event
          mainWindow.webview.rpc?.send("downloadModStatus", {
            modid,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      } finally {
        // Clean up tracking
        activeDownloads.delete(modid.toString());
      }
    })();

    // Return immediately to the frontend
    return { success: true, message: "Download started" };
  },
  fetchMods: async ({
    search,
    versions = [],
  }: {
    search?: string;
    versions: string[];
  }): Promise<Mod[]> => {
    const url = new URL(`https://mods.vintagestory.at/api/mods`);
    if (search) {
      url.searchParams.append("text", search);
    }
    versions.forEach((version) => url.searchParams.append("gameversions[]", version));
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch mods: ${response.statusText}`);
    }
    const modsText = await response.text();
    const mods = Bun.JSON5.parse(modsText) as { mods: Mod[] };
    return mods.mods;
  },
  fetchModInfo: async ({ modid }: { modid: number }): Promise<ModResponse> => {
    const response = await fetch(`https://mods.vintagestory.at/api/mod/${modid}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch mod info for modid ${modid}: ${response.statusText}`);
    }
    const modInfoText = await response.text();
    const modInfo = Bun.JSON5.parse(modInfoText) as ModResponse;
    return modInfo;
  },
  getInstalledMods: async ({ path }: { path: string }) => {
    const modsDir = join(path, "Mods");
    console.log("[mods.ts] Checking for installed mods in:", modsDir);
    if (!(await exists(modsDir))) {
      return [];
    }
    const entries = await readdir(modsDir);
    const mods = await Promise.all(
      entries.map(async (entry) => {
        try {
          if (!entry.endsWith(".zip")) {
            return null;
          }
          const entryPath = join(modsDir, entry);
          const file = Bun.file(entryPath);
          if (!(await file.exists())) {
            console.warn("[mods.ts] Mod file does not exist:", entryPath);
            return null;
          }
          const archive = createZipReader(entryPath);
          const modinfoEntry = archive.getEntry("modinfo.json");
          if (!modinfoEntry) {
            console.warn("[mods.ts] modinfo.json not found in archive:", entryPath);
            return null;
          }
          // Convert all keys to lowercase to handle case sensitivity issues in modinfo.json files
          const modinfoText = await modinfoEntry.getText();
          const manifest = Bun.JSON5.parse(modinfoText) as Record<string, any>;
          const lowerCaseManifest = Object.keys(manifest).reduce(
            (acc, key) => {
              acc[key.toLowerCase()] = manifest[key];
              return acc;
            },
            {} as Record<string, any>,
          );
          return {
            name: lowerCaseManifest.name,
            version: lowerCaseManifest.version,
            modid: lowerCaseManifest.modid,
            file: entry,
          };
        } catch (error) {
          console.error("[mods.ts] Error reading mod:", entry, error);
          return null;
        }
      }),
    );
    return mods.filter((mod) => mod !== null);
  },
  removeMod: async ({ path, modzip }: { path: string; modzip: string }) => {
    const modPath = join(path, "Mods", modzip);
    try {
      await Bun.file(modPath).delete();
      console.log("[mods.ts] Removed mod:", modPath);
      return { success: true };
    } catch (error) {
      console.error("[mods.ts] Failed to remove mod:", error);
      return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
    }
  },
  fetchModUpdates: async ({
    modsString,
  }: {
    modsString: string;
  }): Promise<Record<string, Update>> => {
    const response = await fetch(
      `https://mods.vintagestory.at/api/updates?mods=${encodeURIComponent(modsString)}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch mod updates: ${response.statusText}`);
    }
    const updatesText = await response.text();
    const updates = Bun.JSON5.parse(updatesText) as { updates: Record<string, Update> };
    return updates.updates;
    // Implementation for fetching mod updates
  },
};

export type ModController = InferRPCSchema<typeof modController> & {
  messages: {
    downloadModProgress: {
      modid: number;
      progress: number;
      speed: number;
    };
    downloadModStatus: {
      modid: number;
      status: "downloading" | "completed" | "cancelled" | "error";
      message: string;
    };
  };
};
