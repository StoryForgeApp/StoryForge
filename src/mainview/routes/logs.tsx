import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RefreshCwIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { Group } from "@/mainview/components/ui/group";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import { useRPC } from "@/mainview/hooks/use-rpc";
import type { LogCategory, LogEntry, LogLevel } from "@/shared/logger";

export const Route = createFileRoute("/logs")({
  component: RouteComponent,
});

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const CATEGORIES: LogCategory[] = [
  "general",
  "installations",
  "downloads",
  "mods",
  "dotnet",
  "servers",
  "versions",
  "worlds",
  "utils",
];

function getLevelColor(level: LogLevel): string {
  switch (level) {
    case "error":
      return "text-destructive";
    case "warn":
      return "text-warning";
    case "debug":
      return "text-muted-foreground";
    default:
      return "text-foreground";
  }
}

function getLevelBadgeVariant(level: LogLevel) {
  switch (level) {
    case "error":
      return "destructive" as const;
    case "warn":
      return "warning" as const;
    case "debug":
      return "outline" as const;
    default:
      return "success" as const;
  }
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function RouteComponent() {
  const { rpc } = useRPC();
  const [levelFilter, setLevelFilter] = useState<LogLevel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["appLogs", levelFilter, categoryFilter],
    queryFn: async () => {
      const result = await rpc?.request.getAppLogs({
        level: levelFilter ?? undefined,
        category: categoryFilter ?? undefined,
        limit: 500,
      });
      return result?.entries ?? [];
    },
    refetchInterval: 5000,
  });

  const { data: allEntries } = useQuery({
    queryKey: ["appLogsCounts"],
    queryFn: async () => {
      const result = await rpc?.request.getAppLogs({ limit: 500 });
      return result?.entries ?? [];
    },
    refetchInterval: 5000,
  });

  const { mutate: clearLogsFn } = useMutation({
    mutationFn: async () => rpc?.request.clearAppLogs(),
    onSuccess: () => refetch(),
  });

  const { mutate: openLogFolderFn } = useMutation({
    mutationFn: async () => {
      const path = await rpc?.request.getLogPath();
      if (path) void rpc?.request.openInstallationFolder({ path });
    },
  });

  const entries = data ?? [];
  const levelCounts = LEVELS.reduce(
    (acc, l) => {
      acc[l] = (allEntries ?? []).filter((e) => e.level === l).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const virtualizer = useVirtualizer({
    count: entries.length,
    estimateSize: () => 32,
    getScrollElement: () => scrollRef.current,
    overscan: 10,
  });

  const categoryItems = [
    { value: "all", label: "All categories" },
    ...CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNoteIcon className="size-4" />
            <h1 className="text-lg font-semibold">Application Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCwIcon className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => openLogFolderFn()}>
              Open Folder
            </Button>
            <Button size="sm" variant="destructive-outline" onClick={() => clearLogsFn()}>
              <Trash2Icon className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Group>
            {LEVELS.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={levelFilter === l ? "default" : "ghost"}
                onClick={() => setLevelFilter(levelFilter === l ? null : l)}
                className="text-xs"
              >
                <span className={getLevelColor(l)}>{l}</span>
                {levelCounts[l] > 0 && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {levelCounts[l]}
                  </Badge>
                )}
              </Button>
            ))}
          </Group>
          <Select
            items={categoryItems}
            value={categoryFilter ?? "all"}
            onValueChange={(v) => setCategoryFilter(v === "all" ? null : (v as LogCategory))}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="flex-1" scrollFade viewportRef={scrollRef}>
        <div className="relative p-3" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {entries.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No log entries</p>
          ) : (
            virtualizer.getVirtualItems().map((virtualRow) => {
              const entry: LogEntry = entries[virtualRow.index];
              if (!entry) return null;
              return (
                <div
                  key={virtualRow.index}
                  className="absolute top-0 left-0 flex w-full gap-3 border-b py-1.5 font-mono text-xs"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <span className="text-muted-foreground shrink-0">{formatTs(entry.ts)}</span>
                  <Badge variant={getLevelBadgeVariant(entry.level)} className="shrink-0 text-xs">
                    {entry.level}
                  </Badge>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {entry.category}
                  </Badge>
                  <span className={getLevelColor(entry.level)}>{entry.message}</span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
