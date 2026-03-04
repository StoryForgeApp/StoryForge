import { cp, mkdir, symlink } from "fs/promises";
import { join } from "path";
import { getModsCachePath } from "../utils";

const modsCachePath = await getModsCachePath();
const modsCacheFile = Bun.file(join(modsCachePath, "cache.json"));

export const modController = {
  installMod: async ({ path, url }: { path: string; url: string }) => {
    const installationModsPath = join(path, "Mods");
    await mkdir(installationModsPath, { recursive: true });
    // Check in modsCacheFile if we have a cached version of the mod for this URL
    const cacheFileExists = await modsCacheFile.exists();
    let cache: Record<string, string> = cacheFileExists ? await modsCacheFile.json() : {};
    if (cache[url]) {
      // We have a cached version of the mod, we can use it
      const cachedModPath = cache[url];
      // Make a hard link copy of the cached mod to the installation's Mods folder
      await symlink(
        join(modsCachePath, cachedModPath),
        join(installationModsPath, cachedModPath),
        "file",
      );
      // await cp(join(modsCachePath, cachedModPath), join(installationModsPath, join(cachedModPath)), { recursive: true });
      console.log(`Installed mod from cache for URL: ${url}`);
    } else {
      // No cached version, we need to download it
      // For simplicity, let's assume the URL is a direct link to a zip file of the mod
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download mod from URL: ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Write the downloaded file to the mods cache with the name from the URL
      const modFileName = url.split("/").pop() || `mod_${Date.now()}`;
      const modFilePath = join(modsCachePath, modFileName);
      await Bun.write(modFilePath, buffer);
      // Cache the downloaded mod
      cache[url] = modFileName;
      await Bun.write(modsCacheFile, JSON.stringify(cache, null, 2));
      // Copy the extracted mod to the installation's Mods folder
      await cp(join(modsCachePath, modFileName), join(installationModsPath, modFileName), {
        recursive: true,
      });
      console.log(`Installed mod from URL and cached it for future use: ${url}`);
    }
  },
};
