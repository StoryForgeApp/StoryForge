import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/mainview/components/ui/select";
import { sortingOptions, type SortingOption } from "@/mainview/types/mods";

interface ModSortSelectProps {
  sorting: SortingOption;
  onSortingChange: (value: SortingOption) => void;
}

export function ModSortSelect({ sorting, onSortingChange }: ModSortSelectProps) {
  return (
    <Select
      value={sorting}
      onValueChange={(v) => onSortingChange(v as SortingOption)}
      items={sortingOptions}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup alignItemWithTrigger={false}>
        {sortingOptions.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
