import { Utils } from "electrobun";
import { createWriteStream } from "fs";
import { cp, exists, mkdir, readdir, rm, stat } from "fs/promises";
import { join } from "path";
import * as v from "valibot";
import { mainWindow } from "..";
import { getPlatform, getVersionsPath as getUtilsVersionsPath } from "../utils";

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

export const versionController = {
  cancelDownload: async ({ version }: { version: string }): Promise<void> => {
    console.log("[versions.ts] Cancelling download for version:", version);
    const download = activeDownloads.get(version);
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
          download.reader.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }

      // Clean up temp file
      if (download.tempFilePath) {
        try {
          await Bun.file(download.tempFilePath).delete();
          console.log("[versions.ts] Cleaned up temp file:", download.tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }

      activeDownloads.delete(version);
      console.log("[versions.ts] Download cancelled and cleaned up for version:", version);
    } else {
      console.log("[versions.ts] No active download found for version:", version);
    }
  },
  deleteVersion: async ({ version }: { version: string }): Promise<boolean> => {
    const versionsPath = getUtilsVersionsPath();
    const versionFolder = join(versionsPath, version);
    if (await exists(versionFolder)) {
      await rm(versionFolder, { force: true, recursive: true });
      console.log(`[versions.ts] Deleted version folder: ${versionFolder}`);
      return true;
    }
    return false;
  },

  downloadVersion: async ({
    version,
  }: {
    version: string;
  }): Promise<{ success: boolean; message: string }> => {
    const abortController = new AbortController();
    const { signal } = abortController;

    console.log("[versions.ts] Starting download for version:", version);

    // Check if already downloading
    if (activeDownloads.has(version)) {
      return { success: false, message: "Download already in progress" };
    }

    const platform = getPlatform();
    const tempDir = Utils.paths.temp;
    const versionsPath = getUtilsVersionsPath();

    console.log("[versions.ts] Platform:", platform);
    console.log("[versions.ts] Temp directory:", tempDir);
    console.log("[versions.ts] Versions path:", versionsPath);

    // Ensure directories exist
    if (!(await exists(tempDir))) {
      console.log("[versions.ts] Creating temp directory");
      await mkdir(tempDir, { recursive: true });
    }
    if (!(await exists(versionsPath))) {
      console.log("[versions.ts] Creating versions directory");
      await mkdir(versionsPath, { recursive: true });
    }

    // Create temp file path
    const tempFilePath = join(tempDir, `storyforge-${version}-${platform}.zip`);
    console.log("[versions.ts] Temp file path:", tempFilePath);
    const fileStream = createWriteStream(tempFilePath);

    // Track this download for cancellation
    activeDownloads.set(version, {
      abortController,
      fileStream,
      tempFilePath,
    });

    // Send initial status event
    mainWindow.webview.rpc?.send("downloadStatus", {
      id: version,
      status: "downloading",
      message: "Download started",
    });

    // Start the download process asynchronously (don't await)
    (async () => {
      try {
        const response = await fetch(`https://vsapi.betterjs.dev/download/${version}/${platform}`, {
          signal,
        });
        console.log("[versions.ts] API response status:", response.status);
        if (!response.ok) {
          throw new Error("Failed to download version");
        }
        const data = await response.json();
        console.log("[versions.ts] Got download URL:", data.url);
        const downloadUrl = data.url;

        const downloadResponse = await fetch(downloadUrl, { signal });
        console.log("[versions.ts] Download response status:", downloadResponse.status);
        if (!downloadResponse.ok) {
          throw new Error("Failed to download version file");
        }
        const totalSize = parseInt(downloadResponse.headers.get("Content-Length") || "0", 10);
        console.log("[versions.ts] Total file size:", totalSize);
        let downloadedSize = 0;
        const SPEED_WINDOW_MS = 1000; // Calculate speed over 1 second window
        const speedWindow: { timestamp: number; bytes: number }[] = [];
        const PROGRESS_THROTTLE_MS = 250; // Only send progress updates every 250ms
        let lastProgressSentTime = 0;

        const reader = downloadResponse.body?.getReader();
        if (!reader) {
          throw new Error("Failed to read download stream");
        }

        // Update tracking with reader
        const download = activeDownloads.get(version);
        if (download) {
          download.reader = reader;
        }

        console.log("[versions.ts] Starting download...");
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          // Check if download was cancelled (cancelDownload removes from activeDownloads)
          if (!activeDownloads.has(version)) {
            console.log("[versions.ts] Download was cancelled during streaming");
            break;
          }

          // Write chunk to file
          fileStream.write(value);

          downloadedSize += value.length;
          const progress = Math.round((downloadedSize / totalSize) * 100);

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
              "[versions.ts] Download progress:",
              progress,
              "%, Speed:",
              speedBps,
              "bps (window:",
              windowBytes,
              "bytes over",
              windowDuration.toFixed(2),
              "s)",
            );
            mainWindow.webview.rpc?.send("downloadProgress", {
              id: version,
              progress,
              speed: speedBps,
            });
            lastProgressSentTime = currentTime;
          }
        }

        // Check if download was cancelled (cancelDownload removes from activeDownloads)
        if (!activeDownloads.has(version) || signal.aborted) {
          fileStream.destroy();
          throw new Error("Download cancelled");
        }

        console.log("[versions.ts] Download complete");
        fileStream.end();

        // Wait for file to finish writing
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", () => {
            console.log("[versions.ts] File stream finished");
            resolve();
          });
          fileStream.on("error", reject);
        });

        mainWindow.webview.rpc?.send("downloadProgress", {
          id: version,
          progress: 100,
          speed: 0,
        });

        // Extract to version folder
        const versionFolder = join(versionsPath, version);
        console.log("[versions.ts] Version folder:", versionFolder);
        if (!(await exists(versionFolder))) {
          console.log("[versions.ts] Creating version folder");
          await mkdir(versionFolder, { recursive: true });
        }

        console.log("[versions.ts] Starting extraction...");
        // Extract using Bun.Archive
        const archiveData = await Bun.file(tempFilePath).arrayBuffer();
        console.log("[versions.ts] Read archive data, size:", archiveData.byteLength);
        const archive = new Bun.Archive(archiveData);
        console.log("[versions.ts] Created archive object");
        await archive.extract(versionFolder);
        console.log("[versions.ts] Extraction complete");

        // Check if there's a .app folder and extract its contents
        const extractedContents = await readdir(versionFolder);
        const appFolder = extractedContents.find((entry) => entry.endsWith(".app"));
        if (appFolder) {
          console.log("[versions.ts] Found .app folder:", appFolder);
          const appPath = join(versionFolder, appFolder);
          const appContents = await readdir(appPath);
          for (const entry of appContents) {
            const srcPath = join(appPath, entry);
            const destPath = join(versionFolder, entry);
            await cp(srcPath, destPath, { recursive: true });
          }
          // Remove the .app folder
          await rm(appPath, { recursive: true, force: true });
          console.log("[versions.ts] Moved .app contents to version folder");
        }

        // Clean up temp file
        console.log("[versions.ts] Cleaning up temp file");
        await Bun.file(tempFilePath).delete();
        console.log("[versions.ts] Download and extraction complete!");

        // Send success status event
        mainWindow.webview.rpc?.send("downloadStatus", {
          id: version,
          status: "completed",
          message: "Download and extraction completed successfully",
        });
      } catch (error) {
        if (signal.aborted) {
          console.log("[versions.ts] Download was cancelled");
          // Send cancelled status event
          mainWindow.webview.rpc?.send("downloadStatus", {
            id: version,
            status: "cancelled",
            message: "Download was cancelled",
          });
        } else {
          console.error("[versions.ts] Error during download/extraction:", error);
          fileStream.destroy();
          // Clean up temp file on error
          try {
            await Bun.file(tempFilePath).delete();
          } catch {
            // Ignore cleanup errors
          }
          // Send error status event
          mainWindow.webview.rpc?.send("downloadStatus", {
            id: version,
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      } finally {
        // Clean up tracking
        activeDownloads.delete(version);
      }
    })();

    // Return immediately to the frontend
    return { success: true, message: "Download started" };
  },
  getAllVersions: async (): Promise<string[]> => {
    const response = await fetch("https://vsapi.betterjs.dev/versions");
    if (!response.ok) {
      throw new Error("Failed to fetch versions");
    }
    const data = await response.json();

    // Validate the response using valibot
    const versionsSchema = v.array(v.string());
    const versions = v.safeParse(versionsSchema, data);
    if (!versions.success) {
      throw new Error("Invalid versions data");
    }
    return versions.output;
  },
  getInstalledVersions: async (): Promise<{ version: string; size: number }[]> => {
    // Simulate fetching installed versions
    const versionsPath = getUtilsVersionsPath();
    const installedVersions = await readdir(versionsPath);

    // Filter out non-directory entries (in case there are any files in the versions folder)
    const directoryChecks = await Promise.all(
      installedVersions.map(async (version) => {
        const versionPath = join(versionsPath, version);
        const isDir = (await exists(versionPath)) && (await stat(versionPath)).isDirectory();
        return { version, isDir };
      }),
    );

    const directoryVersions = directoryChecks
      .filter(({ isDir }) => isDir)
      .map(({ version }) => version);

    // Get sizes for all directories
    const versionsWithSize = await Promise.all(
      directoryVersions.map(async (version) => ({
        version,
        size: await getDirSize(join(versionsPath, version)),
      })),
    );

    return versionsWithSize;
  },
  getVersionsPath: async (): Promise<string> => {
    // In a real application, you might fetch this from the filesystem or an API
    return getUtilsVersionsPath();
  },
  openVersionFolder: async ({ version }: { version: string }): Promise<void> => {
    const versionsPath = getUtilsVersionsPath();
    Utils.openPath(join(versionsPath, version));
  },
};
