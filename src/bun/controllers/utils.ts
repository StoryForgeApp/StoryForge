import Electrobun, { Utils } from "electrobun";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import {
  getConfigFile,
  getInstallationsPath,
  getModsCachePath,
  getStreamMode,
  getVersionsPath,
} from "../utils";

export const utilsController = {
  getVersion: async (): Promise<string> => {
    const localInfo = await Electrobun.Updater.getLocallocalInfo();
    return localInfo.version;
  },
  getUpdate: async (): Promise<{
    version: string;
    hash: string;
    updateAvailable: boolean;
    updateReady: boolean;
    error: string;
  }> => {
    const updateInfo = await Electrobun.Updater.checkForUpdate();
    return updateInfo;
  },
  downloadUpdate: async (): Promise<void> => {
    await Electrobun.Updater.downloadUpdate();
    mainWindow.webview.rpc?.send("updateFinished", {
      done: true,
    });
  },
  applyUpdate: async (): Promise<void> => {
    const updateInfo = Electrobun.Updater.updateInfo();
    if (updateInfo.updateReady) {
      await Electrobun.Updater.applyUpdate();
    }
  },
  getStreamMode: async (): Promise<boolean> => {
    return await getStreamMode();
  },
  /** Returns the current app configuration (stream mode, custom paths). */
  getConfig: async (): Promise<{
    streamMode: boolean;
    versionPath: string;
    installationsPath: string;
    modsCachePath: string;
  }> => {
    const streamMode = await getStreamMode();
    const versionPath = await getVersionsPath();
    const installationsPath = await getInstallationsPath();
    const modsCachePath = await getModsCachePath();
    return { streamMode, versionPath, installationsPath, modsCachePath };
  },
  /** Persists updated app configuration fields to the config file. */
  setConfig: async (config: {
    streamMode?: boolean;
    versionPath?: string;
    installationsPath?: string;
    modsCachePath?: string;
  }): Promise<void> => {
    const configFile = getConfigFile();
    const exists = await configFile.exists();
    const configText = exists ? await configFile.text() : "{}";
    const current = Bun.JSON5.parse(configText.trim() || "{}") as Record<string, unknown>;
    if (config.streamMode !== undefined) current.streamMode = config.streamMode;
    if (config.versionPath !== undefined) current.versionPath = config.versionPath;
    if (config.installationsPath !== undefined)
      current.installationsPath = config.installationsPath;
    if (config.modsCachePath !== undefined) current.modsCachePath = config.modsCachePath;
    await configFile.write(JSON.stringify(current, null, 2));
  },
  openLink: ({ url }: { url: string }): void => {
    Utils.openExternal(url);
  },
  minimize: (): void => {
    mainWindow.minimize();
  },
  maximize: (): void => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  },
  quit: (): void => {
    Utils.quit();
  },
  sendNotification: ({
    title,
    body,
    subtitle,
    silent,
  }: {
    title: string;
    body?: string;
    subtitle?: string;
    silent?: boolean;
  }): void => {
    return Utils.showNotification({
      title,
      body,
      subtitle,
      silent,
    });
  },
};

export type UtilsController = InferRPCSchema<typeof utilsController> & {
  messages: {
    updateFinished: {
      done: boolean;
    };
  };
};
