import { cn } from "@/lib/utils";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { Progress } from "@/mainview/components/ui/progress";
import { TooltipPrimitive, TooltipTrigger } from "@/mainview/components/ui/tooltip";
import { PopoverPrimitive, PopoverTrigger } from "@/mainview/components/ui/popover";
import type { Mod, InstalledMod, ModUpdate, DownloadingMod } from "@/mainview/types/mods";
import type { RemoveModFunction, DownloadModFunction } from "@/mainview/hooks/use-mod-mutations";
import {
  DownloadIcon,
  Users2Icon,
  MessageCircle,
  XIcon,
  DownloadCloudIcon,
  RefreshCcw,
  HardDriveDownloadIcon,
} from "lucide-react";
import * as m from "motion/react-m";
import { Variants } from "motion/react";
import type { ComponentType } from "react";
import { ModVersionFormType } from "../forms/mod.version.form";

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
        className="flex items-center gap-2 truncate flex-1"
      >
        <img
          src={mod.logo ?? "https://mods.vintagestory.at/web/img/mod-default.png"}
          alt={`${mod.name} logo`}
          className="w-10 h-10 rounded-md"
        />
        <div className="flex flex-col truncate gap-0 flex-1">
          <p className="font-medium truncate">
            {mod.name}{" "}
            <span className="text-muted-foreground font-normal">
              by{" "}
              <Button
                variant="link"
                className="text-yellow-700 dark:text-yellow-200 px-0"
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
            <DownloadCloudIcon className="size-3.5" />
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
            <DownloadCloudIcon className="size-3.5" />
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
              <RefreshCcw className="size-3.5" />
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
