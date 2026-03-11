import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PackageSearchIcon } from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useRef, useState } from "react";
import * as v from "valibot";
import { compareVersions, formatSize, formatSpeed, parseVersion } from "@/lib/utils";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger } from "@/mainview/components/ui/combobox";
import { Group } from "@/mainview/components/ui/group";
import { ChevronsUpDownIcon } from "@/mainview/components/ui/icons/chevrons-up-down";
import { CloudDownloadIcon } from "@/mainview/components/ui/icons/cloud-download";
import { DeleteIcon } from "@/mainview/components/ui/icons/delete";
import { OpenFolderIcon } from "@/mainview/components/ui/icons/open-folder";
import { PlayIcon } from "@/mainview/components/ui/icons/play";
import { PlusIcon } from "@/mainview/components/ui/icons/plus";
import { RefreshCWIcon } from "@/mainview/components/ui/icons/refresh-cw";
import { XIcon } from "@/mainview/components/ui/icons/x";
import { InputGroup, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Label } from "@/mainview/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/mainview/components/ui/popover";
import { Progress } from "@/mainview/components/ui/progress";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipTrigger,
} from "@/mainview/components/ui/tooltip";
import { useInstallations } from "@/mainview/hooks/use-installations";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";

export const Route = createFileRoute("/installations/")({
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

const CreateInstallationForm = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  version: v.object({
    label: v.string(),
    value: v.string(),
  }),
  startParams: v.string(),
});

