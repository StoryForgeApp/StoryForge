import { InferRPCSchema } from "@/shared/helper";
import * as v from "valibot";
import { getInstallationsPath } from "../utils";
import { join } from "path";
import { readdir, readFile, exists, stat } from "fs/promises";

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

interface Server {
  version?: string;
  installation: string;
  installationName: string;
  name: string;
  ip: string;
}

export const serverController = {
  getPublicServers: async (): Promise<PublicServerSummary[]> => {
    const response = await fetch("https://masterserver.vintagestory.at/api/v1/servers/list");
    if (!response.ok) {
      throw new Error("Failed to fetch versions");
    }
    const data = await response.json();

    const servers = v.safeParse(PublicServerSchema, data);

    if (!servers.success) {
      throw new Error(`Invalid servers data...`);
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
  getServers: async (): Promise<Server[]> => {
    const installationsPath = await getInstallationsPath();
    const installations = await readdir(installationsPath);
    const servers: Server[] = [];
    for (const installation of installations) {
      const installationPath = join(installationsPath, installation);
      const installationExists = await exists(installationPath);
      if (!installationExists) continue;

      const stats = await stat(installationPath);
      if (!stats.isDirectory()) continue;
      const clientSettingsPath = join(installationPath, "clientsettings.json");
      const installationConfig = join(installationPath, "installation.json");
      const installationConfigJson = await readFile(installationConfig, "utf-8");
      const installationConf = Bun.JSON5.parse(installationConfigJson) as Record<string, any>;
      const clientSettings = await readFile(clientSettingsPath, "utf-8");
      const clientSettingsJson = Bun.JSON5.parse(clientSettings) as Record<string, any>;
      const multiplayerServers = clientSettingsJson?.stringListSettings.multiplayerservers;
      for (const server of multiplayerServers) {
        servers.push({
          version: installationConf?.version,
          name: server.split(",")[0],
          ip: server.split(",")[1],
          installation: installation,
          installationName: installationConf?.name,
        });
      }
    }

    return servers;
  },
};

export type ServerController = InferRPCSchema<typeof serverController>;
