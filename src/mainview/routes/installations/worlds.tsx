import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PackageSearchIcon, StickyNoteIcon } from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import { formatSize, formatSpeed } from "@/lib/utils";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { CloudDownloadIcon } from "@/mainview/components/ui/icons/cloud-download";
import { DeleteIcon } from "@/mainview/components/ui/icons/delete";
import { OpenFolderIcon } from "@/mainview/components/ui/icons/open-folder";
import { PlayIcon } from "@/mainview/components/ui/icons/play";
import { RefreshCWIcon } from "@/mainview/components/ui/icons/refresh-cw";
import { SproutGrowthIcon } from "@/mainview/components/ui/icons/sprout-growth";
import { XIcon } from "@/mainview/components/ui/icons/x";
import { Progress } from "@/mainview/components/ui/progress";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipTrigger,
} from "@/mainview/components/ui/tooltip";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";
import { useRPC } from "@/mainview/hooks/use-rpc";
import { useWorlds } from "@/mainview/hooks/use-worlds";
import { useDownloadsStore } from "@/mainview/stores/downloads.store";

export const Route = createFileRoute("/installations/worlds")({
  component: RouteComponent,
});

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

function RouteComponent() {
  const navigate = useNavigate();
  const { rpc } = useRPC();
  const deleteTimeoutRef = useRef<NodeJS.Timeout>(null);
  const downloadingVersions = useDownloadsStore((state) => state.downloadingVersions);
  const addDownloadingVersion = useDownloadsStore((state) => state.addDownloadingVersion);
  const updateDownloadingVersion = useDownloadsStore((state) => state.updateDownloadingVersion);
  const removeDownloadingVersion = useDownloadsStore((state) => state.removeDownloadingVersion);

  const { data: worlds, refetch } = useWorlds();
  const { data: installedVersions, refetch: refetchInstalledVersions } = useInstalledVersions();

  const { mutate: cancelDownload } = useMutation({
    mutationFn: async (version: string) => rpc?.request.cancelDownload({ version }),
  });

  const { mutate: playWorld } = useMutation({
    mutationFn: async ({ path, world }: { path: string; world: string }) =>
      rpc?.request.playWithInstallation({ path, world }),
    onError: (error) => {
      console.error("Failed to play with installation:", error);
    },
  });

  const { mutate: openInstallationFolder } = useMutation({
    mutationFn: async (path: string) => rpc?.request.openInstallationFolder({ path }),
    onError: (error) => {
      console.error("Failed to open installation folder:", error);
    },
  });

  const { mutate: deleteWorld } = useMutation({
    mutationFn: async (path: string) => rpc?.request.deleteWorld({ path }),
    onError: (error) => {
      console.error("Failed to delete world:", error);
    },
    onSuccess: async (success, path) => {
      if (success) {
        await refetch();
      } else {
        console.error("World folder not found for deletion:", path);
      }
    },
  });

  const { mutate: downloadVersion } = useMutation({
    mutationFn: async (version: string) => rpc?.request.downloadVersion({ version }),
    onError: (_, version) => {
      // Remove from downloading list on error (including cancellation)
      removeDownloadingVersion(version);
    },
    onSuccess: (_, version) => {
      // Add to downloading list
      addDownloadingVersion({
        version,
        progress: 0,
        speed: 0,
      });

      // Create listener functions that we can reference for cleanup
      const handleProgress = ({
        progress,
        speed,
        id,
      }: {
        progress: number;
        speed: number;
        id: string;
      }) => {
        if (id === version) {
          updateDownloadingVersion(version, progress, speed);
        }
      };

      const handleStatus = async ({
        id,
        status,
        message,
      }: {
        id: string;
        status: string;
        message: string;
      }) => {
        if (id !== version) return;

        if (status === "error") {
          console.error("Download error for version", version, ":", message);
        }
        if (status === "cancelled") {
          console.log("Download cancelled for version", version);
        }
        if (status === "completed") {
          console.log("Download completed for version", version);
          // Refresh installed versions
          await refetchInstalledVersions();
        }

        // Remove listeners when download ends (completed, error, or cancelled)
        if (status === "completed" || status === "error" || status === "cancelled") {
          removeDownloadingVersion(version);
          rpc?.removeMessageListener("downloadProgress", handleProgress);
          rpc?.removeMessageListener("downloadStatus", handleStatus);
        }
      };

      // Listen for progress updates
      rpc?.addMessageListener("downloadProgress", handleProgress);
      rpc?.addMessageListener("downloadStatus", handleStatus);
    },
  });

  // Should hold the delete installation button for 2 seconds before actually deleting the installation, to prevent accidental deletions. This is done using CSS clip-path and transition.
  const handleMouseDownDelete = (path: string) => {
    // Start the deletion process after 2 seconds
    const timeoutId = setTimeout(() => {
      deleteWorld(path);
    }, 2000);

    // Store the timeout ID in the ref so we can clear it if the user releases the mouse button early
    deleteTimeoutRef.current = timeoutId;
  };

  const handleMouseUpDelete = () =>
    deleteTimeoutRef.current && clearTimeout(deleteTimeoutRef.current);

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-2 p-2">
      <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2">
        <Button size="icon-sm" variant="outline" onClick={() => refetch()}>
          <RefreshCWIcon className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="border-border bg-sidebar h-full rounded-md border">
        <AnimatePresence>
          {worlds?.length === 0 ? (
            <m.div
              animate={{ opacity: 1 }}
              className="text-muted-foreground p-4 text-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              No worlds.
            </m.div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {/* Worlds */}
                {worlds
                  ?.sort((a, b) =>
                    (Number(a.data?.lastPlayed) || 0) > (Number(b.data?.lastPlayed) || 0) ? -1 : 1,
                  )
                  .map((world) => (
                    <m.div
                      animate="visible"
                      className="border-border hover:bg-accent flex items-center justify-between gap-2 p-3 not-last:border-b"
                      exit="hidden"
                      initial="hidden"
                      key={world.path}
                      layout
                      variants={variations}
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <m.p layoutId={`world-${world.path}`}>
                              {world.data?.worldName ?? world.name}
                            </m.p>
                            <Tooltip>
                              <TooltipTrigger
                                className="-ml-2"
                                render={<Button size="icon-sm" variant="ghost" />}
                              >
                                <SproutGrowthIcon className="text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipPopup className="text-xs">
                                {world.data?.seed ?? "Unknown"}
                              </TooltipPopup>
                            </Tooltip>
                            <p className="text-muted-foreground text-xs font-thin">
                              ({formatSize(world.size ?? 0)})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {downloadingVersions.some(
                              (v) => v.version === world.installation?.version,
                            ) &&
                              (downloadingVersions.find(
                                (v) => v.version === world.installation?.version,
                              )?.progress !== 100 ? (
                                <p className="text-muted-foreground text-xs">
                                  {formatSpeed(
                                    downloadingVersions.find(
                                      (v) => v.version === world.installation?.version,
                                    )?.speed ?? 0,
                                  )}
                                </p>
                              ) : (
                                <p className="text-muted-foreground text-xs">Extracting</p>
                              ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              installedVersions
                                ?.map((i) => i.version)
                                .includes(world.installation?.version ?? "")
                                ? "success"
                                : "warning"
                            }
                          >
                            {world.installation?.version ?? "Unknown"}
                          </Badge>
                          <p className="text-muted-foreground text-xs font-thin">
                            in <span className="font-semibold">{world.installation?.name}</span>
                          </p>
                          {downloadingVersions.some(
                            (v) => v.version === world.installation?.version,
                          ) && (
                            <>
                              <Progress
                                className="h-1.5 flex-1"
                                value={
                                  downloadingVersions.find(
                                    (v) => v.version === world.installation?.version,
                                  )?.progress ?? 0
                                }
                              />
                              <span className="text-muted-foreground w-10 text-right text-xs">
                                {downloadingVersions.find(
                                  (v) => v.version === world.installation?.version,
                                )?.progress ?? 0}
                                %
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Group>
                        {installedVersions?.some(
                          (v) => v.version === world.installation?.version,
                        ) ? (
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "Play with world"}
                            render={
                              <Button
                                onClick={() =>
                                  playWorld({
                                    path: world.installation?.path,
                                    world: world.name,
                                  })
                                }
                                size="icon-sm"
                                variant="outline"
                                className="hover:text-green-500"
                              />
                            }
                          >
                            <PlayIcon className="size-3.5" />
                          </TooltipTrigger>
                        ) : downloadingVersions.some(
                            (v) => v.version === world.installation?.version,
                          ) ? (
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "Cancel download"}
                            render={
                              <Button
                                onClick={() =>
                                  world.installation?.version &&
                                  cancelDownload(world.installation?.version ?? "")
                                }
                                size="icon-sm"
                                variant="destructive-outline"
                              />
                            }
                          >
                            <XIcon className="size-3.5" />
                          </TooltipTrigger>
                        ) : (
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "Download version"}
                            disabled={downloadingVersions.some(
                              (v) => v.version === world.installation?.version,
                            )}
                            render={
                              <Button
                                onClick={() =>
                                  world.installation?.version &&
                                  downloadVersion(world.installation?.version ?? "")
                                }
                                size="icon-sm"
                                variant="outline"
                                className="hover:text-yellow-500"
                              />
                            }
                          >
                            <CloudDownloadIcon className="size-3.5" />
                          </TooltipTrigger>
                        )}
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Manage mods"}
                          render={
                            <Button
                              onClick={() =>
                                navigate({
                                  to: "/installations/mods",
                                  search: { path: world.installation?.path },
                                })
                              }
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <PackageSearchIcon className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Read logs"}
                          render={
                            <Button
                              onClick={() =>
                                navigate({
                                  to: "/installations/logs",
                                  search: { path: world.installation?.path },
                                })
                              }
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <StickyNoteIcon className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Open installation folder"}
                          render={
                            <Button
                              onClick={() => openInstallationFolder(world.installation?.path)}
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <OpenFolderIcon className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Hold to delete"}
                          render={
                            <Button
                              className="after:clip-inset-full active:after:clip-inset-0 after:bg-destructive relative after:absolute after:inset-0 after:-z-1 after:rounded-e-md after:transition-[clip-path] after:duration-200 after:ease-linear after:content-[''] active:after:duration-[2s]"
                              onMouseDown={() => handleMouseDownDelete(world.path)}
                              onMouseUp={() => handleMouseUpDelete()}
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <DeleteIcon className="size-3.5" />
                        </TooltipTrigger>
                      </Group>
                    </m.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </div>
  );
}
