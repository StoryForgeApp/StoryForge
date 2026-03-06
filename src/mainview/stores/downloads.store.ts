import { create } from "zustand";

interface Download {
  id: string;
  name: string;
  progress: number; // 0 to 100
  status: "downloading" | "completed" | "failed";
}

export interface DownloadingMod {
  progress: number;
  speed: number; // in bits per second
  modid: number;
}

export interface DownloadingVersion {
  progress: number;
  speed: number; // in bits per second
  version: string;
}

interface DownloadsState {
  downloads: Download[];
  downloadingMods: DownloadingMod[];
  downloadingVersions: DownloadingVersion[];
  addDownload: (download: Download) => void;
  updateDownloadProgress: (id: string, progress: number) => void;
  markDownloadCompleted: (id: string) => void;
  markDownloadFailed: (id: string) => void;
  addDownloadingMod: (mod: DownloadingMod) => void;
  updateDownloadingMod: (modid: number, progress: number, speed: number) => void;
  removeDownloadingMod: (modid: number) => void;
  addDownloadingVersion: (version: DownloadingVersion) => void;
  updateDownloadingVersion: (version: string, progress: number, speed: number) => void;
  removeDownloadingVersion: (version: string) => void;
}

export const useDownloadsStore = create<DownloadsState>((set) => ({
  downloads: [],
  downloadingMods: [],
  downloadingVersions: [],
  addDownload: (download) => set((state) => ({ downloads: [...state.downloads, download] })),
  updateDownloadProgress: (id, progress) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, progress } : d)),
    })),
  markDownloadCompleted: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: "completed", progress: 100 } : d,
      ),
    })),
  markDownloadFailed: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, status: "failed" } : d)),
    })),
  addDownloadingMod: (mod) =>
    set((state) => ({
      downloadingMods: [...state.downloadingMods, mod],
    })),
  updateDownloadingMod: (modid, progress, speed) =>
    set((state) => ({
      downloadingMods: state.downloadingMods.map((m) =>
        m.modid === modid ? { ...m, progress, speed } : m,
      ),
    })),
  removeDownloadingMod: (modid) =>
    set((state) => ({
      downloadingMods: state.downloadingMods.filter((m) => m.modid !== modid),
    })),
  addDownloadingVersion: (version) =>
    set((state) => ({
      downloadingVersions: [...state.downloadingVersions, version],
    })),
  updateDownloadingVersion: (version, progress, speed) =>
    set((state) => ({
      downloadingVersions: state.downloadingVersions.map((v) =>
        v.version === version ? { ...v, progress, speed } : v,
      ),
    })),
  removeDownloadingVersion: (version) =>
    set((state) => ({
      downloadingVersions: state.downloadingVersions.filter((v) => v.version !== version),
    })),
}));
