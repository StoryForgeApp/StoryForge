import { InferRPCSchema } from "@/shared/helper";
import { Utils } from "electrobun";
import { getStreamMode } from "../utils";
import { mainWindow } from "..";

export const utilsController = {
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

export type UtilsController = InferRPCSchema<typeof utilsController>;
