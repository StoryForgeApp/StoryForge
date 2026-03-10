import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger, ComboboxValue } from "@/mainview/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Kbd, KbdGroup } from "@/mainview/components/ui/kbd";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { SelectButton } from "@/mainview/components/ui/select";
import {
  Tooltip,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipTrigger,
} from "@/mainview/components/ui/tooltip";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ListCheckIcon, LockIcon, Package2Icon, ZapIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { Variants } from "motion/react";
import { SearchIcon } from "@/mainview/components/ui/icons/search";
import { UsersIcon } from "@/mainview/components/ui/icons/users";
import { ConnectIcon } from "@/mainview/components/ui/icons/connect";

export const Route = createFileRoute("/servers/public")({
  component: RouteComponent,
});

const tooltipHandle = TooltipCreateHandle<React.ComponentType>();

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

function RouteComponent() {
  const { electroview } = useRouteContext({ from: "__root__" });

  const { data: publicServers } = useQuery({
    queryFn: () => electroview.rpc?.request.getPublicServers(),
    queryKey: ["publicServers"],
    staleTime: 1000 * 60, // 1 minute
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<{ label: string; value: string }[]>([]);

  const filteredServers = useMemo(() => {
    if (!publicServers) return [];
    let filtered = [...publicServers];

    if (selectedVersions.length > 0) {
      filtered = filtered.filter((server) =>
        selectedVersions.some((version) => version.value === server.gameVersion),
      );
    }

    const sorted = filtered.sort((a, b) => b.players - a.players);

    if (!search) return sorted;

    const searchLower = search.toLowerCase();
    return sorted.filter(
      (server) =>
        server.serverName.toLowerCase().includes(searchLower) ||
        server.gameDescription.toLowerCase().includes(searchLower) ||
        server.serverIP.toLowerCase().includes(searchLower),
    );
  }, [publicServers, search, selectedVersions]);

  const publicServerVirtualizer = useVirtualizer({
    count: filteredServers?.length || 0,
    estimateSize: () => 80,
    getScrollElement: () => scrollRef.current,
    overscan: 5,
  });

  useHotkey("Mod+K", () => {
    searchRef.current?.focus();
  });

  return (
    <div className="h-full grid grid-rows-[auto_1fr] p-2">
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
        className="h-full border border-border rounded-lg bg-sidebar"
        scrollFade
        viewportRef={scrollRef}
      >
        <div className="relative" style={{ height: `${publicServerVirtualizer.getTotalSize()}px` }}>
          {publicServerVirtualizer.getVirtualItems().map((virtualRow) => {
            const ps = filteredServers[virtualRow.index];
            if (!ps) return null;
            return (
              <div
                className="left-0 absolute top-0 pb-1 w-full not-last:border-b border-border px-2"
                key={ps.serverIP}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <m.div
                  variants={variations}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-[minmax(0,1fr)_max-content] gap-2 items-center"
                >
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex flex-col h-full">
                      <p className="truncate">{ps.serverName}</p>
                      <p className="font-thin text-xs">{ps.serverIP}</p>
                      <p className="font-thin text-xs text-muted-foreground truncate">
                        {ps.gameDescription}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="font-thin text-muted-foreground" variant="outline">
                        <ZapIcon /> {ps.gameVersion}
                      </Badge>
                      <Badge className="font-thin text-muted-foreground" variant="outline">
                        <UsersIcon /> {ps.players}/{ps.maxPlayers}
                      </Badge>
                      <Badge className="font-thin text-muted-foreground" variant="outline">
                        <Package2Icon /> {ps.modCount}
                      </Badge>
                      {ps.whitelisted && (
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Whitelisted"}
                          render={
                            <Badge className="font-thin text-muted-foreground" variant="outline" />
                          }
                        >
                          <ListCheckIcon />
                        </TooltipTrigger>
                      )}
                      {ps.hasPassword && (
                        <TooltipTrigger
                          handle={tooltipHandle}
                          payload={() => "Password protected"}
                          render={
                            <Badge className="font-thin text-muted-foreground" variant="outline" />
                          }
                        >
                          <LockIcon />
                        </TooltipTrigger>
                      )}
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
      <Tooltip handle={tooltipHandle}>
        {({ payload: Payload }) => (
          <TooltipPopup>{Payload !== undefined && <Payload />}</TooltipPopup>
        )}
      </Tooltip>
    </div>
  );
}
