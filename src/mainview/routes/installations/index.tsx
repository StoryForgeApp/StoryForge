import { compareVersions, formatSize, formatSpeed, parseVersion } from "@/lib/utils";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger } from "@/mainview/components/ui/combobox";
import { Group } from "@/mainview/components/ui/group";
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
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronsUpDownIcon,
  DownloadCloudIcon,
  FolderIcon,
  PackageSearchIcon,
  PlayIcon,
  PlusIcon,
  RefreshCcw,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useRef, useState } from "react";
import * as v from "valibot";

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
    <div className="p-2 h-full grid grid-rows-[auto_1fr] gap-2">
      <div className="w-full grid grid-cols-[1fr_auto] items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Button
            variant="outline"
            className="justify-start py-2 w-full"
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
          <RefreshCcw className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-full border border-border rounded-md bg-sidebar">
        <AnimatePresence>
          {downloadingVersions.length === 0 && installations?.length === 0 ? (
            <m.div
              animate={{ opacity: 1 }}
              className="p-4 text-center text-muted-foreground"
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
                      className="p-3 not-last:border-b border-border flex gap-2 items-center justify-between hover:bg-accent"
                      exit="hidden"
                      initial="hidden"
                      key={installation.name}
                      layout
                      layoutId={installation.name}
                      variants={variations}
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <m.p layoutId={`installation-${installation.name}`}>
                              {installation.name}
                            </m.p>
                            <p className="text-xs font-thin text-muted-foreground">
                              ({formatSize(installation.size)})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {downloadingVersions.some((v) => v.version === installation.version) &&
                              (downloadingVersions.find((v) => v.version === installation.version)
                                ?.progress !== 100 ? (
                                <p className="text-xs text-muted-foreground">
                                  {formatSpeed(
                                    downloadingVersions.find(
                                      (v) => v.version === installation.version,
                                    )?.speed ?? 0,
                                  )}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">Extracting</p>
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
                                className="flex-1 h-1.5"
                                value={
                                  downloadingVersions.find(
                                    (v) => v.version === installation.version,
                                  )?.progress ?? 0
                                }
                              />
                              <span className="text-xs text-muted-foreground w-10 text-right">
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
                            <DownloadCloudIcon className="size-3.5" />
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
                          <FolderIcon className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Hold to delete"}
                          render={
                            <Button
                              className="relative after:content-[''] after:absolute after:clip-inset-full active:after:clip-inset-0 after:transition-[clip-path] active:after:duration-[2s] after:duration-200 after:ease-linear after:inset-0 after:-z-1 after:bg-destructive after:rounded-e-md"
                              onMouseDown={() => handleMouseDownDelete(installation.path)}
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
