import { useForm } from "@tanstack/react-form";
import { formatForDisplay, useHotkey } from "@tanstack/react-hotkeys";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ZapIcon } from "lucide-react";
import { Variants } from "motion/react";
import * as m from "motion/react-m";
import { useMemo, useRef, useState } from "react";
import * as v from "valibot";
import { InstallationCombobox } from "@/mainview/components/comboboxes/installation.combobox";
import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ComboboxTrigger, ComboboxValue } from "@/mainview/components/ui/combobox";
import { ChevronsUpDownIcon } from "@/mainview/components/ui/icons/chevrons-up-down";
import { ConnectIcon } from "@/mainview/components/ui/icons/connect";
import { PlusIcon } from "@/mainview/components/ui/icons/plus";
import { RefreshCWIcon } from "@/mainview/components/ui/icons/refresh-cw";
import { SearchIcon } from "@/mainview/components/ui/icons/search";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { KbdGroup, Kbd } from "@/mainview/components/ui/kbd";
import { Label } from "@/mainview/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/mainview/components/ui/popover";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { SelectButton } from "@/mainview/components/ui/select";
import { useRPC } from "@/mainview/hooks/use-rpc";
import { useServers } from "@/mainview/hooks/use-servers";

export const Route = createFileRoute("/servers/")({
  component: RouteComponent,
});

const variations = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
} as Variants;

const CreateServerForm = v.object({
  installation: v.object({
    label: v.string(),
    value: v.string(),
  }),
  name: v.pipe(v.string(), v.minLength(1, "Name is required")),
  ip: v.pipe(v.string(), v.minLength(1, "IP is required")),
  port: v.string(),
  password: v.string(),
});

function RouteComponent() {
  const { data: servers, refetch } = useServers();
  const { streamMode } = useRouteContext({
    from: "__root__",
  });
  const { rpc } = useRPC();

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<{ label: string; value: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      installation: null as { label: string; value: string } | null,
      name: "",
      ip: "",
      port: "",
      password: "",
    },
    validators: {
      onChange: CreateServerForm,
    },
    onSubmit: (form) => {
      if (!form.value.installation) return;
      addServer({
        path: form.value.installation.value,
        name: form.value.name,
        ip: form.value.ip,
        port: form.value.port || undefined,
        password: form.value.password || undefined,
      });
    },
  });

  const { mutate: addServer, isPending } = useMutation({
    mutationFn: async (values: {
      path: string;
      name: string;
      ip: string;
      port?: string;
      password?: string;
    }) => rpc?.request.addServer(values),
    onError: (error) => {
      console.error("Failed to add server:", error);
    },
    onSuccess: async () => {
      form.reset();
      setIsOpen(false);
      await refetch();
    },
  });

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
    <div className="grid h-full grid-rows-[auto_1fr] gap-2 p-2">
      <div className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Button
            variant="outline"
            className="w-full justify-start py-2"
            render={<PopoverTrigger />}
          >
            <PlusIcon />
            Add Server
          </Button>
          <PopoverPopup className="w-(--anchor-width) min-w-64" align="start">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await form.handleSubmit(e);
              }}
            >
              <form.Field name="installation">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Installation</Label>
                    <InstallationCombobox
                      value={field.state.value}
                      onValueChange={(v) =>
                        field.handleChange(v as { label: string; value: string })
                      }
                      trigger={
                        <ComboboxTrigger
                          className="w-full justify-between"
                          render={<Button variant="outline" />}
                        >
                          {field.state.value?.label || "Select installation"}
                          <ChevronsUpDownIcon className="-me-1!" />
                        </ComboboxTrigger>
                      }
                    />
                  </div>
                )}
              </form.Field>
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
              <form.Field name="ip">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>IP</Label>
                    <InputGroup>
                      <InputGroupInput
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                )}
              </form.Field>
              <form.Field name="port">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Port</Label>
                    <InputGroup>
                      <InputGroupInput
                        placeholder="42420"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor={field.name}>Password</Label>
                    <InputGroup>
                      <InputGroupInput
                        type="password"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.canSubmit && !s.isSubmitting && !s.isDefaultValue}>
                {(canSubmit) => (
                  <Button disabled={!canSubmit || isPending} className="w-full" type="submit">
                    Add Server
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </PopoverPopup>
        </Popover>
        <InputGroup>
          <InputGroupInput
            onChange={(e) => setSearch(e.target.value)}
            ref={searchRef}
            value={search}
          />
          <InputGroupAddon>
            <SearchIcon size={16} />
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
        <Button size="icon-sm" variant="outline" onClick={() => refetch()}>
          <RefreshCWIcon className="size-3.5" />
        </Button>
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
                key={`${s.installation}-${s.ip}-${s.port ?? ""}-${s.name}`}
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
                      <p className="text-xs font-thin">{streamMode ? "···.···.···.···" : s.ip}</p>
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
