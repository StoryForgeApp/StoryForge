import { useMemo } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/mainview/components/ui/combobox";
import { SearchIcon } from "@/mainview/components/ui/icons/search";
import { useInstallations } from "@/mainview/hooks/use-installations";

export function InstallationCombobox({
  trigger,
  ...props
}: {
  trigger: React.ReactNode;
} & React.ComponentProps<typeof Combobox>) {
  const { data: installations } = useInstallations();

  const items = useMemo(() => {
    if (!installations) return [];
    return installations.map((installation) => ({
      label: installation.name,
      value: installation.path,
    }));
  }, [installations]);

  return (
    <Combobox items={items} {...props}>
      {trigger}
      <ComboboxPopup>
        <div className="flex flex-col gap-2 border-b p-2">
          <ComboboxInput
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            placeholder="Search installations..."
            showTrigger={false}
            startAddon={<SearchIcon size={16} />}
          />
        </div>
        <ComboboxList>
          {(item) => (
            <ComboboxItem
              className="data-highlighted:bg-accent data-selected:bg-primary data-selected:text-primary-foreground cursor-pointer rounded-sm px-2 py-1"
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
