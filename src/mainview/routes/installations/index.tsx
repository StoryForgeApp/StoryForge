import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckIcon,
  Loader2Icon,
  PackageSearchIcon,
  PencilIcon,
  StickyNoteIcon,
} from "lucide-react";
import { AnimatePresence, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import * as v from "valibot";
import { compareVersions, formatSize, formatSpeed, parseVersion } from "@/lib/utils";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { InstallDotnetDialog } from "@/mainview/components/dotnet/install-dialog";
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
import { useRPC } from "@/mainview/hooks/use-rpc";
import { useDownloadsStore } from "@/mainview/stores/downloads.store";

export const Route = createFileRoute("/installations/")({
  component: RouteComponent,
});

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

const EditInstallationForm = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  version: v.object({
    label: v.string(),
    value: v.string(),
  }),
  startParams: v.string(),
});

interface InstallationRowProps {
  installation: {
    name: string;
    path: string;
    version: string | null;
    size: number;
    startParams: string | null;
  };
  installedVersions: { version: string; size: number }[] | undefined;
  downloadingVersions: { version: string; progress: number; speed: number }[];
  onPlay: (path: string) => void;
  onCancelDownload: (version: string) => void;
  onDownload: (version: string) => void;
  onOpenFolder: (path: string) => void;
  onUpdate: (values: {
    path: string;
    name?: string;
    version?: string;
    startParams?: string;
  }) => void;
  onDeleteMouseDown: (path: string) => void;
  onDeleteMouseUp: () => void;
  onNavigate: (opts: { to: string; search: { path: string } }) => void;
  tooltipHandle: ReturnType<typeof TooltipCreateHandle>;
  isPlaying: boolean;
  playError: string | null;
  playSuccess: boolean;
}

