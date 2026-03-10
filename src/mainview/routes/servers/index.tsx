import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { createFileRoute } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ZapIcon } from "lucide-react";
import { Variants } from "motion/react";
import * as m from "motion/react-m";
import { useMemo, useRef, useState } from "react";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger, ComboboxValue } from "@/mainview/components/ui/combobox";
import { ConnectIcon } from "@/mainview/components/ui/icons/connect";
import { SearchIcon } from "@/mainview/components/ui/icons/search";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { KbdGroup, Kbd } from "@/mainview/components/ui/kbd";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { SelectButton } from "@/mainview/components/ui/select";
import { useServers } from "@/mainview/hooks/use-servers";

export const Route = createFileRoute("/servers/")({
  component: RouteComponent,
});

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

function RouteComponent() {
  const { data: servers } = useServers();

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<{ label: string; value: string }[]>([]);

  const filteredServers = useMemo(() => {
    if (!servers) return [];
    let filtered = [...servers];

    if (selectedVersions.length > 0) {
      filtered = filtered.filter((server) =>
        selectedVersions.some((version) => version.value === server.version),
      );
    }

    if (!search) return filtered;

    const searchLower = search.toLowerCase();
    return filtered.filter(
      (server) =>
        server.name.toLowerCase().includes(searchLower) ||
        server.ip.toLowerCase().includes(searchLower) ||
        server.installation.toLowerCase().includes(searchLower),
    );
  }, [servers, search, selectedVersions]);

  const serverVirtualizer = useVirtualizer({
    count: filteredServers?.length || 0,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  useHotkey("Mod+K", () => {
    searchRef.current?.focus();
  });

  return (
    <div className="grid h-full grid-rows-[auto_1fr] p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <InputGroup>
          <InputGroupInput
            onChange={(e) => setSearch(e.target.value)}
            ref={searchRef}
            value={search}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <KbdGroup>
              <Kbd>{formatForDisplay("Mod+K")}</Kbd>
            </KbdGroup>
          </InputGroupAddon>
        </InputGroup>
        <VersionCombobox
          disableInstalled={false}
          trigger={
            <ComboboxTrigger render={<SelectButton />}>
              <ComboboxValue placeholder="All versions" />
            </ComboboxTrigger>
          }
          multiple
          onValueChange={(v) => setSelectedVersions(v as { label: string; value: string }[])}
          value={selectedVersions}
        />
      </div>
      <ScrollArea
        className="border-border bg-sidebar h-full rounded-lg border"
        scrollFade
        viewportRef={scrollRef}
      >
        <div className="relative" style={{ height: `${serverVirtualizer.getTotalSize()}px` }}>
          {serverVirtualizer.getVirtualItems().map((virtualRow) => {
            const s = filteredServers[virtualRow.index];
            if (!s) return null;
            return (
              <div
                className="border-border absolute top-0 left-0 w-full px-2 pb-1 not-last:border-b"
                key={s.ip}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <m.div
                  variants={variations}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-[minmax(0,1fr)_max-content] items-center gap-2"
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex h-full flex-col">
                      <p className="truncate">{s.name}</p>
                      <p className="text-xs font-thin">{s.ip}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="text-muted-foreground font-thin" variant="outline">
                        <ZapIcon /> {s.version ?? "Unknown"} @ {s.installationName}
                      </Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="outline">
                    <ConnectIcon />
                  </Button>
                </m.div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
