import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Kbd, KbdGroup } from "@/mainview/components/ui/kbd";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";
import { SearchIcon } from "@/mainview/components/ui/icons/search";

interface ModSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function ModSearchBar({ search, onSearchChange, searchRef }: ModSearchBarProps) {
  return (
    <InputGroup>
      <InputGroupInput
        onChange={(e) => onSearchChange(e.target.value)}
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
  );
}