function InstallationRow({
  installation,
  installedVersions,
  downloadingVersions,
  onPlay,
  onCancelDownload,
  onDownload,
  onOpenFolder,
  onUpdate,
  onDeleteMouseDown,
  onDeleteMouseUp,
  onNavigate,
  tooltipHandle,
  isPlaying,
  playError,
  playSuccess,
}: InstallationRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(installation.name);
  const [editVersion, setEditVersion] = useState<{ label: string; value: string } | null>(
    installation.version ? { label: installation.version, value: installation.version } : null,
  );
  const [editStartParams, setEditStartParams] = useState(installation.startParams ?? "");

  const handleStartEdit = () => {
    setEditName(installation.name);
    setEditVersion(
      installation.version ? { label: installation.version, value: installation.version } : null,
    );
    setEditStartParams(installation.startParams ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = v.safeParse(EditInstallationForm, {
      name: editName,
      version: editVersion,
      startParams: editStartParams,
    });
    if (!parsed.success) return;

    const newVersionValue = editVersion?.value;
    const oldVersionValue = installation.version;

    onUpdate({
      path: installation.path,
      name: editName !== installation.name ? editName : undefined,
      version: newVersionValue !== oldVersionValue ? newVersionValue : undefined,
      startParams:
        editStartParams !== (installation.startParams ?? "") ? editStartParams : undefined,
    });

    if (
      newVersionValue &&
      newVersionValue !== oldVersionValue &&
      !installedVersions?.some((v) => v.version === newVersionValue)
    ) {
      onDownload(newVersionValue);
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const downloadInfo = downloadingVersions.find((v) => v.version === installation.version);

  return (
    <m.div
      animate="visible"
      className="border-border hover:bg-accent flex flex-col gap-2 p-3 not-last:border-b"
      exit="hidden"
      initial="hidden"
      key={installation.name}
      layout
      layoutId={installation.name}
      variants={variations}
    >
      <m.div
        layoutId={`installation-${installation.name}`}
        className="flex items-center justify-between gap-2"
      >
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p>{installation.name}</p>
              <p className="text-muted-foreground text-xs font-thin">
                ({formatSize(installation.size)})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {downloadInfo && downloadInfo.progress !== 100 ? (
                <p className="text-muted-foreground text-xs">{formatSpeed(downloadInfo.speed)}</p>
              ) : downloadInfo ? (
                <p className="text-muted-foreground text-xs">Extracting</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                installedVersions?.map((i) => i.version).includes(installation.version ?? "")
                  ? "success"
                  : "warning"
              }
            >
              {installation.version ?? "Unknown"}
            </Badge>
            {downloadInfo && (
              <>
                <Progress className="h-1.5 flex-1" value={downloadInfo.progress} />
                <span className="text-muted-foreground w-10 text-right text-xs">
                  {downloadInfo.progress}%
                </span>
              </>
            )}
          </div>
        </div>
        <Group>
          {installedVersions?.some((v) => v.version === installation.version) ? (
            isPlaying ? (
              <TooltipTrigger
                handle={tooltipHandle}
                payload={() => "Launching..."}
                render={<Button size="icon-sm" variant="outline" disabled />}
              >
                <Loader2Icon className="size-3.5 animate-spin" />
              </TooltipTrigger>
            ) : playError ? (
              <TooltipTrigger
                handle={tooltipHandle}
                payload={() => playError}
                render={<Button size="icon-sm" variant="destructive-outline" />}
              >
                <XIcon className="size-3.5" />
              </TooltipTrigger>
            ) : playSuccess ? (
              <TooltipTrigger
                handle={tooltipHandle}
                payload={() => "Launched successfully"}
                render={<Button size="icon-sm" variant="outline" className="text-green-500" />}
              >
                <CheckIcon className="size-3.5" />
              </TooltipTrigger>
            ) : (
              <TooltipTrigger
                handle={tooltipHandle}
                payload={() => "Play with installation"}
                render={
                  <Button
                    onClick={() => onPlay(installation.path)}
                    size="icon-sm"
                    variant="outline"
                    className="hover:text-green-500"
                  />
                }
              >
                <PlayIcon className="size-3.5" />
              </TooltipTrigger>
            )
          ) : downloadInfo ? (
            <TooltipTrigger
              handle={tooltipHandle}
              payload={() => "Cancel download"}
              render={
                <Button
                  onClick={() => installation.version && onCancelDownload(installation.version)}
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
              disabled={!!downloadInfo}
              render={
                <Button
                  onClick={() => installation.version && onDownload(installation.version)}
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
                  onNavigate({
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
            payload={() => "Read logs"}
            render={
              <Button
                onClick={() =>
                  onNavigate({
                    to: "/installations/logs",
                    search: { path: installation.path },
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
                onClick={() => onOpenFolder(installation.path)}
                size="icon-sm"
                variant="outline"
              />
            }
          >
            <OpenFolderIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Edit installation"}
            render={<Button onClick={handleStartEdit} size="icon-sm" variant="outline" />}
          >
            <PencilIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Hold to delete"}
            render={
              <Button
                className="after:clip-inset-full active:after:clip-inset-0 after:bg-destructive relative after:absolute after:inset-0 after:-z-1 after:rounded-e-md after:transition-[clip-path] after:duration-200 after:ease-linear after:content-[''] active:after:duration-[2s]"
                onMouseDown={() => onDeleteMouseDown(installation.path)}
                onMouseUp={() => onDeleteMouseUp()}
                size="icon-sm"
                variant="outline"
              />
            }
          >
            <DeleteIcon className="size-3.5" />
          </TooltipTrigger>
        </Group>
      </m.div>
      <AnimatePresence>
        {isEditing && (
          <m.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <div className="space-y-3 border-t pt-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <InputGroup>
                  <InputGroupInput value={editName} onChange={(e) => setEditName(e.target.value)} />
                </InputGroup>
              </div>
              <div className="space-y-1">
                <Label>
                  Version{" "}
                  {editVersion &&
                    !installedVersions?.map((v) => v.version).includes(editVersion.value) && (
                      <span className="text-muted-foreground text-xs">(Not installed)</span>
                    )}
                </Label>
                <VersionCombobox
                  value={editVersion}
                  onValueChange={(v) => setEditVersion(v as { label: string; value: string })}
                  disableInstalled={false}
                  trigger={
                    <ComboboxTrigger
                      className="w-full justify-between"
                      render={<Button variant="outline" />}
                    >
                      {editVersion?.label || "Select version"}
                      <ChevronsUpDownIcon className="-me-1!" />
                    </ComboboxTrigger>
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Start Parameters</Label>
                <InputGroup>
                  <InputGroupInput
                    value={editStartParams}
                    onChange={(e) => setEditStartParams(e.target.value)}
                  />
                </InputGroup>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={!editName || !editVersion}>
                  Save
                </Button>
                <Button onClick={handleCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

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
  const { rpc } = useRPC();
  const deleteTimeoutRef = useRef<NodeJS.Timeout>(null);
  const downloadingVersions = useDownloadsStore((state) => state.downloadingVersions);
  const addDownloadingVersion = useDownloadsStore((state) => state.addDownloadingVersion);
  const updateDownloadingVersion = useDownloadsStore((state) => state.updateDownloadingVersion);
  const removeDownloadingVersion = useDownloadsStore((state) => state.removeDownloadingVersion);
  const [isOpen, setIsOpen] = useState(false);

  const { data: installations, refetch } = useInstallations();
  const { data: installedVersions, refetch: refetchInstalledVersions } = useInstalledVersions();

  const { mutate: createInstallation, isPending } = useMutation({
    mutationFn: async (values: {
      name: string;
      version: { label: string; value: string };
      startParams: string;
    }) =>
      rpc?.request.createInstallation({
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
    mutationFn: async (version: string) => rpc?.request.cancelDownload({ version }),
  });

  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [playSuccess, setPlaySuccess] = useState(false);
  const playingPathRef = useRef<string | null>(null);
  const [dotnetDialogOpen, setDotnetDialogOpen] = useState(false);
  const [neededDotnetVersion, setNeededDotnetVersion] = useState<string | null>(null);
  const pendingPlayPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!rpc) return;

    const handlePlayStatus = ({
      path,
      status,
      message,
    }: {
      path: string;
      status: string;
      message?: string;
    }) => {
      if (path !== playingPathRef.current) return;

      if (status === "running") {
        setPlaySuccess(true);
        setTimeout(() => {
          setPlaySuccess(false);
          setPlayingPath(null);
          playingPathRef.current = null;
        }, 2000);
      } else if (status === "error") {
        setPlayError(message || "Process failed to start");
        setPlayingPath(null);
        playingPathRef.current = null;
      } else if (status === "exited") {
        setPlayingPath(null);
        playingPathRef.current = null;
      }
    };

    rpc.addMessageListener("playStatus", handlePlayStatus);
    return () => {
      rpc.removeMessageListener("playStatus", handlePlayStatus);
    };
  }, [rpc]);

  const { mutate: playInstallation, isPending: isPlaying } = useMutation({
    mutationFn: async (path: string) => {
      setPlayingPath(path);
      playingPathRef.current = path;
      setPlayError(null);
      setPlaySuccess(false);
      return rpc?.request.playWithInstallation({ path });
    },
    onSuccess: (result) => {
      if (result && typeof result === "object" && "status" in result) {
        if (result.status === "needsDotnet" && "version" in result) {
          setNeededDotnetVersion(String(result.version));
          setDotnetDialogOpen(true);
          pendingPlayPathRef.current = playingPathRef.current;
          setPlayingPath(null);
          playingPathRef.current = null;
        }
      }
    },
    onError: (error) => {
      console.error("Failed to play with installation:", error);
      setPlayError(error instanceof Error ? error.message : "Unknown error");
      setPlayingPath(null);
      playingPathRef.current = null;
    },
  });

  const { mutate: openInstallationFolder } = useMutation({
    mutationFn: async (path: string) => rpc?.request.openInstallationFolder({ path }),
    onError: (error) => {
      console.error("Failed to open installation folder:", error);
    },
  });

  const { mutate: deleteInstallation } = useMutation({
    mutationFn: async (path: string) => rpc?.request.deleteInstallation({ path }),
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

  const { mutate: updateInstallation } = useMutation({
    mutationFn: async (values: {
      path: string;
      name?: string;
      version?: string;
      startParams?: string;
    }) =>
      rpc?.request.updateInstallation({
        path: values.path,
        name: values.name,
        version: values.version,
        startParams: values.startParams,
      }),
    onError: (error) => {
      console.error("Failed to update installation:", error);
    },
    onSuccess: async () => {
      await refetch();
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

  const handleDotnetInstalled = () => {
    setDotnetDialogOpen(false);
    const path = pendingPlayPathRef.current;
    pendingPlayPathRef.current = null;
    if (path) {
      playInstallation(path);
    }
  };

  const handleDotnetClose = () => {
    setDotnetDialogOpen(false);
    pendingPlayPathRef.current = null;
  };

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
              <form.Field name="startParams">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Start Parameters</Label>
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
                    <InstallationRow
                      installation={installation}
                      installedVersions={installedVersions}
                      downloadingVersions={downloadingVersions}
                      key={installation.name}
                      onPlay={playInstallation}
                      onCancelDownload={cancelDownload}
                      onDownload={downloadVersion}
                      onOpenFolder={openInstallationFolder}
                      onUpdate={updateInstallation}
                      onDeleteMouseDown={handleMouseDownDelete}
                      onDeleteMouseUp={handleMouseUpDelete}
                      onNavigate={navigate}
                      tooltipHandle={tooltipHandle}
                      isPlaying={
                        (isPlaying || playingPath === installation.path) &&
                        !playError &&
                        !playSuccess
                      }
                      playError={playingPath === installation.path ? playError : null}
                      playSuccess={playingPath === installation.path && playSuccess}
                    />
                  ))}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
      {neededDotnetVersion && (
        <InstallDotnetDialog
          open={dotnetDialogOpen}
          dotnetVersion={neededDotnetVersion}
          onClose={handleDotnetClose}
          onInstalled={handleDotnetInstalled}
        />
      )}
      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </div>
  );
}
