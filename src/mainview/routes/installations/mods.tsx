import { ModVersionForm } from "@/mainview/components/forms/mod.version.form";
import { ModFilterPanel, ModList, ModSearchBar, ModSortSelect } from "@/mainview/components/mods";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/mainview/components/ui/alert-dialog";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { Popover, PopoverCreateHandle, PopoverPopup } from "@/mainview/components/ui/popover";
import { Tooltip, TooltipCreateHandle, TooltipPopup } from "@/mainview/components/ui/tooltip";
import { useMods } from "@/mainview/hooks/use-mods";
import { useModMutations } from "@/mainview/hooks/use-mod-mutations";
import { useDownloadsStore } from "@/mainview/stores/downloads.store";

import { useHotkey } from "@tanstack/react-hotkeys";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import * as v from "valibot";
import { compareVersions, parseVersion } from "@/lib/utils";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { ArrowLeftIcon } from "@/mainview/components/ui/icons/arrow-left";
import { CloudDownloadIcon } from "@/mainview/components/ui/icons/cloud-download";
import { RefreshCWIcon } from "@/mainview/components/ui/icons/refresh-cw";

const SearchSchema = v.object({
  path: v.string(),
});

export const Route = createFileRoute("/installations/mods")({
  component: RouteComponent,
  validateSearch: SearchSchema,
});

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();
const popoverHandle = PopoverCreateHandle<React.ComponentType>();

interface UpdateProgress {
  current: number;
  total: number;
  errors: string[];
}

