import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import type { RefObject, ComponentType } from "react";
import { ModVersionFormType } from "@/mainview/components/forms/mod.version.form";
import { PopoverPrimitive } from "@/mainview/components/ui/popover";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { TooltipPrimitive } from "@/mainview/components/ui/tooltip";
import type { RemoveModFunction, DownloadModFunction } from "@/mainview/hooks/use-mod-mutations";
import type { Mod, InstalledMod, ModUpdate, DownloadingMod } from "@/mainview/types/mods";
import { ModCard } from "./mod-card";

interface ModListProps {
  mods: Mod[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  installedMods: InstalledMod[] | undefined;
  modUpdates: Record<string, ModUpdate> | undefined;
  downloadingMods: DownloadingMod[];
  onOpenLink: (url: string) => void;
  onSetAuthor: (author: string) => void;
  onCancelDownload: (modid: number) => void;
  onDownloadMod: DownloadModFunction;
  onDownloadLatest: (modid: number) => void;
  onRemoveMod: RemoveModFunction;
  tooltipHandle: TooltipPrimitive.Handle<ComponentType>;
  popoverHandle: PopoverPrimitive.Handle<ComponentType>;
  ModVersionForm: ModVersionFormType;
}

export function ModList({
  mods,
  virtualItems,
  totalSize,
  scrollRef,
  installedMods,
  modUpdates,
  downloadingMods,
  onOpenLink,
  onSetAuthor,
  onCancelDownload,
  onDownloadMod,
  onDownloadLatest,
  onRemoveMod,
  tooltipHandle,
  popoverHandle,
  ModVersionForm,
}: ModListProps) {
  return (
    <ScrollArea
      className="border-border bg-sidebar h-full rounded-md border"
      scrollFade
      viewportRef={scrollRef}
    >
      <div
        style={{
          height: `${totalSize}px`,
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const mod = mods?.[virtualRow.index];
          if (!mod) return null;
          const installedMod = installedMods?.find(
            (m) =>
              m.modid.toString().toLowerCase() === mod.modid.toString().toLowerCase() ||
              mod.modidstrs.find((id) => id.toLowerCase() === m.modid.toString().toLowerCase()),
          );
          const modUpdate = modUpdates?.[installedMod?.modid || ""];
          const downloadingMod = downloadingMods.find((v) => v.modid === mod.modid);
          const isDownloading = !!downloadingMod;

          return (
            <div
              className="border-border hover:bg-accent absolute top-0 left-0 flex w-full items-center justify-between not-last:border-b"
              key={mod.modid}
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ModCard
                mod={mod}
                installedMod={installedMod}
                modUpdate={modUpdate}
                downloadingMod={downloadingMod}
                isDownloading={isDownloading}
                onOpenLink={onOpenLink}
                onSetAuthor={onSetAuthor}
                onCancelDownload={onCancelDownload}
                onDownloadMod={onDownloadMod}
                onDownloadLatest={onDownloadLatest}
                onRemoveMod={onRemoveMod}
                tooltipHandle={tooltipHandle}
                popoverHandle={popoverHandle}
                ModVersionForm={ModVersionForm}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
