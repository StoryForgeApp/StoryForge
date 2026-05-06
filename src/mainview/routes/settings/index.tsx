import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearchIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { LaptopMinimalCheckIcon } from "@/mainview/components/ui/icons/laptop-minimal-check";
import { MoonIcon } from "@/mainview/components/ui/icons/moon";
import { SunMediumIcon } from "@/mainview/components/ui/icons/sun-medium";
import { Input } from "@/mainview/components/ui/input";
import { Label } from "@/mainview/components/ui/label";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { useTheme, type UserTheme } from "@/mainview/contexts/theme.context";
import { useRPC } from "@/mainview/hooks/use-rpc";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

type Config = {
  streamMode: boolean;
  versionPath: string;
  installationsPath: string;
  modsCachePath: string;
};

const themes: { value: UserTheme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <SunMediumIcon className="size-4" /> },
  { value: "dark", label: "Dark", icon: <MoonIcon className="size-4" /> },
  { value: "system", label: "System", icon: <LaptopMinimalCheckIcon className="size-4" /> },
];

function SettingsForm({ config, version }: { config: Config; version?: string }) {
  const { rpc } = useRPC();
  const { userTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm({ defaultValues: config });

  const { mutate: saveConfig, isPending } = useMutation({
    mutationFn: async (values: Config) => {
      await rpc?.request.setConfig(values);
      return values;
    },
    onSuccess: (savedValues) => {
      setSaveError(null);
      queryClient.setQueryData(["config"], savedValues);
      form.reset(savedValues);
      setShowSaved(true);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      setSaveError(message);
    },
  });

  return (
    <ScrollArea className="h-full">
      <div className="space-y-8 p-6">
        <section className="space-y-4">
          <h2 className="text-sm font-medium">Appearance</h2>
          <div className="flex gap-2">
            {themes.map(({ value, label, icon }) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                aria-pressed={userTheme === value}
                className={cn(
                  "gap-2",
                  userTheme === value && "border-primary text-primary bg-primary/10 font-medium",
                )}
                onClick={() => setTheme(value)}
              >
                {icon}
                {label}
                {userTheme === value && (
                  <div className="bg-primary ml-1 h-1.5 w-1.5 rounded-full" />
                )}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-medium">Privacy</h2>
            <form.Field name="streamMode">
              {(field) => (
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                  />
                  <div>
                    <Label htmlFor={field.name}>Stream mode</Label>
                    <p className="text-muted-foreground text-xs">Hide server IP addresses</p>
                  </div>
                </div>
              )}
            </form.Field>
          </section>

          <Separator />

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Paths</h2>
            <form.Field name="versionPath">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Game versions</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="installationsPath">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Installations</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="modsCachePath">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>Mods cache</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
          </section>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowSaved(false);
                setSaveError(null);
                saveConfig(form.state.values);
              }}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
            <div>
              {saveError ? (
                <p className="text-destructive text-sm">{saveError}</p>
              ) : (
                <form.Subscribe selector={(s) => s.isDirty}>
                  {(isDirty) =>
                    isDirty ? (
                      <p className="text-warning text-sm">Unsaved changes</p>
                    ) : showSaved ? (
                      <p className="text-muted-foreground text-sm">Saved ✓</p>
                    ) : null
                  }
                </form.Subscribe>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-sm font-medium">Mods Cache</h2>
          <Link
            to="/settings/mods-cache"
            className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 transition-colors"
          >
            <PackageSearchIcon className="text-muted-foreground mt-0.5 size-5" />
            <div>
              <p className="text-sm font-medium">Mods Cache</p>
              <p className="text-muted-foreground text-xs">View and clean up cached mod files</p>
            </div>
          </Link>
        </section>

        <Separator />

        <section className="space-y-1">
          <h2 className="text-sm font-medium">About</h2>
          <p className="text-muted-foreground text-xs">Story Forge {version ?? "…"}</p>
        </section>
      </div>
    </ScrollArea>
  );
}

function RouteComponent() {
  const { rpc } = useRPC();

  const { data: config, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: () => rpc?.request.getConfig(),
  });

  const { data: version } = useQuery({
    queryKey: ["version"],
    queryFn: () => rpc?.request.getVersion(),
  });

  if (isLoading || !config) {
    return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;
  }

  return <SettingsForm config={config} version={version} />;
}
