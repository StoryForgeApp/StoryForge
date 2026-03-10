import { sortVersions } from "@/lib/utils";
import { useAllVersions } from "@/mainview/hooks/use-all-versions";
import { useInstalledVersions } from "@/mainview/hooks/use-installed-versions";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Combobox, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "../ui/combobox";
import { Label } from "../ui/label";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SearchIcon } from "../ui/icons/search";
import { RefreshCWIcon } from "../ui/icons/refresh-cw";

export function VersionCombobox({
  trigger,
  disableInstalled = true,
  ...props
}: {
  trigger: React.ReactNode;
  disableInstalled?: boolean;
} & React.ComponentProps<typeof Combobox>) {
  const { data: installedVersions } = useInstalledVersions();
  const { data: allVersionsData, isFetching, refetch } = useAllVersions();
  const [showRc, setShowRc] = useState(false);

  const allVersions = useMemo(() => {
    if (!allVersionsData) return [];
    return sortVersions(
      allVersionsData.filter((version) => showRc || !version.includes("rc")),
      "desc",
    ).map((version) => ({
      label: version,
      value: version,
    }));
  }, [allVersionsData, showRc]);

  return (
    <Combobox items={allVersions} {...props}>
      {trigger}
      <ComboboxPopup>
        <div className="border-b p-2 flex flex-col gap-2">
          <ComboboxInput
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            placeholder="Search versions..."
            showTrigger={false}
            startAddon={<SearchIcon />}
          />
          <div className="flex items-center gap-2 justify-between">
            <Label className="font-thin text-sm">
              <Checkbox checked={showRc} onCheckedChange={(checked) => setShowRc(checked)} />
              Show release candidates
            </Label>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon-sm"
                    disabled={isFetching}
                    variant="outline"
                    onClick={() => refetch()}
                  />
                }
              >
                <RefreshCWIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipPopup>Refresh version list</TooltipPopup>
            </Tooltip>
          </div>
        </div>
        <ComboboxList>
          {(item) => (
            <ComboboxItem
              className="data-highlighted:bg-accent rounded-sm px-2 py-1 cursor-pointer data-selected:bg-primary data-selected:text-primary-foreground"
              disabled={
                disableInstalled && installedVersions?.map((v) => v.version).includes(item.value)
              }
              key={item.value}
              value={item}
            >
              <div className="flex items-center gap-2">
                <p>{item.label}</p>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
