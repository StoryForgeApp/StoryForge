import { InferRPCSchema } from "@/shared/helper";
import { Utils } from "electrobun";
import { getStreamMode } from "../utils";

export const utilsController = {
  getStreamMode: async (): Promise<boolean> => {
    return await getStreamMode();
  },
  openLink: ({ url }: { url: string }) => {
    Utils.openExternal(url);
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
  }) => {
    Utils.showNotification({
      title,
      body,
      subtitle,
      silent,
    });
  },
};

export type UtilsController = InferRPCSchema<typeof utilsController>;
