import type { RPCSchema } from "electrobun";
import { InstallationController } from "@/bun/controllers/installations";
import { LogController } from "@/bun/controllers/logs";
import { ModController } from "@/bun/controllers/mods";
import { ServerController } from "@/bun/controllers/servers";
import { UtilsController } from "@/bun/controllers/utils";
import { VersionController } from "@/bun/controllers/versions";
import { WorldsController } from "@/bun/controllers/worlds";

// src/shared/types.ts
export type StoryForgeRPCType = {
  // functions that execute in the main process
  bun: {
    requests: ServerController["requests"] &
      InstallationController["requests"] &
      ModController["requests"] &
      VersionController["requests"] &
      UtilsController["requests"] &
      WorldsController["requests"] &
      LogController["requests"] & {
        lastRoute: {
          params: undefined;
          response: string;
        };
        setLastRoute: {
          params: string;
          response: boolean;
        };
      };
    messages: ServerController["messages"] &
      ModController["messages"] &
      VersionController["messages"] &
      LogController["messages"] &
      UtilsController["messages"];
  };
  // functions that execute in the browser context
  webview: RPCSchema<{
    messages: VersionController["messages"] &
      ModController["messages"] &
      InstallationController["messages"] &
      LogController["messages"] &
      UtilsController["messages"];
  }>;
};
