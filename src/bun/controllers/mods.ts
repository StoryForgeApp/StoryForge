import { createWriteStream } from "fs";
import { exists, link, mkdir, readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { createZipReader } from "@holmlibs/unzip";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import { logger } from "../logger";
import { getInstallationsPath, getModsCachePath } from "../utils";

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
    logger.info("mods", `Cancelling download for modid: ${modid}`);
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
          logger.info("mods", `Cleaned up temp file: ${download.tempFilePath}`);
        } catch {
          // Ignore cleanup errors
        }
      }

      activeDownloads.delete(modid.toString());
      logger.info("mods", `Download cancelled and cleaned up for modid: ${modid}`);
    } else {
      logger.info("mods", `No active download found for modid: ${modid}`);
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
      await link(join(modsCachePath, cachedModPath), join(installationModsPath, cachedModPath));
      logger.info("mods", `Installed mod from cache for URL: ${url}`);
      return { success: true, message: "Mod installed from cache", cacheHit: true };
    }

    // No cached version, we need to download it with progress tracking
    const abortController = new AbortController();
    const { signal } = abortController;

    logger.info("mods", `Starting download for modid: ${modid}, URL: ${url}`);

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
        logger.info("mods", `Download response status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`Failed to download mod from URL: ${url}`);
        }

        const totalSize = parseInt(response.headers.get("Content-Length") || "0", 10);
        logger.info("mods", `Total file size: ${totalSize}`);
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

        logger.info("mods", "Starting download...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          // Check if download was cancelled (cancelModDownload removes from activeDownloads)
          if (!activeDownloads.has(modid.toString())) {
            logger.info("mods", "Download was cancelled during streaming");
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
            logger.info(
              "mods",
              `Download progress: ${progress}%, Speed: ${speedBps}bps (window: ${windowBytes} bytes over ${windowDuration.toFixed(2)}s)`,
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

        logger.info("mods", "Download complete");
        fileStream.end();

        // Wait for file to finish writing
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", () => {
            logger.info("mods", "File stream finished");
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
        await link(modFilePath, join(installationModsPath, modFileName));
        logger.info("mods", `Installed mod from URL and cached it for future use: ${url}`);

        // Send success status event
        mainWindow.webview.rpc?.send("downloadModStatus", {
          modid,
          status: "completed",
          message: "Download and installation completed successfully",
        });
      } catch (error) {
        if (signal.aborted) {
          logger.info("mods", "Download was cancelled");
          // Send cancelled status event
          mainWindow.webview.rpc?.send("downloadModStatus", {
            modid,
            status: "cancelled",
            message: "Download was cancelled",
          });
        } else {
          logger.error("mods", "Error during download", error);
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
    versions,
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
  getInstalledMods: async ({
    path,
  }: {
    path: string;
  }): Promise<
    {
      name: string;
      version: string;
      modid: string;
      file: string;
    }[]
  > => {
    const modsDir = join(path, "Mods");
    logger.info("mods", `Checking for installed mods in: ${modsDir}`);
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
            logger.warn("mods", `Mod file does not exist: ${entryPath}`);
            return null;
          }
          const archive = createZipReader(entryPath);
          const modinfoEntry = archive.getEntry("modinfo.json");
          if (!modinfoEntry) {
            logger.warn("mods", `modinfo.json not found in archive: ${entryPath}`);
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
            {} as Record<string, string>,
          );
          return {
            name: lowerCaseManifest.name,
            version: lowerCaseManifest.version,
            modid: lowerCaseManifest.modid,
            file: entry,
          };
        } catch (error) {
          logger.error("mods", `Error reading mod ${entry}`, error);
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
      logger.info("mods", `Removed mod: ${modPath}`);
      return { success: true };
    } catch (error) {
      logger.error("mods", "Failed to remove mod", error);
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

  getCachedMods: async (): Promise<{
    mods: {
      file: string;
      size: number;
      inUse: boolean;
      modName?: string;
    }[];
    totalSize: number;
  }> => {
    const cachePath = await getModsCachePath();

    // Collect inodes from all installations' Mods/ dirs
    const inUseInodes = new Set<number>();
    try {
      const installationsPath = await getInstallationsPath();
      const installDirs = await readdir(installationsPath);
      for (const dir of installDirs) {
        const modsDir = join(installationsPath, dir, "Mods");
        try {
          const modFiles = await readdir(modsDir);
          for (const modFile of modFiles) {
            if (!modFile.endsWith(".zip")) continue;
            try {
              const s = await stat(join(modsDir, modFile));
              inUseInodes.add(s.ino);
            } catch {
              // file removed
            }
          }
        } catch {
          // no Mods dir
        }
      }
    } catch {
      // no installations
    }

    const mods: {
      file: string;
      size: number;
      inUse: boolean;
      modName?: string;
    }[] = [];
    let totalSize = 0;

    try {
      const files = await readdir(cachePath);
      for (const file of files) {
        if (file === "cache.json" || file.startsWith(".")) continue;
        const filePath = join(cachePath, file);
        try {
          const s = await stat(filePath);
          totalSize += s.size;

          let modName: string | undefined;
          try {
            const archive = createZipReader(filePath);
            const modinfoEntry = archive.getEntry("modinfo.json");
            if (modinfoEntry) {
              const text = await modinfoEntry.getText();
              const manifest = Bun.JSON5.parse(text) as Record<string, unknown>;
              const name = manifest.name ?? manifest.Name;
              if (typeof name === "string") modName = name;
            }
          } catch {
            // unable to read modinfo
          }

          mods.push({
            file,
            size: s.size,
            inUse: inUseInodes.has(s.ino),
            modName: modName || undefined,
          });
        } catch {
          // file removed mid-scan
        }
      }
    } catch {
      // no cache dir
    }

    mods.sort((a, b) => b.size - a.size);

    return { mods, totalSize };
  },

  removeOrphanedMods: async (): Promise<{
    removed: number;
    freedBytes: number;
  }> => {
    const cachePath = await getModsCachePath();
    const cacheFilePath = join(cachePath, "cache.json");

    // Collect inodes from all installations' Mods/ dirs
    const inUseInodes = new Set<number>();
    try {
      const installationsPath = await getInstallationsPath();
      const installDirs = await readdir(installationsPath);
      for (const dir of installDirs) {
        const modsDir = join(installationsPath, dir, "Mods");
        try {
          const modFiles = await readdir(modsDir);
          for (const modFile of modFiles) {
            if (!modFile.endsWith(".zip")) continue;
            try {
              const s = await stat(join(modsDir, modFile));
              inUseInodes.add(s.ino);
            } catch {
              // file removed
            }
          }
        } catch {
          // no Mods dir
        }
      }
    } catch {
      // no installations
    }

    let removed = 0;
    let freedBytes = 0;
    const keptCache: Record<string, string> = {};

    // Read existing cache.json
    let existingCache: Record<string, string> = {};
    try {
      existingCache = Bun.JSON5.parse(await Bun.file(cacheFilePath).text()) as Record<
        string,
        string
      >;
    } catch {
      // no cache yet
    }

    try {
      const files = await readdir(cachePath);
      for (const file of files) {
        if (file === "cache.json" || file.startsWith(".")) continue;
        const filePath = join(cachePath, file);
        try {
          const s = await stat(filePath);
          if (inUseInodes.has(s.ino)) {
            // Keep this file — copy matching cache.json entries
            for (const [url, cachedFile] of Object.entries(existingCache)) {
              if (cachedFile === file) keptCache[url] = cachedFile;
            }
          } else {
            freedBytes += s.size;
            await unlink(filePath);
            removed++;
          }
        } catch {
          // file removed mid-scan
        }
      }

      // Write updated cache.json
      await Bun.write(cacheFilePath, Bun.JSON5.stringify(keptCache, null, 2) || "");
    } catch {
      // no cache dir
    }

    return { removed, freedBytes };
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
