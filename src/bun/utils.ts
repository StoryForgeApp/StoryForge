import { Utils } from "electrobun/bun";
import { mkdirSync } from "fs";
import { join } from "path";

export const configFile = Bun.file(join(Utils.paths.appData, "storyforge", "config.json"));
export const oldSettingsFile = Bun.file(
  join(Utils.paths.appData, "storyforge", "store", "settings.json"),
);

export async function getOldSettings() {
  if (await oldSettingsFile.exists()) {
    const oldConfigText = await oldSettingsFile.text();
    const oldConfig = Bun.JSON5.parse(oldConfigText);
    return oldConfig as {
      installationsParent: string | null;
      versionsParent: string | null;
      installationsSubdir: string | null;
      versionsSubdir: string | null;
      streamMode: boolean;
    };
  }
  return null;
}

export async function getStreamMode(): Promise<boolean> {
  if (!(await configFile.exists())) {
    const oldSettings = await getOldSettings();
    if (oldSettings) {
      await configFile.write(
        Bun.JSON5.stringify(
          {
            streamMode: oldSettings.streamMode,
          },
          null,
          2,
        ) || "",
      );
      console.log(`[utils.ts] Migrated old settings for stream mode`);
      return oldSettings.streamMode;
    }
    await configFile.write(
      Bun.JSON5.stringify(
        {
          streamMode: false,
        },
        null,
        2,
      ) || "",
    );
    return false;
  }
  const configText = await configFile.text();
  const config = Bun.JSON5.parse(configText) as Record<string, any>;
  if (typeof config.streamMode !== "boolean") {
    config.streamMode = false;
    await configFile.write(Bun.JSON5.stringify(config, null, 2) || "");
  }
  return config.streamMode;
}

export async function getModsCachePath(): Promise<string> {
  if (!(await configFile.exists())) {
    mkdirSync(join(Utils.paths.appData, "storyforge"), { recursive: true });
    await configFile.write(
      Bun.JSON5.stringify(
        {
          modsCachePath: join(Utils.paths.appData, "storyforge", "mods_cache"),
          streamMode: false,
        },
        null,
        2,
      ) || "",
    );
  }
  const configText = await configFile.text();
  const config = Bun.JSON5.parse(configText) as Record<string, any>;
  if (!config.modsCachePath) {
    config.modsCachePath = join(Utils.paths.appData, "storyforge", "mods_cache");
    await configFile.write(Bun.JSON5.stringify(config, null, 2) || "");
  }
  return config.modsCachePath;
}

export async function getVersionsPath(): Promise<string> {
  if (!(await configFile.exists())) {
    const oldSettings = await getOldSettings();
    if (oldSettings) {
      const versionsPath = oldSettings.versionsParent
        ? join(oldSettings.versionsParent, oldSettings.versionsSubdir || "versions")
        : join(Utils.paths.appData, "storyforge", "versions");
      await configFile.write(
        Bun.JSON5.stringify(
          {
            versionPath: versionsPath,
            streamMode: oldSettings.streamMode,
          },
          null,
          2,
        ) || "",
      );
      console.log(`[utils.ts] Migrated old settings for versions path`);
      return versionsPath;
    }
    mkdirSync(join(Utils.paths.appData, "storyforge"), { recursive: true });
    await configFile.write(
      Bun.JSON5.stringify(
        {
          versionPath: join(Utils.paths.appData, "storyforge", "versions"),
          streamMode: false,
        },
        null,
        2,
      ) || "",
    );
  }
  const configText = await configFile.text();
  const config = Bun.JSON5.parse(configText) as Record<string, any>;
  if (!config.versionPath) {
    config.versionPath = join(Utils.paths.appData, "storyforge", "versions");
    await configFile.write(Bun.JSON5.stringify(config, null, 2) || "");
  }
  return config.versionPath;
}

export async function getInstallationsPath(): Promise<string> {
  if (!(await configFile.exists())) {
    const oldSettings = await getOldSettings();
    if (oldSettings) {
      const installationsPath = oldSettings.installationsParent
        ? join(oldSettings.installationsParent, oldSettings.installationsSubdir || "installations")
        : join(Utils.paths.appData, "storyforge", "installations");
      await configFile.write(
        Bun.JSON5.stringify(
          {
            installationsPath,
            streamMode: oldSettings.streamMode,
          },
          null,
          2,
        ) || "",
      );
      console.log(`[utils.ts] Migrated old settings for installations path`);
      return installationsPath;
    }
    await configFile.write(
      Bun.JSON5.stringify(
        {
          installationsPath: join(Utils.paths.appData, "storyforge", "installations"),
          streamMode: false,
        },
        null,
        2,
      ) || "",
    );
  }
  const configText = await configFile.text();
  const config = Bun.JSON5.parse(configText) as Record<string, any>;
  if (!config.installationsPath) {
    config.installationsPath = join(Utils.paths.appData, "storyforge", "installations");
    await configFile.write(Bun.JSON5.stringify(config, null, 2) || "");
  }
  return config.installationsPath;
}

export function getPlatform(): "windows" | "mac" | "linux" {
  const platform = process.platform;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "mac";
  return "linux";
}

export async function oldInstallationsConfig() {
  const oldConfigFile = Bun.file(
    join(Utils.paths.appData, "storyforge", "store", "installations.json"),
  );
  if (await oldConfigFile.exists()) {
    const oldConfigText = await oldConfigFile.text();
    const oldConfig = Bun.JSON5.parse(oldConfigText) as Record<string, any>;
    if (oldConfig.installations) {
      return oldConfig.installations as {
        favorite: boolean;
        name: string;
        path: string;
        version: string;
        startParams: string;
        icon: string;
      }[];
    }
  }
  return null;
}

export function slugify(name: string): string {
  // Remove non-alphanumeric characters and replace with hyphens
  let slug = name.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");

  // Convert to lowercase
  slug = slug.toLowerCase();

  // Replace multiple hyphens with a single hyphen
  slug = slug.replace(/-+/g, "-");

  // Ensure it doesn't start or end with a hyphen
  slug = slug.replace(/^-+/, "");
  slug = slug.replace(/-+$/, "");

  // Return empty string if all characters removed
  return slug || "default";
}
