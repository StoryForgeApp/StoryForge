import type { RPCSchema } from "electrobun";
import type { PublicServerSummary } from "@/bun/controllers/servers";

export type ServerController = RPCSchema<{
  requests: {
    getPublicServers: {
      params: undefined;
      response: PublicServerSummary[] | undefined;
    };
  };
}>;
