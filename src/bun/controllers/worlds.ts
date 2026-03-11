import { Database } from "bun:sqlite";
import { readdir, stat, access, readFile } from "fs/promises";
import { join, basename } from "path";
import * as v from "valibot";
import { InferRPCSchema } from "@/shared/helper";
import { GameData, GameDataSchema, GameDataType } from "../schemas";
import { getInstallationsPath } from "../utils";

interface SQLiteError extends Error {
  code?: string;
  errno?: number;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isSQLiteFile(path: string): Promise<boolean> {
  try {
    const header = await readFile(path, { encoding: null });
    const magic = header.slice(0, 16).toString("hex");
    // SQLite magic header: "SQLite format 3\0" (without the null byte in hex check)
    return magic.startsWith("53514c6974652066"); // "SQLite f"
  } catch {
    return false;
  }
}

export interface WorldInfo {
  path: string;
  name: string;
  isLocked: boolean;
  installation: {
    path: string;
    name: string;
  };
  error?: string;
  data?: Omit<GameDataType, "worldConfigBytes" | "modData">;
}

export const worldsController = {
  getWorlds: async (): Promise<WorldInfo[]> => {
    const installationPath = await getInstallationsPath();
    const installations = await readdir(installationPath);
    const worlds: WorldInfo[] = [];

    for (const installation of installations) {
      const installationStats = await stat(join(installationPath, installation));
      if (!installationStats.isDirectory()) continue;

      const installationConfig = await readFile(
        join(installationPath, installation, "installation.json"),
        "utf-8",
      );
      if (!installationConfig) continue;

      const installationConfigJson = Bun.JSON5.parse(installationConfig) as Record<string, unknown>;

      if (!installationConfigJson.name) continue;

      const worldsPath = join(installationPath, installation, "Saves");
      let worldFiles: string[];
      try {
        worldFiles = await readdir(worldsPath);
      } catch {
        continue;
      }

      for (const world of worldFiles) {
        // Check if world extension is .vcdbs
        if (!world.endsWith(".vcdbs")) continue;

        const dbPath = join(worldsPath, world);
        const worldName = basename(world, ".vcdbs");

        // Check if file exists
        const exists = await fileExists(dbPath);
        if (!exists) {
          worlds.push({
            path: dbPath,
            installation: {
              name: installationConfigJson.name as string,
              path: join(installationPath, installation),
            },
            name: worldName,
            isLocked: true,
            error: "File not found",
          });
          continue;
        }

        // Check if it's actually an SQLite file
        const isValidSQLite = await isSQLiteFile(dbPath);
        if (!isValidSQLite) {
          worlds.push({
            path: dbPath,
            installation: {
              name: installationConfigJson.name as string,
              path: join(installationPath, installation),
            },
            name: worldName,
            isLocked: true,
            error: "Not a valid SQLite database",
          });
          continue;
        }

        // Check for WAL files (indicates game is running)
        const walPath = dbPath + "-wal";
        const shmPath = dbPath + "-shm";
        const hasWal = await fileExists(walPath);
        const hasShm = await fileExists(shmPath);

        // Try to open and read the database
        let db: Database;
        try {
          db = new Database(dbPath);
        } catch (openErr) {
          const err = openErr as SQLiteError;
          worlds.push({
            path: dbPath,
            installation: {
              name: installationConfigJson.name as string,
              path: join(installationPath, installation),
            },
            name: worldName,
            isLocked: true,
            error: `Cannot open database: ${err.message}`,
          });
          continue;
        }

        try {
          const gamedata = db.query("SELECT data FROM gamedata LIMIT 1").get();
          if (!gamedata) {
            db.close();
            worlds.push({
              path: dbPath,
              installation: {
                name: installationConfigJson.name as string,
                path: join(installationPath, installation),
              },
              name: worldName,
              isLocked: true,
              error: "No gamedata found",
            });
            continue;
          }

          const gamedataParsed = GameData.fromBinary((gamedata as { data: Uint8Array }).data);
          db.close();

          const jsonData = GameData.toJson(gamedataParsed);
          const {
            worldConfigBytes: _worldConfigBytes,
            modData: _modData,
            ...parsed
          } = v.parse(GameDataSchema, jsonData);

          worlds.push({
            path: dbPath,
            installation: {
              name: installationConfigJson.name as string,
              path: join(installationPath, installation),
            },
            name: parsed.worldName,
            isLocked: hasWal || hasShm,
            data: parsed,
          });
        } catch (queryErr) {
          db.close();
          const err = queryErr as SQLiteError;
          worlds.push({
            path: dbPath,
            installation: {
              name: installationConfigJson.name as string,
              path: join(installationPath, installation),
            },
            name: worldName,
            isLocked: true,
            error: `Query failed: ${err.message}`,
          });
        }
      }
    }
    return worlds;
  },
};

export type WorldsController = InferRPCSchema<typeof worldsController>;
