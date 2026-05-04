import { VersionCombobox } from "@/mainview/components/comboboxes/version.combobox";
import { Button } from "@/mainview/components/ui/button";
import { Checkbox } from "@/mainview/components/ui/checkbox";
import { ComboboxTrigger, ComboboxValue } from "@/mainview/components/ui/combobox";
import { Input } from "@/mainview/components/ui/input";
import { Label } from "@/mainview/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "@/mainview/components/ui/popover";
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";

const sideOptions = [
  { label: "Show all", value: "all" },
  { label: "Client-side", value: "client" },
  { label: "Server-side", value: "server" },
  { label: "Both", value: "both" },
];

type ModSide = "both" | "client" | "server";

interface ModFilterPanelProps {
  author: string;
  onAuthorChange: (value: string) => void;
  versions: { label: string; value: string }[];
  onVersionsChange: (value: { label: string; value: string }[]) => void;
  showOnlyInstalled: boolean;
  onShowOnlyInstalledChange: (value: boolean) => void;
  installedModsCount: number;
  side: ModSide | null;
  onSideChange: (value: ModSide | null) => void;
}

export function ModFilterPanel({
  author,
  onAuthorChange,
  versions,
  onVersionsChange,
  showOnlyInstalled,
  onShowOnlyInstalledChange,
  installedModsCount,
  side,
  onSideChange,
}: ModFilterPanelProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full" />}>
        Filters
      </PopoverTrigger>
      <PopoverPopup showArrow={false} className="w-(--anchor-width)" align="start">
        <div className="space-y-2">
          <Input value={author} onValueChange={onAuthorChange} placeholder="Search by author" />
          <VersionCombobox
            disableInstalled={false}
            trigger={
              <ComboboxTrigger render={<SelectButton />}>
                <ComboboxValue placeholder="All versions" />
              </ComboboxTrigger>
            }
            disabled={showOnlyInstalled}
            multiple
            onValueChange={(v) => onVersionsChange(v as { label: string; value: string }[])}
            value={versions}
          />
          <Select
            value={side ?? "all"}
            onValueChange={(v) => onSideChange(v === "all" ? null : (v as ModSide))}
            items={sideOptions}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {sideOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Label>
            <Checkbox
              checked={showOnlyInstalled}
              onCheckedChange={(v) => onShowOnlyInstalledChange(v)}
            />
            Show only installed mods{" "}
            <span className="text-muted-foreground">({installedModsCount})</span>
          </Label>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
