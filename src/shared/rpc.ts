import { InstallationController } from "@/bun/controllers/installations";
import { ModController } from "@/bun/controllers/mods";
import { ServerController } from "@/bun/controllers/servers";
import { UtilsController } from "@/bun/controllers/utils";
import { VersionController } from "@/bun/controllers/versions";
import type { RPCSchema } from "electrobun";
import { DeepMergeAll } from "./helper";

// src/shared/types.ts
export type StoryForgeRPCType = {
  // functions that execute in the main process
  bun: DeepMergeAll<[ServerController, VersionController, InstallationController, UtilsController]>;
  // functions that execute in the browser context
  webview: RPCSchema<{
    messages: VersionController["messages"] & ModController["messages"];
  }>;
};
