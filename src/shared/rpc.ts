import { InstallationController } from "@/bun/controllers/installations";
import { ModController } from "@/bun/controllers/mods";
import { ServerController } from "@/bun/controllers/servers";
import { UtilsController } from "@/bun/controllers/utils";
import { VersionController } from "@/bun/controllers/versions";
import type { RPCSchema } from "electrobun";

// src/shared/types.ts
export type StoryForgeRPCType = {
  // functions that execute in the main process
  bun: {
    requests: ServerController["requests"] &
      InstallationController["requests"] &
      ModController["requests"] &
      VersionController["requests"] &
      UtilsController["requests"] & {
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
      VersionController["messages"];
  };
  // functions that execute in the browser context
  webview: RPCSchema<{
    messages: VersionController["messages"] &
      ModController["messages"] &
      InstallationController["messages"];
  }>;
};
