import { compareVersions, formatSize, formatSpeed, parseVersion } from "@/lib/utils";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger } from "@/mainview/components/ui/combobox";
import { Group } from "@/mainview/components/ui/group";
import { Progress } from "@/mainview/components/ui/progress";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipTrigger,
} from "@/mainview/components/ui/tooltip";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  DownloadCloudIcon,
  FolderIcon,
  PlusIcon,
  RefreshCcw,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useRef, useState } from "react";

export const Route = createFileRoute("/versions/")({
  component: RouteComponent,
});

interface DownloadingVersion {
  progress: number;
  speed: number; // in bits per second
  version: string;
}

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

function RouteComponent() {
  const { electroview } = Route.useRouteContext();
  const [selectedVersion, setSelectedVersion] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout>(null);
  const [downloadingVersions, setDownloadingVersions] = useState<DownloadingVersion[]>([]);

  const { data: installedVersions, refetch } = useInstalledVersions();

  const { mutate: cancelDownload } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.cancelDownload({ version }),
    onSuccess: (_, version) => {
      setDownloadingVersions((prev) => prev.filter((v) => v.version !== version));
    },
  });

  const { mutate: downloadVersion } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.downloadVersion({ version }),
    onError: (_, version) => {
      // Remove from downloading list on error (including cancellation)
      setDownloadingVersions((prev) => prev.filter((v) => v.version !== version));
    },
    onMutate: (version) => {
      // Add to downloading list
      setSelectedVersion(null);
      setDownloadingVersions((prev) => [...prev, { progress: 0, speed: 0, version }]);

      // Listen for progress updates
      electroview.rpc?.addMessageListener("downloadProgress", ({ progress, speed, id }) => {
        if (id === version) {
          setDownloadingVersions((prev) =>
            prev.map((v) => (v.version === version ? { ...v, progress, speed } : v)),
          );
        }
      });
    },
    onSettled: () => {
      electroview.rpc?.removeMessageListener("downloadProgress", () => {});
    },
    onSuccess: (_, version) => {
      // Remove from downloading list on success
      setDownloadingVersions((prev) => prev.filter((v) => v.version !== version));
      // Refresh installed versions
      refetch();
    },
  });

  const { mutate: openVersionFolder } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.openVersionFolder({ version }),
    onError: (error) => {
      console.error("Failed to open version folder:", error);
    },
  });

  const { mutate: deleteVersion } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.deleteVersion({ version }),
    onError: (error) => {
      console.error("Failed to delete version:", error);
    },
    onSuccess: (success, version) => {
      if (success) {
        refetch();
      } else {
        console.error("Version folder not found for deletion:", version);
      }
    },
  });

  // Should hold the delete version button for 2 seconds before actually deleting the version, to prevent accidental deletions. This is done using CSS clip-path and transition.
  const handleMouseDownDelete = (version: string) => {
    // Start the deletion process after 2 seconds
    const timeoutId = setTimeout(() => {
      deleteVersion(version);
    }, 2000);

    // Store the timeout ID in the ref so we can clear it if the user releases the mouse button early
    deleteTimeoutRef.current = timeoutId;
  };

  const handleMouseUpDelete = () =>
    deleteTimeoutRef.current && clearTimeout(deleteTimeoutRef.current);

  return (
    <div className="p-2 h-full grid grid-rows-[auto_1fr] gap-2">
      <div className="w-full grid grid-cols-[1fr_auto] items-center gap-2">
        <VersionCombobox
          onValueChange={(value) =>
            setSelectedVersion(value as { label: string; value: string } | null)
          }
          value={selectedVersion}
          trigger={
            <Group className="w-full grid grid-cols-[1fr_auto] items-center">
              <Button
                className="py-2 justify-start w-full"
                render={<ComboboxTrigger />}
                variant="outline"
              >
                {selectedVersion ? (
                  selectedVersion.value
                ) : (
                  <>
                    <PlusIcon />
                    Add Version
                  </>
                )}
              </Button>
              {selectedVersion && (
                <Button onClick={() => downloadVersion(selectedVersion.value)} variant="default">
                  Download
                  <DownloadCloudIcon />
                </Button>
              )}
            </Group>
          }
        />
        <Button variant="outline" size="icon-sm" onClick={() => refetch()}>
          <RefreshCcw className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-full border border-border rounded-md bg-sidebar">
        <AnimatePresence>
          {downloadingVersions.length === 0 && installedVersions?.length === 0 ? (
            <m.div
              animate={{ opacity: 1 }}
              className="p-4 text-center text-muted-foreground"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              No versions installed.
            </m.div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {/* Downloading versions */}
                {downloadingVersions.map((downloading) => (
                  <m.div
                    animate="visible"
                    className="p-3 not-last:border-b border-border flex items-center justify-between hover:bg-accent"
                    exit="hidden"
                    initial="hidden"
                    key={downloading.version}
                    layout
                    layoutId={downloading.version}
                    variants={variations}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center justify-between">
                        <m.p className="font-medium" layoutId={`version-${downloading.version}`}>
                          {downloading.version}
                        </m.p>
                        {downloading.progress !== 100 ? (
                          <p className="text-xs text-muted-foreground">
                            {formatSpeed(downloading.speed ?? 0)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Extracting</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress className="flex-1 h-1.5" value={downloading.progress} />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {downloading.progress}%
                        </span>
                      </div>
                    </div>
                    <TooltipTrigger
                      handle={tooltipHandle}
                      payload={() => "Cancel download"}
                      render={
                        <Button
                          onClick={() => cancelDownload(downloading.version)}
                          size="icon-sm"
                          title="Cancel download"
                          variant="destructive-outline"
                        />
                      }
                    >
                      <XIcon className="size-3.5" />
                    </TooltipTrigger>
                  </m.div>
                ))}

                {/* Installed versions */}
                {installedVersions
                  ?.sort((a, b) =>
                    compareVersions(parseVersion(b.version), parseVersion(a.version)),
                  )
                  .map((version) => (
                    <m.div
                      animate="visible"
                      className="p-3 not-last:border-b border-border flex items-center justify-between hover:bg-accent"
                      exit="hidden"
                      initial="hidden"
                      key={version.version}
                      layout
                      layoutId={version.version}
                      variants={variations}
                    >
                      <div className="flex items-center gap-2">
                        <m.p layoutId={`version-${version.version}`}>{version.version}</m.p>
                        <p className="text-xs font-thin text-muted-foreground">
                          ({formatSize(version.size)})
                        </p>
                      </div>
                      <Group>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Open version folder"}
                          render={
                            <Button
                              onClick={() => openVersionFolder(version.version)}
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <FolderIcon className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Hold to delete"}
                          render={
                            <Button
                              className="relative after:content-[''] after:absolute after:clip-inset-full active:after:clip-inset-0 after:transition-[clip-path] active:after:duration-[2s] after:duration-200 after:ease-linear after:inset-0 after:-z-1 after:bg-destructive after:rounded-e-md"
                              onMouseDown={() => handleMouseDownDelete(version.version)}
                              onMouseUp={() => handleMouseUpDelete()}
                              size="icon-sm"
                              variant="outline"
                            />
                          }
                        >
                          <Trash2Icon className="size-3.5" />
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