function RouteComponent() {
  const navigate = useNavigate();
  const { path } = Route.useSearch();
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Store
  const downloadingMods = useDownloadsStore((state) => state.downloadingMods);
  const addDownloadingMod = useDownloadsStore((state) => state.addDownloadingMod);
  const updateDownloadingMod = useDownloadsStore((state) => state.updateDownloadingMod);
  const removeDownloadingMod = useDownloadsStore((state) => state.removeDownloadingMod);

  // Bulk update state
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Combined data fetching and filtering
  const {
    installedMods,
    refetchInstalledMods,
    mods,
    modUpdates,
    modsData,
    openLink,
    filterState,
    filterDispatch,
  } = useMods(path);

  const { sorting, showOnlyInstalled, search, author, versions } = filterState;

  // Mutations
  const { removeMod, cancelDownload, downloadMod, downloadLatest } = useModMutations({
    path,
    refetchInstalledMods,
    addDownloadingMod,
    updateDownloadingMod,
    removeDownloadingMod,
  });

  // Calculate mods with available updates
  const modsWithUpdates = useMemo(() => {
    if (!installedMods || !modUpdates || !modsData) return [];

    return installedMods
      .map((installedMod) => {
        const update = modUpdates[installedMod.modid];
        if (!update || update.modversion === installedMod.version) return null;
        if (
          compareVersions(parseVersion(update.modversion), parseVersion(installedMod.version)) <= 0
        )
          return null; // Skip if update is older than installed version (shouldn't happen)

        const modInfo = modsData.find(
          (m) =>
            m.modid.toString() === installedMod.modid ||
            m.modidstrs.some((id) => id.toLowerCase() === installedMod.modid.toLowerCase()),
        );
        if (!modInfo) return null;

        return {
          modid: modInfo.modid,
          modidstr: installedMod.modid,
          name: modInfo.name,
          currentVersion: installedMod.version,
          newVersion: update.modversion,
          update,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [installedMods, modUpdates, modsData]);

  const updateCount = modsWithUpdates.length;

  // Helper to wait for a download to complete
  const waitForDownload = useCallback(
    (modid: number): Promise<void> => {
      return new Promise((resolve) => {
        // Check immediately
        if (!downloadingMods[modid]) {
          resolve();
          return;
        }

        // Poll every 100ms until download is complete
        const checkInterval = setInterval(() => {
          if (!downloadingMods[modid]) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Safety timeout after 5 minutes
        setTimeout(
          () => {
            clearInterval(checkInterval);
            resolve();
          },
          5 * 60 * 1000,
        );
      });
    },
    [downloadingMods],
  );

  // Handle update all
  const handleUpdateAll = useCallback(async () => {
    if (modsWithUpdates.length === 0) return;

    setDialogOpen(false);
    setIsUpdatingAll(true);
    setUpdateProgress({
      current: 0,
      total: modsWithUpdates.length,
      errors: [],
    });

    const errors: string[] = [];

    for (let i = 0; i < modsWithUpdates.length; i++) {
      const modUpdate = modsWithUpdates[i];

      const installedMod = installedMods?.find(
        (m) =>
          m.modid.toString().toLowerCase() === modUpdate.modid.toString().toLowerCase() ||
          modUpdate.modidstr.toLowerCase() === m.modid.toString().toLowerCase(),
      );

      if (!installedMod) {
        errors.push(`${modUpdate.name}: Mod not found`);
        continue;
      }

      setUpdateProgress({ current: i, total: modsWithUpdates.length, errors });

      try {
        // Remove current mod
        await removeMod({ modzip: installedMod.file });

        // Start the download
        await downloadMod({
          url: modUpdate.update.mainfile,
          modid: modUpdate.modid,
        });

        // Wait for the download to actually complete
        await waitForDownload(modUpdate.modid);
      } catch (error) {
        errors.push(
          `${modUpdate.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Update progress after this mod is done
      setUpdateProgress({
        current: i + 1,
        total: modsWithUpdates.length,
        errors: [...errors],
      });
    }

    setIsUpdatingAll(false);
    setUpdateProgress({
      current: modsWithUpdates.length,
      total: modsWithUpdates.length,
      errors,
    });
  }, [modsWithUpdates, downloadMod, waitForDownload, removeMod, installedMods]);

  // Hotkey
  useHotkey("Mod+K", () => searchRef.current?.focus());

  // Virtualizer
  const modsVirtualizer = useVirtualizer({
    count: mods?.length || 0,
    estimateSize: () => 75,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  return (
    <div className="p-2 h-full grid grid-rows-[auto_1fr] gap-2">
      <div className="w-full flex flex-col gap-1">
        <div className="w-full grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/installations" })}>
            <ArrowLeftIcon className="size-3" />
            Back
          </Button>
          <ModSearchBar
            search={search}
            onSearchChange={(value) => filterDispatch({ type: "SET_SEARCH", payload: value })}
            searchRef={searchRef}
          />
          <ModSortSelect
            sorting={sorting}
            onSortingChange={(value) => filterDispatch({ type: "SET_SORTING", payload: value })}
          />
          {updateCount > 0 && !isUpdatingAll && (
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger
                render={
                  <Button variant="default" className="gap-2">
                    <CloudDownloadIcon className="size-4" />
                    Update All
                    <Badge variant="secondary" className="ml-1">
                      {updateCount}
                    </Badge>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Update All Mods</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to update {updateCount} mod
                    {updateCount !== 1 ? "s" : ""} to their latest versions:
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <ScrollArea className="mt-2 max-h-48" scrollFade>
                  <ul className="space-y-1 text-sm">
                    {modsWithUpdates.map((mod) => (
                      <li key={mod.modid} className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{mod.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {mod.currentVersion} → {mod.newVersion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateAll}>Update All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isUpdatingAll && updateProgress && (
            <Group className="items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <RefreshCWIcon className="size-4 animate-spin" />
              <span className="text-sm font-medium">
                {updateProgress.current}/{updateProgress.total}
              </span>
            </Group>
          )}
        </div>
        <ModFilterPanel
          author={author}
          onAuthorChange={(value) => filterDispatch({ type: "SET_AUTHOR", payload: value })}
          versions={versions}
          onVersionsChange={(value) => filterDispatch({ type: "SET_VERSIONS", payload: value })}
          showOnlyInstalled={showOnlyInstalled}
          onShowOnlyInstalledChange={(value) =>
            filterDispatch({ type: "SET_SHOW_ONLY_INSTALLED", payload: value })
          }
          installedModsCount={installedMods?.length || 0}
        />
      </div>

      {/* Global Progress Indicator */}
      {isUpdatingAll && updateProgress && (
        <div className="bg-muted/50 border rounded-md p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Updating mods...</span>
            <span className="text-sm text-muted-foreground">
              {updateProgress.current} of {updateProgress.total}
            </span>
          </div>
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(updateProgress.current / updateProgress.total) * 100}%`,
              }}
            />
          </div>
          {updateProgress.errors.length > 0 && (
            <div className="mt-2 space-y-1 max-w-full truncate">
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-4" />
                <span>{updateProgress.errors.length} error(s) occurred:</span>
              </div>
              <ul className="text-xs text-destructive/80 max-h-20 overflow-y-auto space-y-0.5 truncate">
                {updateProgress.errors.map((error, index) => (
                  <li key={index} className="truncate">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ModList
        mods={mods}
        virtualizer={modsVirtualizer}
        virtualItems={modsVirtualizer.getVirtualItems()}
        totalSize={modsVirtualizer.getTotalSize()}
        scrollRef={scrollRef}
        installedMods={installedMods}
        modUpdates={modUpdates}
        downloadingMods={downloadingMods}
        onOpenLink={openLink}
        onSetAuthor={(authorValue) => filterDispatch({ type: "SET_AUTHOR", payload: authorValue })}
        onCancelDownload={cancelDownload}
        onDownloadMod={downloadMod}
        onDownloadLatest={downloadLatest}
        onRemoveMod={removeMod}
        tooltipHandle={tooltipHandle}
        popoverHandle={popoverHandle}
        ModVersionForm={ModVersionForm}
      />

      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
      <Popover handle={popoverHandle}>
        {({ payload: Payload }) => (
          <PopoverPopup align="center" side="left">
            {Payload !== undefined && <Payload />}
          </PopoverPopup>
        )}
      </Popover>
    </div>
  );
}
