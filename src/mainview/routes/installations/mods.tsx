import { cn } from "@/lib/utils";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger, ComboboxValue } from "@/mainview/components/ui/combobox";
import { Group } from "@/mainview/components/ui/group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Kbd, KbdGroup } from "@/mainview/components/ui/kbd";
import { Popover, PopoverPopup, PopoverTrigger } from "@/mainview/components/ui/popover";
import { Progress } from "@/mainview/components/ui/progress";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipTrigger,
} from "@/mainview/components/ui/tooltip";
import useDebounce from "@/mainview/hooks/use-debounce";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  DownloadCloudIcon,
  DownloadIcon,
  HardDriveDownloadIcon,
  MessageCircle,
  RefreshCcw,
  Users2Icon,
  XIcon,
  ZoomInIcon,
} from "lucide-react";
import { Variants } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useMemo, useRef, useState } from "react";
import * as v from "valibot";

const SearchSchema = v.object({
  path: v.string(),
});

export const Route = createFileRoute("/installations/mods")({
  component: RouteComponent,
  validateSearch: SearchSchema,
});

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const sortingOptions: {
  label: string;
  value: "trending" | "newest" | "oldest" | "downloads" | "follows" | "comments";
}[] = [
  { label: "Trending", value: "trending" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most Downloads", value: "downloads" },
  { label: "Most Follows", value: "follows" },
  { label: "Most Comments", value: "comments" },
];

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

interface DownloadingMod {
  progress: number;
  speed: number; // in bits per second
  modid: number;
}

function RouteComponent() {
  const { electroview } = Route.useRouteContext();
  const navigate = useNavigate();
  const { path } = Route.useSearch();
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<(typeof sortingOptions)[number]["value"]>("trending");
  const [downloadingMods, setDownloadingMods] = useState<DownloadingMod[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [versions, setVersions] = useState<{ label: string; value: string }[]>([]);
  const debouncedVersions = useDebounce(versions, 1000);
  const { data: installedMods, refetch } = useQuery({
    queryKey: ["installedMods", path],
    queryFn: () =>
      electroview.rpc?.request.getInstalledMods({
        path,
      }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  const { data: modsData } = useQuery({
    queryKey: ["mods", debouncedSearch, debouncedVersions],
    queryFn: () =>
      electroview.rpc?.request.fetchMods({
        search: debouncedSearch,
        versions: debouncedVersions.map((v) => v.value),
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { mutate: removeMod } = useMutation({
    mutationFn: async ({ modzip }: { modzip: string }) =>
      electroview.rpc?.request.removeMod({ modzip: modzip, path }),
    onSuccess: async (resp) => {
      if (resp?.success) {
        await refetch();
      } else {
        console.error("Failed to remove mod:", resp?.message);
      }
    },
  });

  const { mutate: cancelDownload } = useMutation({
    mutationFn: async (modid: number) => electroview.rpc?.request.cancelModDownload({ modid }),
    onSuccess: (_, modid) => {
      setDownloadingMods((prev) => prev.filter((v) => v.modid !== modid));
    },
  });

  const { mutate: downloadMod } = useMutation({
    mutationFn: async ({ url, modid }: { url: string; modid: number }) =>
      electroview.rpc?.request.installMod({ url, path, modid }),
    onError: (_, options) => {
      // Remove from downloading list on error (including cancellation)
      setDownloadingMods((prev) => prev.filter((v) => v.modid !== options.modid));
    },
    onSuccess: async (response, options) => {
      if (response?.cacheHit) {
        console.log(
          "Mod installed from cache, skipping download progress tracking for modid:",
          options.modid,
        );
        await refetch();
        return;
      }
      // Add to downloading list
      setDownloadingMods((prev) => [...prev, { progress: 0, speed: 0, modid: options.modid }]);

      // Create listener functions that we can reference for cleanup
      const handleProgress = ({
        progress,
        speed,
        modid,
      }: {
        progress: number;
        speed: number;
        modid: number;
      }) => {
        if (modid === options.modid) {
          setDownloadingMods((prev) =>
            prev.map((v) => (v.modid === options.modid ? { ...v, progress, speed } : v)),
          );
        }
      };

      const handleStatus = async ({
        modid,
        status,
        message,
      }: {
        modid: number;
        status: string;
        message: string;
      }) => {
        if (modid !== options.modid) return;

        if (status === "error") {
          console.error("Download error for mod", options.modid, ":", message);
        }
        if (status === "cancelled") {
          console.log("Download cancelled for mod", options.modid);
        }
        if (status === "completed") {
          console.log("Download completed for mod", options.modid);
          await refetch();
        }

        // Remove listeners when download ends (completed, error, or cancelled)
        if (status === "completed" || status === "error" || status === "cancelled") {
          setDownloadingMods((prev) => prev.filter((v) => v.modid !== options.modid));
          electroview.rpc?.removeMessageListener("downloadModProgress", handleProgress);
          electroview.rpc?.removeMessageListener("downloadModStatus", handleStatus);
        }
      };

      // Listen for progress updates
      electroview.rpc?.addMessageListener("downloadModProgress", handleProgress);
      electroview.rpc?.addMessageListener("downloadModStatus", handleStatus);
    },
  });

  const { mutate: downloadLatest } = useMutation({
    mutationFn: async (modid: number) => {
      const modInfo = await electroview.rpc?.request.fetchModInfo({ modid });
      const latestVersion = modInfo?.mod?.releases?.[0];
      if (!latestVersion) {
        throw new Error("No versions found for mod " + modid);
      }
      downloadMod({ url: latestVersion.mainfile, modid });
    },
    mutationKey: ["downloadLatest"],
  });

  const mods = useMemo(() => {
    if (!modsData) return [];
    let sortedMods = [...modsData];
    switch (sorting) {
      case "trending":
        sortedMods.sort((a, b) => b.trendingpoints - a.trendingpoints);
        break;
      case "newest":
        sortedMods.sort(
          (a, b) => new Date(b.lastreleased).getTime() - new Date(a.lastreleased).getTime(),
        );
        break;
      case "oldest":
        sortedMods.sort(
          (a, b) => new Date(a.lastreleased).getTime() - new Date(b.lastreleased).getTime(),
        );
        break;
      case "downloads":
        sortedMods.sort((a, b) => b.downloads - a.downloads);
        break;
      case "follows":
        sortedMods.sort((a, b) => b.follows - a.follows);
        break;
      case "comments":
        sortedMods.sort((a, b) => b.comments - a.comments);
        break;
    }
    return sortedMods;
  }, [modsData, sorting]);

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMac]);

  const modsVirtualizer = useVirtualizer({
    count: mods?.length || 0,
    estimateSize: () => 75,
    measureElement: measureElement,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  return (
    <div className="p-2 h-full grid grid-rows-[auto_1fr] gap-2">
      <div className="w-full flex flex-col gap-1">
        <div className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/installations" })}>
            <ArrowLeft className="size-3" />
            Back
          </Button>
          <InputGroup>
            <InputGroupInput
              onChange={(e) => setSearch(e.target.value)}
              ref={searchRef}
              value={search}
            />
            <InputGroupAddon>
              <ZoomInIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>
          <Select
            value={sorting}
            onValueChange={(v) => setSorting(v as (typeof sortingOptions)[number]["value"])}
            items={sortingOptions}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {sortingOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
            Filters
          </PopoverTrigger>
          <PopoverPopup className="w-[var(--anchor-width)]" align="start">
            <VersionCombobox
              disableInstalled={false}
              trigger={
                <ComboboxTrigger render={<SelectButton />}>
                  <ComboboxValue placeholder="All versions" />
                </ComboboxTrigger>
              }
              multiple
              onValueChange={(v) => setVersions(v as { label: string; value: string }[])}
              value={versions}
            />
          </PopoverPopup>
        </Popover>
      </div>
      <ScrollArea
        className="h-full border border-border rounded-md bg-sidebar"
        scrollFade
        viewportRef={scrollRef}
      >
        <div style={{ height: `${modsVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {modsVirtualizer.getVirtualItems().map((virtualRow) => {
            const mod = mods?.[virtualRow.index];
            if (!mod) return null;
            const installedMod = installedMods?.find(
              (m) =>
                m.modid.toString().toLowerCase() === mod.modid.toString().toLowerCase() ||
                mod.modidstrs.find((id) => id.toLowerCase() === m.modid.toString().toLowerCase()),
            );
            return (
              <div
                className="left-0 absolute top-0 w-full p-1 not-last:border-b border-border flex items-center justify-between hover:bg-accent"
                key={mod.modid}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <m.div
                  variants={variations}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className={cn(
                    "w-full flex items-center justify-between px-1",
                    installedMod && "bg-green-900/20",
                  )}
                >
                  <a
                    href={`https://mods.vintagestory.at/mods/${mod.modid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 truncate flex-1"
                  >
                    <img
                      src={mod.logo ?? "https://mods.vintagestory.at/web/img/mod-default.png"}
                      alt={`${mod.name} logo`}
                      className="w-10 h-10 rounded-md"
                    />
                    <div className="flex flex-col truncate gap-0">
                      <p className="font-medium truncate">
                        {mod.name}{" "}
                        <span className="text-muted-foreground font-normal">
                          by{" "}
                          <Button
                            variant="link"
                            className="text-yellow-700 dark:text-yellow-200 px-0"
                          >
                            {mod.author}
                          </Button>
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs truncate">{mod.summary}</p>
                      <div className="flex items-center gap-1 truncate text-muted-foreground">
                        <DownloadIcon className="size-3" />
                        <p className="text-xs">{mod.downloads}</p>
                        ·
                        <Users2Icon className="size-3" />
                        <p className="text-xs">{mod.follows}</p>
                        ·
                        <MessageCircle className="size-3" />
                        <p className="text-xs">{mod.comments}</p>
                        {downloadingMods.some((v) => v.modid === mod.modid) && (
                          <Progress
                            value={
                              downloadingMods.find((v) => v.modid === mod.modid)?.progress || 0
                            }
                          />
                        )}
                      </div>
                    </div>
                  </a>
                  <Group>
                    {downloadingMods.some((v) => v.modid === mod.modid) && (
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Cancel download"}
                        render={
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => cancelDownload(mod.modid)}
                          />
                        }
                      >
                        <XIcon className="size-3.5" />
                      </TooltipTrigger>
                    )}
                    {!installedMod && !downloadingMods.some((v) => v.modid === mod.modid) && (
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Download latest version"}
                        render={
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => downloadLatest(mod.modid)}
                          />
                        }
                      >
                        <DownloadCloudIcon className="size-3.5" />
                      </TooltipTrigger>
                    )}
                    <TooltipTrigger
                      handle={tooltipHandle}
                      payload={() =>
                        installedMod ? "Switch version" : "Download specific version"
                      }
                      render={<Button size="icon-sm" variant="outline" />}
                    >
                      {installedMod ? (
                        <RefreshCcw className="size-3.5" />
                      ) : (
                        <HardDriveDownloadIcon className="size-3.5" />
                      )}
                    </TooltipTrigger>
                    {installedMod && (
                      <TooltipTrigger
                        handle={tooltipHandle}
                        payload={() => "Remove mod"}
                        render={
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={() => removeMod({ modzip: installedMod.file })}
                          />
                        }
                      >
                        <XIcon className="size-3.5" />
                      </TooltipTrigger>
                    )}
                  </Group>
                </m.div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </div>
  );
}
