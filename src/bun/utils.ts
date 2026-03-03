import { Utils } from "electrobun/bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export function getOldSettings() {
  const oldConfigPath = join(Utils.paths.appData, "storyforge", "store", "settings.json");
  if (existsSync(oldConfigPath)) {
    const oldConfig = JSON.parse(readFileSync(oldConfigPath, "utf-8"));
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

export function getVersionsPath(): string {
  const configPath = join(Utils.paths.appData, "storyforge", "config.json");
  if (!existsSync(configPath)) {
    const oldSettings = getOldSettings();
    if (oldSettings) {
      const versionsPath = oldSettings.versionsParent
        ? join(oldSettings.versionsParent, oldSettings.versionsSubdir || "versions")
        : join(Utils.paths.appData, "storyforge", "versions");
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            versionPath: versionsPath,
            streamMode: oldSettings.streamMode,
          },
          null,
          2,
        ),
      );
      console.log(`[utils.ts] Migrated old settings for versions path`);
      return versionsPath;
    }
    mkdirSync(join(Utils.paths.appData, "storyforge"), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify(
        {
          versionPath: join(Utils.paths.appData, "storyforge", "versions"),
          streamMode: false,
        },
        null,
        2,
      ),
    );
  }
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  if (!config.versionPath) {
    config.versionPath = join(Utils.paths.appData, "storyforge", "versions");
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  return config.versionPath;
}

export function getInstallationsPath(): string {
  const configPath = join(Utils.paths.appData, "storyforge", "config.json");
  if (!existsSync(configPath)) {
    const oldSettings = getOldSettings();
    if (oldSettings) {
      const installationsPath = oldSettings.installationsParent
        ? join(oldSettings.installationsParent, oldSettings.installationsSubdir || "installations")
        : join(Utils.paths.appData, "storyforge", "installations");
      writeFileSync(
        configPath,
        JSON.stringify(
          {
            installationsPath,
            streamMode: oldSettings.streamMode,
          },
          null,
          2,
        ),
      );
      console.log(`[utils.ts] Migrated old settings for installations path`);
      return installationsPath;
    }
    mkdirSync(join(Utils.paths.appData, "storyforge"), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify(
        {
          installationsPath: join(Utils.paths.appData, "storyforge", "installations"),
          streamMode: false,
        },
        null,
        2,
      ),
    );
  }
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  if (!config.installationsPath) {
    config.installationsPath = join(Utils.paths.appData, "storyforge", "installations");
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  return config.installationsPath;
}

export function getPlatform(): "windows" | "mac" | "linux" {
  const platform = process.platform;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "mac";
  return "linux";
}

export function oldInstallationsConfig() {
  const oldConfigPath = join(Utils.paths.appData, "storyforge", "store", "installations.json");
  if (existsSync(oldConfigPath)) {
    const oldConfig = JSON.parse(readFileSync(oldConfigPath, "utf-8"));
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
