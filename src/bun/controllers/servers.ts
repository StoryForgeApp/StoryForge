import { readdir, readFile, exists, stat, writeFile } from "fs/promises";
import { join } from "path";
import * as v from "valibot";
import { InferRPCSchema } from "@/shared/helper";
import { getInstallationsPath } from "../utils";

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
  port?: string;
  password?: string;
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
      const multiplayerServers = clientSettingsJson?.stringListSettings?.multiplayerservers ?? [];
      for (const server of multiplayerServers) {
        const parts = server.split(",");
        const serverName = parts[0] ?? "";
        const address = parts[1] ?? "";
        const serverPassword = parts[2];
        let serverIp = address;
        let serverPort: string | undefined;
        if (address.includes(":")) {
          const lastColon = address.lastIndexOf(":");
          serverIp = address.slice(0, lastColon);
          serverPort = address.slice(lastColon + 1);
        }
        servers.push({
          version: installationConf?.version,
          name: serverName,
          ip: serverIp,
          port: serverPort,
          password: serverPassword,
          installation: installation,
          installationName: installationConf?.name,
        });
      }
    }

    return servers;
  },
  addServer: async ({
    path,
    name,
    ip,
    port,
    password,
  }: {
    path: string;
    name: string;
    ip: string;
    port?: string;
    password?: string;
  }): Promise<boolean> => {
    const clientSettingsPath = join(path, "clientsettings.json");
    let clientSettingsJson: Record<string, any> = {};
    if (await exists(clientSettingsPath)) {
      const clientSettings = await readFile(clientSettingsPath, "utf-8");
      clientSettingsJson = Bun.JSON5.parse(clientSettings) as Record<string, any>;
    }

    if (!clientSettingsJson.stringListSettings) {
      clientSettingsJson.stringListSettings = {};
    }
    if (!clientSettingsJson.stringListSettings.multiplayerservers) {
      clientSettingsJson.stringListSettings.multiplayerservers = [];
    }

    const address = port ? `${ip}:${port}` : ip;
    const entry = password ? `${name},${address},${password}` : `${name},${address}`;

    if (!clientSettingsJson.stringListSettings.multiplayerservers.includes(entry)) {
      clientSettingsJson.stringListSettings.multiplayerservers.push(entry);
    }

    await writeFile(clientSettingsPath, Bun.JSON5.stringify(clientSettingsJson, null, 2) || "");
    return true;
  },
};

export type ServerController = InferRPCSchema<typeof serverController>;
