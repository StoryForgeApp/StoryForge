import { Utils } from "electrobun";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { exists, readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import {
  getInstallationsPath as getUtilsInstallationsPath,
  oldInstallationsConfig,
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
    if (existsSync(path)) {
      rmSync(path, { force: true, recursive: true });
      console.log(`[installations.ts] Deleted installation folder: ${path}`);
      return true;
    }
    return false;
  },
  updateInstallation: async ({
    path,
    name,
    version,
  }: {
    path: string;
    name: string;
    version: string;
  }): Promise<boolean> => {
    const configPath = join(path, "installation.json");
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      config.name = name;
      config.version = version;
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`[installations.ts] Updated installation config: ${configPath}`);
      return true;
    }
    writeFileSync(configPath, JSON.stringify({ name, version }, null, 2));
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
    // Simulate fetching installed versions
    const installationsPath = getUtilsInstallationsPath();
    const installations = await readdir(installationsPath);
    // Filter out non-directory entries (in case there are any files in the installations folder)
    const filteredInstallations = installations
      .filter(
        (installation) =>
          existsSync(join(installationsPath, installation)) &&
          statSync(join(installationsPath, installation)).isDirectory(),
      )
      .map(async (installation) => {
        const installationPath = join(installationsPath, installation);
        const configPath = join(installationPath, "installation.json");
        const configExists = await exists(configPath);
        if (!configExists) {
          const oldConfig = oldInstallationsConfig();
          const old = oldConfig?.find(
            (inst) => inst.path.toLowerCase() === installationPath.toLowerCase(),
          );
          if (old) {
            const { name, version, startParams } = old;
            writeFileSync(configPath, JSON.stringify({ name, version, startParams }, null, 2));
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
        const { version, name, startParams } = JSON.parse(config);
        return {
          name,
          version,
          path: installationPath,
          size: await getDirSize(installationPath),
          startParams,
        };
      });
    return Promise.all(filteredInstallations);
  },
  getInstallationsPath: async (): Promise<string> => {
    // In a real application, you might fetch this from the filesystem or an API
    return getUtilsInstallationsPath();
  },
  openInstallationFolder: async ({ path }: { path: string }): Promise<void> => {
    Utils.openPath(path);
  },
};
