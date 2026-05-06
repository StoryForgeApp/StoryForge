import type { RPCSchema } from "electrobun";
import { DotnetController } from "@/bun/controllers/dotnet";
import { InstallationController } from "@/bun/controllers/installations";
import { LogController } from "@/bun/controllers/logs";
import { ModController } from "@/bun/controllers/mods";
import { ServerController } from "@/bun/controllers/servers";
import { UtilsController } from "@/bun/controllers/utils";
import { VersionController } from "@/bun/controllers/versions";
import { WorldsController } from "@/bun/controllers/worlds";

type MessagesType = ServerController["messages"] &
  ModController["messages"] &
  VersionController["messages"] &
  DotnetController["messages"] &
  LogController["messages"] &
  UtilsController["messages"] &
  InstallationController["messages"];

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
      LogController["requests"] &
      DotnetController["requests"] & {
        lastRoute: {
          params: undefined;
          response: string;
        };
        setLastRoute: {
          params: string;
          response: boolean;
        };
      };
    messages: MessagesType;
  };
  // functions that execute in the browser context
  webview: RPCSchema<{
    messages: MessagesType;
  }>;
};
