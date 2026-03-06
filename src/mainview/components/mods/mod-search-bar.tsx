import { InputGroup, InputGroupAddon, InputGroupInput } from "@/mainview/components/ui/input-group";
import { Kbd, KbdGroup } from "@/mainview/components/ui/kbd";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { ZoomInIcon } from "lucide-react";
import type { RefObject } from "react";

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
        <ZoomInIcon />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <KbdGroup>
          <Kbd>{formatForDisplay("Mod+K")}</Kbd>
        </KbdGroup>
      </InputGroupAddon>
    </InputGroup>
  );
}
