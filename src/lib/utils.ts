import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  prereleaseNum: number | null;
}

export function parseVersion(version: string): ParsedVersion {
  const cleanVersion = version.startsWith("v") ? version.slice(1) : version;
  const [mainVersion, prerelease] = cleanVersion.split("-");
  const [major, minor, patch] = mainVersion.split(".").map(Number);

  let prereleaseNum: number | null = null;
  if (prerelease) {
    const match = prerelease.match(/(\d+)$/);
    if (match) {
      prereleaseNum = Number(match[1]);
    }
  }

  return {
    major: major || 0,
    minor: minor || 0,
    patch: patch || 0,
    prerelease: prerelease || null,
    prereleaseNum,
  };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  if (a.patch !== b.patch) {
    return a.patch - b.patch;
  }

  const aIsRelease = a.prerelease === null;
  const bIsRelease = b.prerelease === null;

  if (aIsRelease && !bIsRelease) {
    return 1;
  }
  if (!aIsRelease && bIsRelease) {
    return -1;
  }
  if (aIsRelease && bIsRelease) {
    return 0;
  }

  if (a.prereleaseNum !== null && b.prereleaseNum !== null) {
    return a.prereleaseNum - b.prereleaseNum;
  }

  return (a.prerelease || "").localeCompare(b.prerelease || "");
}

export function sortVersions(
  versions: string[] | undefined,
  direction: "asc" | "desc" = "asc",
): string[] {
  if (!versions) return [];
  const sorted = [...versions].sort((a, b) => {
    const parsedA = parseVersion(a);
    const parsedB = parseVersion(b);
    return compareVersions(parsedA, parsedB);
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}

export function formatSpeed(bps: number): string {
  if (bps === 0) return "";
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1000000) return `${(bps / 1000).toFixed(1)} Kbps`;
  if (bps < 1000000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
  return `${(bps / 1000000000).toFixed(1)} Gbps`;
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} KB`;
  if (bytes < 1000000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  return `${(bytes / 1000000000).toFixed(1)} GB`;
}

export const getPlatform = (): "windows" | "mac" | "linux" | "unknown" | "server" => {
  if (typeof window === "undefined") return "server";
  if (window.navigator.userAgent.includes("Win")) return "windows";
  if (window.navigator.userAgent.includes("Mac")) return "mac";
  if (window.navigator.userAgent.includes("Linux")) return "linux";
  return "unknown";
};
