import Electrobun, { Utils } from "electrobun";
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";
import { getStreamMode } from "../utils";

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
