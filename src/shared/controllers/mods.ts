import type { RPCSchema } from "electrobun";

interface Mod {
  modid: number;
  assetid: number;
  downloads: number;
  follows: number;
  trendingpoints: number;
  comments: number;
  name: string;
  summary: string;
  modidstrs: string[];
  author: string;
  urlalias: string | null;
  side: "both" | "client" | "server";
  type: string;
  logo: string | null;
  tags: string[];
  lastreleased: string;
}

interface ModResponse {
  mod: ModInfo;
  statuscode: string;
}

interface ModInfo {
  modid: number;
  assetid: number;
  name: string;
  text?: string;
  author: string;
  urlalias: string | null;
  logofilename: string | null;
  logofile: string | null;
  logofiledb: string | null;
  homepageurl: string;
  sourcecodeurl: string;
  trailervideourl: string;
  issuetrackerurl: string;
  wikiurl: string;
  downloads: number;
  follows: number;
  trendingpoints: number;
  comments: number;
  side: "both" | "client" | "server";
  type: string;
  created: string;
  lastreleased: string;
  lastmodified: string;
  tags: string[];
  releases: Release[];
  screenshots: string[];
}

interface Release {
  releaseid: number;
  mainfile: string;
  filename: string;
  fileid: number;
  downloads: number;
  tags: string[];
  modidstr: string;
  modversion: string;
  created: string;
  changelog: string;
}

export type ModController = RPCSchema<{
  requests: {
    fetchMods: {
      params: { search: string; versions?: string[] };
      response: Mod[] | undefined;
    };
    installMod: {
      params: { path: string; url: string; modid: number };
      response: { success: boolean; message: string; cacheHit?: boolean };
    };
    fetchModInfo: {
      params: { modid: number };
      response: ModResponse | null;
    };
    cancelModDownload: {
      params: { modid: number };
      response: void;
    };
    getInstalledMods: {
      params: { path: string };
      response: { modid: number; name: string; version: string; file: string }[];
    };
    removeMod: {
      params: { modzip: string; path: string };
      response: { success: boolean; message: string };
    };
  };
  messages: {
    downloadModProgress: {
      progress: number;
      speed: number;
      modid: number;
    };
    downloadModStatus: {
      status: string;
      message: string;
      modid: number;
    };
  };
}>;
