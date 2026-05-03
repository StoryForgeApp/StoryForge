import { Variants } from "motion/react";
import * as m from "motion/react-m";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ModVersionFormType } from "@/mainview/components/forms/mod.version.form";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { CloudDownloadIcon } from "@/mainview/components/ui/icons/cloud-download";
import { DownloadIcon } from "@/mainview/components/ui/icons/download";
import { HardDriveDownloadIcon } from "@/mainview/components/ui/icons/hard-drive-download";
import { MessageCircleIcon } from "@/mainview/components/ui/icons/message-circle";
import { RefreshCWIcon } from "@/mainview/components/ui/icons/refresh-cw";
import { UsersIcon } from "@/mainview/components/ui/icons/users";
import { XIcon } from "@/mainview/components/ui/icons/x";
import { PopoverPrimitive, PopoverTrigger } from "@/mainview/components/ui/popover";
import { Progress } from "@/mainview/components/ui/progress";
import { TooltipPrimitive, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import type { RemoveModFunction, DownloadModFunction } from "@/mainview/hooks/use-mod-mutations";
import type { Mod, InstalledMod, ModUpdate, DownloadingMod } from "@/mainview/types/mods";

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

interface ModCardProps {
  mod: Mod;
  installedMod?: InstalledMod;
  modUpdate?: ModUpdate;
  downloadingMod?: DownloadingMod;
  isDownloading: boolean;
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

export function ModCard({
  mod,
  installedMod,
  modUpdate,
  downloadingMod,
  isDownloading,
  onOpenLink,
  onSetAuthor,
  onCancelDownload,
  onDownloadMod,
  onDownloadLatest,
  onRemoveMod,
  tooltipHandle,
  popoverHandle,
  ModVersionForm,
}: ModCardProps) {
  const modUrl = mod.urlalias
    ? `https://mods.vintagestory.at/${mod.urlalias}`
    : `https://mods.vintagestory.at/show/mod/${mod.modid}`;

  return (
    <m.div
      variants={variations}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className={cn(
        "w-full flex items-center justify-between px-2 py-1",
        installedMod && "bg-green-300/20 dark:bg-green-900/20",
      )}
    >
      <a
        href={modUrl}
        onClick={() => onOpenLink(modUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center gap-2 truncate"
      >
        <img
          src={mod.logo ?? "https://mods.vintagestory.at/web/img/mod-default.png"}
          alt={`${mod.name} logo`}
          className="h-10 w-10 rounded-md"
        />
        <div className="flex flex-1 flex-col gap-0 truncate">
          <p className="truncate font-medium">
            {mod.name}{" "}
            <span className="text-muted-foreground font-normal">
              by{" "}
              <Button
                variant="link"
                className="px-0 text-yellow-700 dark:text-yellow-200"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSetAuthor(mod.author);
                }}
              >
                {mod.author}
              </Button>
            </span>
          </p>
          <p className="text-muted-foreground truncate text-xs">{mod.summary}</p>
          <div className="text-muted-foreground flex items-center gap-1 truncate">
            <DownloadIcon size={12} />
            <p className="text-xs">{mod.downloads}</p>
            ·
            <UsersIcon size={12} />
            <p className="text-xs">{mod.follows}</p>
            ·
            <MessageCircleIcon size={12} />
            <p className="text-xs">{mod.comments}</p>
            {isDownloading && downloadingMod && <Progress value={downloadingMod.progress} />}
          </div>
        </div>
      </a>
      <Group>
        {isDownloading && (
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Cancel download"}
            render={
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => onCancelDownload(mod.modid)}
              />
            }
          >
            <XIcon className="size-3.5" />
          </TooltipTrigger>
        )}
        {modUpdate && modUpdate.modversion !== installedMod?.version && (
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Download latest version"}
            render={
              <Button
                size="icon-sm"
                variant="outline"
                onClick={async () => {
                  if (installedMod) {
                    await onRemoveMod({
                      modzip: installedMod?.file,
                    });
                  }
                  await onDownloadMod({
                    url: modUpdate.mainfile,
                    modid: mod.modid,
                  });
                }}
              />
            }
          >
            <CloudDownloadIcon className="size-3.5" />
          </TooltipTrigger>
        )}
        {!installedMod && !isDownloading && (
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Download latest version"}
            render={
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => onDownloadLatest(mod.modid)}
              />
            }
          >
            <CloudDownloadIcon className="size-3.5" />
          </TooltipTrigger>
        )}
        {!isDownloading && (
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => (installedMod ? "Switch version" : "Download specific version")}
            render={
              <PopoverTrigger
                handle={popoverHandle}
                payload={() => (
                  <ModVersionForm
                    modid={mod.modid}
                    removeMod={onRemoveMod}
                    downloadMod={onDownloadMod}
                    installed={installedMod}
                    handle={popoverHandle}
                  />
                )}
                render={<Button size="icon-sm" variant="outline" />}
              />
            }
          >
            {installedMod ? (
              <RefreshCWIcon className="size-3.5" />
            ) : (
              <HardDriveDownloadIcon className="size-3.5" />
            )}
          </TooltipTrigger>
        )}
        {installedMod && !isDownloading && (
          <TooltipTrigger
            handle={tooltipHandle}
            payload={() => "Remove mod"}
            render={
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => onRemoveMod({ modzip: installedMod.file })}
              />
            }
          >
            <XIcon className="size-3.5" />
          </TooltipTrigger>
        )}
      </Group>
    </m.div>
  );
}
