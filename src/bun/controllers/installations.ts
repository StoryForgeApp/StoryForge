import { InferRPCSchema } from "@/shared/helper";
import { Utils } from "electrobun";
import { exists, mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { join } from "path";
import {
  getPlatform,
  getInstallationsPath as getUtilsInstallationsPath,
  getVersionsPath,
  oldInstallationsConfig,
  slugify,
} from "../utils";

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
  playWithInstallation: async ({ path }: { path: string }) => {
    const configPath = join(path, "installation.json");
    if (!(await exists(configPath))) {
      console.error(`[installations.ts] Installation config not found: ${configPath}`);
      return;
    }
    const config = Bun.JSON5.parse(await readFile(configPath, "utf-8")) as Record<string, unknown>;
    const versionsPath = await getVersionsPath();
    const versionPath = join(versionsPath, config.version as string);
    if (!(await exists(versionPath))) {
      console.error(`[installations.ts] Version not found for installation: ${versionPath}`);
      return;
    }
    const platform = getPlatform();
    const execPath =
      platform === "windows"
        ? join(versionPath, "vintagestory.exe")
        : join(versionPath, "vintagestory");
    if (!(await exists(execPath))) {
      console.error(
        `[installations.ts] Vintage Story executable not found for installation: ${versionPath}`,
      );
      return;
    }
    console.log(
      `[installations.ts] Playing with installation: ${config.name} (version: ${config.version})`,
    );
    // Implement the logic to play with the installation
    Bun.spawn([
      execPath,
      "--dataPath",
      path,
      ...(config.startParams ? (config.startParams as string).split(" ") : []),
    ]);
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

export type InstallationController = InferRPCSchema<typeof installationController>;