function RouteComponent() {
  const defaultValues: {
    name: string;
    version: { label: string; value: string } | null;
    startParams: string;
  } = {
    name: "",
    version: null,
    startParams: "",
  };
  const form = useForm({
    defaultValues,
    validators: {
      onChange: CreateInstallationForm,
    },
    onSubmit: (form) => {
      if (!form.value.version) return;
      console.log("Form submitted:", form);
      createInstallation({
        name: form.value.name,
        version: form.value.version,
        startParams: form.value.startParams,
      });
    },
  });
  const navigate = useNavigate();
  const { electroview } = Route.useRouteContext();
  const deleteTimeoutRef = useRef<NodeJS.Timeout>(null);
  const [downloadingVersions, setDownloadingVersions] = useState<DownloadingVersion[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const { data: installations, refetch } = useInstallations();
  const { data: installedVersions, refetch: refetchInstalledVersions } = useInstalledVersions();

  const { mutate: createInstallation, isPending } = useMutation({
    mutationFn: async (values: {
      name: string;
      version: { label: string; value: string };
      startParams: string;
    }) =>
      electroview.rpc?.request.createInstallation({
        name: values.name,
        version: values.version.value,
        startParams: values.startParams,
      }),
    onError: (error) => {
      console.error("Failed to create installation:", error);
    },
    onSuccess: async () => {
      form.reset();
      setIsOpen(false);
      await refetch();
    },
  });

  const { mutate: cancelDownload } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.cancelDownload({ version }),
  });

  const { mutate: playInstallation } = useMutation({
    mutationFn: async (path: string) => electroview.rpc?.request.playWithInstallation({ path }),
    onError: (error) => {
      console.error("Failed to play with installation:", error);
    },
  });

  const { mutate: openInstallationFolder } = useMutation({
    mutationFn: async (path: string) => electroview.rpc?.request.openInstallationFolder({ path }),
    onError: (error) => {
      console.error("Failed to open installation folder:", error);
    },
  });

  const { mutate: deleteInstallation } = useMutation({
    mutationFn: async (path: string) => electroview.rpc?.request.deleteInstallation({ path }),
    onError: (error) => {
      console.error("Failed to delete installation:", error);
    },
    onSuccess: async (success, path) => {
      if (success) {
        await refetch();
      } else {
        console.error("Installation folder not found for deletion:", path);
      }
    },
  });

  const { mutate: downloadVersion } = useMutation({
    mutationFn: async (version: string) => electroview.rpc?.request.downloadVersion({ version }),
    onError: (_, version) => {
      // Remove from downloading list on error (including cancellation)
      setDownloadingVersions((prev) => prev.filter((v) => v.version !== version));
    },
    onSuccess: (_, version) => {
      // Add to downloading list
      setDownloadingVersions((prev) => [...prev, { progress: 0, speed: 0, version }]);

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
          setDownloadingVersions((prev) =>
            prev.map((v) => (v.version === version ? { ...v, progress, speed } : v)),
          );
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
          setDownloadingVersions((prev) => prev.filter((v) => v.version !== version));
          electroview.rpc?.removeMessageListener("downloadProgress", handleProgress);
          electroview.rpc?.removeMessageListener("downloadStatus", handleStatus);
        }
      };

      // Listen for progress updates
      electroview.rpc?.addMessageListener("downloadProgress", handleProgress);
      electroview.rpc?.addMessageListener("downloadStatus", handleStatus);
    },
  });

  // Should hold the delete installation button for 2 seconds before actually deleting the installation, to prevent accidental deletions. This is done using CSS clip-path and transition.
  const handleMouseDownDelete = (path: string) => {
    // Start the deletion process after 2 seconds
    const timeoutId = setTimeout(() => {
      deleteInstallation(path);
    }, 2000);

    // Store the timeout ID in the ref so we can clear it if the user releases the mouse button early
    deleteTimeoutRef.current = timeoutId;
  };

  const handleMouseUpDelete = () =>
    deleteTimeoutRef.current && clearTimeout(deleteTimeoutRef.current);

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-2 p-2">
      <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Button
            variant="outline"
            className="w-full justify-start py-2"
            render={<PopoverTrigger />}
          >
            <PlusIcon />
            Add Installation
          </Button>
          <PopoverPopup className="w-(--anchor-width)" align="start">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await form.handleSubmit(e);
              }}
            >
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Name</Label>
                    <InputGroup>
                      <InputGroupInput
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                )}
              </form.Field>
              <form.Field name="version">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>
                      Version{" "}
                      {field.state.value &&
                        !installedVersions
                          ?.map((v) => v.version)
                          .includes(field.state.value.value) && (
                          <span className="text-muted-foreground text-xs">(Not installed)</span>
                        )}
                    </Label>
                    <VersionCombobox
                      value={field.state.value}
                      onValueChange={(v) =>
                        field.handleChange(v as { label: string; value: string })
                      }
                      disableInstalled={false}
                      trigger={
                        <ComboboxTrigger
                          className="w-full justify-between"
                          render={<Button variant="outline" />}
                        >
                          {field.state.value?.label || "Select version"}
                          <ChevronsUpDownIcon className="-me-1!" />
                        </ComboboxTrigger>
                      }
                    />
                  </div>
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.canSubmit && !s.isSubmitting && !s.isDefaultValue}>
                {(canSubmit) => (
                  <Button disabled={!canSubmit || isPending} className="w-full" type="submit">
                    Create Installation
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </PopoverPopup>
        </Popover>
        <Button size="icon-sm" variant="outline" onClick={() => refetch()}>
          <RefreshCWIcon className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="border-border bg-sidebar h-full rounded-md border">
        <AnimatePresence>
          {downloadingVersions.length === 0 && installations?.length === 0 ? (
            <m.div
              animate={{ opacity: 1 }}
              className="text-muted-foreground p-4 text-center"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
            >
              No installations.
            </m.div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {/* Installations */}
                {installations
                  ?.sort((a, b) =>
                    compareVersions(parseVersion(b.version ?? ""), parseVersion(a.version ?? "")),
                  )
                  .map((installation) => (
                    <m.div
                      animate="visible"
                      className="border-border hover:bg-accent flex items-center justify-between gap-2 p-3 not-last:border-b"
                      exit="hidden"
                      initial="hidden"
                      key={installation.name}
                      layout
                      layoutId={installation.name}
                      variants={variations}
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <m.p layoutId={`installation-${installation.name}`}>
                              {installation.name}
                            </m.p>
                            <p className="text-muted-foreground text-xs font-thin">
                              ({formatSize(installation.size)})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {downloadingVersions.some((v) => v.version === installation.version) &&
                              (downloadingVersions.find((v) => v.version === installation.version)
                                ?.progress !== 100 ? (
                                <p className="text-muted-foreground text-xs">
                                  {formatSpeed(
                                    downloadingVersions.find(
                                      (v) => v.version === installation.version,
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
                                .includes(installation.version ?? "")
                                ? "success"
                                : "warning"
                            }
                          >
                            {installation.version ?? "Unknown"}
                          </Badge>
                          {downloadingVersions.some((v) => v.version === installation.version) && (
                            <>
                              <Progress
                                className="h-1.5 flex-1"
                                value={
                                  downloadingVersions.find(
                                    (v) => v.version === installation.version,
                                  )?.progress ?? 0
                                }
                              />
                              <span className="text-muted-foreground w-10 text-right text-xs">
                                {downloadingVersions.find((v) => v.version === installation.version)
                                  ?.progress ?? 0}
                                %
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Group>
                        {installedVersions?.some((v) => v.version === installation.version) ? (
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "Play with installation"}
                            render={
                              <Button
                                onClick={() => playInstallation(installation.path)}
                                size="icon-sm"
                                variant="outline"
                                className="hover:text-green-500"
                              />
                            }
                          >
                            <PlayIcon className="size-3.5" />
                          </TooltipTrigger>
                        ) : downloadingVersions.some((v) => v.version === installation.version) ? (
                          <TooltipTrigger
                            handle={tooltipHandle}
                            payload={() => "Cancel download"}
                            render={
                              <Button
                                onClick={() =>
                                  installation.version && cancelDownload(installation.version)
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
                              (v) => v.version === installation.version,
                            )}
                            render={
                              <Button
                                onClick={() =>
                                  installation.version && downloadVersion(installation.version)
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
                                  search: { path: installation.path },
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
                          payload={() => "Open installation folder"}
                          render={
                            <Button
                              onClick={() => openInstallationFolder(installation.path)}
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
                              onMouseDown={() => handleMouseDownDelete(installation.path)}
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
