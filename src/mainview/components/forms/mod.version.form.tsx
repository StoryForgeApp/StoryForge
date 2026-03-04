import { useForm } from "@tanstack/react-form";
import { UseMutateAsyncFunction, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import * as v from "valibot";
import { Button } from "../ui/button";
import { PopoverPrimitive } from "../ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

const ModVersionFormSchema = v.object({
  url: v.nullable(v.string()),
});

export function ModVersionForm({
  modid,
  removeMod,
  downloadMod,
  installed,
  handle,
}: {
  modid: number;
  removeMod: UseMutateAsyncFunction<
    { success: boolean; message?: undefined } | { success: boolean; message: string } | undefined,
    Error,
    { modzip: string },
    unknown
  >;
  downloadMod: UseMutateAsyncFunction<
    | {
        success: boolean;
        message: string;
        cacheHit?: boolean;
      }
    | undefined,
    Error,
    {
      url: string;
      modid: number;
    },
    unknown
  >;
  installed?: {
    version: string;
    file: string;
  };
  handle: PopoverPrimitive.Handle<React.ComponentType>;
}) {
  const { electroview } = useRouteContext({ from: "__root__" });
  const { data: modInfo } = useQuery({
    queryKey: ["modInfo", modid],
    queryFn: () => electroview.rpc?.request.fetchModInfo({ modid }),
  });
  const defaultValues: { url: string | null } = {
    url:
      modInfo?.mod?.releases.find((release) => release.modversion === installed?.version)
        ?.mainfile ??
      modInfo?.mod?.releases?.[0]?.mainfile ??
      null,
  };
  const form = useForm({
    defaultValues,
    validators: {
      onChange: ModVersionFormSchema,
    },
    onSubmit: async (form) => {
      if (form.value.url) {
        if (installed) {
          await removeMod({ modzip: installed.file });
        }
        await downloadMod({ url: form.value.url, modid });
        handle.close();
      }
    },
  });

  const items = modInfo?.mod?.releases?.map((release) => ({
    value: release.mainfile,
    label: (
      <span className={installed?.version === release.modversion ? "text-green-500" : ""}>
        {release.modversion}{" "}
        {release.tags.length > 0 && (
          <span className="text-muted-foreground">
            for {release.tags[0]} {release.tags.length > 1 && `(+${release.tags.length - 1} more)`}
          </span>
        )}
      </span>
    ),
  }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit(e);
      }}
      className="space-y-2"
    >
      <form.Field name="url">
        {(field) => (
          <div className="flex flex-col gap-1">
            <Select items={items} value={field.state.value} onValueChange={field.handleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false} className="max-h-60">
                {items?.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        )}
      </form.Field>
      <form.Subscribe
        selector={(s) =>
          s.isValid &&
          !s.isSubmitting &&
          s.canSubmit &&
          items?.find((item) => item.value === s.values.url)?.label !== installed?.version
        }
      >
        {(canSubmit) => (
          <Button type="submit" className="w-full" disabled={!canSubmit}>
            Download
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
