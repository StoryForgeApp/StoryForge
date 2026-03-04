import * as v from "valibot";

const PublicServerSchema = v.object({
  data: v.optional(
    v.array(
      v.looseObject({
        gameDescription: v.string(),
        gameVersion: v.string(),
        hasPassword: v.boolean(),
        maxPlayers: v.string(),
        mods: v.array(
          v.looseObject({
            id: v.string(),
            version: v.string(),
          }),
        ),
        players: v.number(),
        playstyle: v.looseObject({
          id: v.string(),
          langCode: v.string(),
        }),
        serverIP: v.string(),
        serverName: v.string(),
        whitelisted: v.boolean(),
      }),
    ),
  ),
  status: v.string(),
});

export type PublicServer = v.InferInput<typeof PublicServerSchema>;

export type PublicServerSummary = {
  gameDescription: string;
  gameVersion: string;
  hasPassword: boolean;
  maxPlayers: string;
  modCount: number;
  players: number;
  serverIP: string;
  serverName: string;
  whitelisted: boolean;
};

export const serverController = {
  getPublicServers: async (): Promise<PublicServerSummary[]> => {
    const response = await fetch("https://masterserver.vintagestory.at/api/v1/servers/list");
    if (!response.ok) {
      throw new Error("Failed to fetch versions");
    }
    const data = await response.json();

    const servers = v.safeParse(PublicServerSchema, data);

    if (!servers.success) {
      throw new Error(
        `Invalid servers data - ${Bun.JSON5.stringify(servers.issues.slice(0, 3))}...`,
      );
    }
    if (servers.output.status !== "ok") {
      throw new Error("API returned an error status");
    }

    if (!servers.output.data) {
      return [];
    }

    return servers.output.data?.map((server) => ({
      gameDescription: server.gameDescription,
      gameVersion: server.gameVersion,
      hasPassword: server.hasPassword,
      maxPlayers: server.maxPlayers,
      modCount: server.mods.length, // Only return the count, not the full list
      players: server.players,
      serverIP: server.serverIP,
      serverName: server.serverName,
      whitelisted: server.whitelisted,
    }));
  },
};
