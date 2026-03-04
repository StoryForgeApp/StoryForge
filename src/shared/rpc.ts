import type { RPCSchema } from "electrobun";
import { InstallationController } from "./controllers/installations";
import type { ServerController } from "./controllers/servers";
import type { VersionController } from "./controllers/versions";

// src/shared/types.ts
export type MyWebviewRPCType = {
  // functions that execute in the main process
  bun: {
    requests: VersionController["requests"] &
      ServerController["requests"] &
      InstallationController["requests"];
    messages: {
      logToBun: {
        msg: string;
      };
      downloadProgress: {
        progress: number;
        speed: number;
        id: string;
      };
      downloadStatus: {
        id: string;
        status: "downloading" | "completed" | "cancelled" | "error";
        message: string;
      };
      cancelDownload: {
        id: string;
      };
    };
  };
  // functions that execute in the browser context
  webview: RPCSchema<{
    requests: {
      someWebviewFunction: {
        params: {
          a: number;
          b: number;
        };
        response: number;
      };
    };
    messages: {
      logToWebview: {
        msg: string;
      };
      downloadProgress: {
        progress: number;
        speed: number;
        id: string;
      };
      downloadStatus: {
        id: string;
        status: "downloading" | "completed" | "cancelled" | "error";
        message: string;
      };
    };
  }>;
};
