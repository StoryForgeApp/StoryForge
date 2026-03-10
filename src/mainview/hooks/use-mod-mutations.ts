import { useMutation, type UseMutateAsyncFunction } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { compareVersions, parseVersion } from "@/lib/utils";

export type RemoveModFunction = UseMutateAsyncFunction<
  { success: boolean; message?: string } | undefined,
  Error,
  { modzip: string }
>;

export type DownloadModFunction = UseMutateAsyncFunction<
  { success: boolean; message: string; cacheHit?: boolean } | undefined,
  Error,
  { url: string; modid: number }
>;

interface UseModMutationsProps {
  path: string;
  refetchInstalledMods: () => Promise<unknown>;
  addDownloadingMod: (mod: { modid: number; progress: number; speed: number }) => void;
  updateDownloadingMod: (modid: number, progress: number, speed: number) => void;
  removeDownloadingMod: (modid: number) => void;
}

interface DownloadProgressEvent {
  progress: number;
  speed: number;
  modid: number;
}

interface DownloadStatusEvent {
  modid: number;
  status: string;
  message: string;
}

export function useModMutations({
  path,
  refetchInstalledMods,
  addDownloadingMod,
  updateDownloadingMod,
  removeDownloadingMod,
}: UseModMutationsProps) {
  const { electroview } = useRouteContext({ from: "__root__" });

  const { mutateAsync: removeMod } = useMutation({
    mutationFn: async ({ modzip }: { modzip: string }) =>
      electroview.rpc?.request.removeMod({ modzip: modzip, path }),
    onSuccess: async (resp) => {
      if (resp?.success) {
        await refetchInstalledMods();
      } else {
        console.error("Failed to remove mod:", resp?.message);
      }
    },
  });

  const { mutate: cancelDownload } = useMutation({
    mutationFn: async (modid: number) => electroview.rpc?.request.cancelModDownload({ modid }),
    onSuccess: (_, modid) => {
      removeDownloadingMod(modid);
    },
  });

  const { mutateAsync: downloadMod } = useMutation({
    mutationFn: async ({ url, modid }: { url: string; modid: number }) =>
      electroview.rpc?.request.installMod({ url, path, modid }),
    onError: (_, options) => {
      removeDownloadingMod(options.modid);
    },
    onSuccess: async (response, options) => {
      if (response?.cacheHit) {
        console.log(
          "Mod installed from cache, skipping download progress tracking for modid:",
          options.modid,
        );
        await refetchInstalledMods();
        return;
      }
      addDownloadingMod({ progress: 0, speed: 0, modid: options.modid });

      const handleProgress = (data: unknown) => {
        const { progress, speed, modid } = data as DownloadProgressEvent;
        if (modid === options.modid) {
          updateDownloadingMod(options.modid, progress, speed);
        }
      };

      const handleStatus = async (data: unknown) => {
        const { modid, status, message } = data as DownloadStatusEvent;
        if (modid !== options.modid) return;

        if (status === "error") {
          console.error("Download error for mod", options.modid, ":", message);
        }
        if (status === "cancelled") {
          console.log("Download cancelled for mod", options.modid);
        }
        if (status === "completed") {
          console.log("Download completed for mod", options.modid);
          await refetchInstalledMods();
        }

        if (status === "completed" || status === "error" || status === "cancelled") {
          removeDownloadingMod(options.modid);
          electroview.rpc?.removeMessageListener("downloadModProgress", handleProgress);
          electroview.rpc?.removeMessageListener("downloadModStatus", handleStatus);
        }
      };

      electroview.rpc?.addMessageListener("downloadModProgress", handleProgress);
      electroview.rpc?.addMessageListener("downloadModStatus", handleStatus);
    },
  });

  const { mutate: downloadLatest } = useMutation({
    mutationFn: async (modid: number) => {
      const modInfo = await electroview.rpc?.request.fetchModInfo({ modid });
      const latestVersion = modInfo?.mod?.releases
        ?.sort(
          (a, b) => compareVersions(parseVersion(a.modversion), parseVersion(b.modversion)) || 0,
        )
        .pop();
      if (!latestVersion) {
        throw new Error("No versions found for mod " + modid);
      }
      await downloadMod({ url: latestVersion.mainfile, modid });
    },
    mutationKey: ["downloadLatest"],
  });

  return {
    removeMod,
    cancelDownload,
    downloadMod,
    downloadLatest,
  };
}
