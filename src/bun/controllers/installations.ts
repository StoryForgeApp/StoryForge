import { existsSync } from "fs";
import { exists, mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import { Utils } from "electrobun";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import {
  getPlatform,
  getInstallationsPath as getUtilsInstallationsPath,
  getVersionsPath,
  oldInstallationsConfig,
  slugify,
} from "../utils";

function getDotnetVersion(gameVersion: string): string {
  const parts = gameVersion.split(".").map(Number);
  const minor = parts[1] ?? 0;
  if (minor >= 22) return "10.0";
  if (minor === 21) return "8.0";
  return "7.0";
}

function checkLocalDotnet(home: string, version: string): boolean {
  return existsSync(join(home, "shared", "Microsoft.NETCore.App", version));
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
    // dotnet not in PATH
  }
  return false;
}

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

export const installationController = {
  deleteInstallation: async ({ path }: { path: string }): Promise<boolean> => {
    if (await exists(path)) {
      await rm(path, { force: true, recursive: true });
      console.log(`[installations.ts] Deleted installation folder: ${path}`);
      return true;
    }
    return false;
  },
  updateInstallation: async ({
    path,
    name,
    version,
    startParams,
  }: {
    path: string;
    name?: string;
    version?: string;
    startParams?: string;
  }): Promise<boolean> => {
    const configPath = join(path, "installation.json");
    if (await exists(configPath)) {
      const config = Bun.JSON5.parse(await readFile(configPath, "utf-8")) as Record<
        string,
        unknown
      >;
      if (name !== undefined) config.name = name;
      if (version !== undefined) config.version = version;
      if (startParams !== undefined) config.startParams = startParams;
      await writeFile(configPath, Bun.JSON5.stringify(config, null, 2) || "");
      console.log(`[installations.ts] Updated installation config: ${configPath}`);
      return true;
    }
    await writeFile(configPath, Bun.JSON5.stringify({ name, version, startParams }, null, 2) || "");
    console.log(`[installations.ts] Created installation config: ${configPath}`);
    return true;
  },
  getInstallations: async (): Promise<
    {
      name: string;
      path: string;
      version: string | null;
      size: number;
      startParams: string | null;
    }[]
  > => {
    const installationsPath = await getUtilsInstallationsPath();
    const installations = await readdir(installationsPath);

    // Filter to only directories first, then map to installation objects
    const installationPromises = installations.map(async (installation) => {
      const installationPath = join(installationsPath, installation);
      const installationExists = await exists(installationPath);
      if (!installationExists) return null;

      const stats = await stat(installationPath);
      if (!stats.isDirectory()) return null;

      const configPath = join(installationPath, "installation.json");
      const configExists = await exists(configPath);

      if (!configExists) {
        const oldConfig = await oldInstallationsConfig();
        const old = oldConfig?.find(
          (inst) => inst.path.toLowerCase() === installationPath.toLowerCase(),
        );
        if (old) {
          const { name, version, startParams } = old;
          await writeFile(
            configPath,
            Bun.JSON5.stringify({ name, version, startParams }, null, 2) || "",
          );
          console.log(
            `[installations.ts] Migrated old installation config for: ${installationPath}`,
          );
          return {
            name,
            version,
            path: installationPath,
            startParams,
            size: await getDirSize(installationPath),
          };
        }
        return {
          name: installation,
          path: installationPath,
          version: null,
          size: await getDirSize(installationPath),
          startParams: null,
        };
      }

      const config = await readFile(configPath, "utf-8");
      const { version, name, startParams } = Bun.JSON5.parse(config) as Record<string, unknown>;
      return {
        name: name as string,
        version: version as string,
        path: installationPath,
        size: await getDirSize(installationPath),
        startParams: startParams as string,
      };
    });

    const results = await Promise.all(installationPromises);
    return results.filter((item): item is NonNullable<typeof item> => item !== null);
  },
  getInstallationsPath: async (): Promise<string> => {
    // In a real application, you might fetch this from the filesystem or an API
    return getUtilsInstallationsPath();
  },
  openInstallationFolder: async ({ path }: { path: string }): Promise<void> => {
    Utils.openPath(path);
  },
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
          PATH: hasLocalDotnet ? `${dotnetHome}:${process.env.PATH}` : (process.env.PATH ?? ""),
        },
      },
    );

    // Watch for quick failure: if process exits within 5s with non-zero code, send error
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
  createInstallation: async ({
    name,
    version,
    startParams,
  }: {
    name: string;
    version: string;
    startParams: string;
  }): Promise<boolean> => {
    const installationsPath = await getUtilsInstallationsPath();
    const newInstallationPath = join(installationsPath, slugify(name));
    if (await exists(newInstallationPath)) {
      console.error(`[installations.ts] Installation already exists: ${newInstallationPath}`);
      return false;
    }
    await mkdir(newInstallationPath, { recursive: true });
    await writeFile(
      join(newInstallationPath, "installation.json"),
      Bun.JSON5.stringify({ name, version, startParams }, null, 2) || "",
    );
    console.log(`[installations.ts] Created new installation: ${newInstallationPath}`);
    return true;
  },
};

export type InstallationController = InferRPCSchema<typeof installationController> & {
  messages: {
    playStatus: {
      path: string;
      status: "running" | "exited" | "error";
      message?: string;
    };
  };
};
