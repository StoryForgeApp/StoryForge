import { useMemo, useReducer } from "react";
import type { FilterState, FilterAction, Mod, SortingOption } from "@/mainview/types/mods";
import { initialFilterState, filterReducer } from "@/mainview/types/mods";

interface UseModFiltersProps {
  modsData: Mod[] | undefined;
  installedModIds: number[];
}

export function useModFilters({ modsData, installedModIds }: UseModFiltersProps) {
  const [filterState, filterDispatch] = useReducer(filterReducer, initialFilterState);

  const { sorting, showOnlyInstalled, author } = filterState;

  const filteredMods = useMemo(() => {
    if (!modsData) return [];
    let sortedMods = [...modsData];
    if (author) {
      sortedMods = sortedMods.filter((mod) =>
        mod.author.toLowerCase().includes(author.toLowerCase()),
      );
    }
    if (showOnlyInstalled) {
      sortedMods = sortedMods.filter((mod) => installedModIds.includes(mod.modid));
    }
    switch (sorting) {
      case "trending":
        sortedMods.sort((a, b) => b.trendingpoints - a.trendingpoints);
        break;
      case "newest":
        sortedMods.sort(
          (a, b) => new Date(b.lastreleased).getTime() - new Date(a.lastreleased).getTime(),
        );
        break;
      case "oldest":
        sortedMods.sort(
          (a, b) => new Date(a.lastreleased).getTime() - new Date(b.lastreleased).getTime(),
        );
        break;
      case "downloads":
        sortedMods.sort((a, b) => b.downloads - a.downloads);
        break;
      case "follows":
        sortedMods.sort((a, b) => b.follows - a.follows);
        break;
      case "comments":
        sortedMods.sort((a, b) => b.comments - a.comments);
        break;
    }
    return sortedMods;
  }, [modsData, sorting, showOnlyInstalled, installedModIds, author]);

  return {
    filterState,
    filterDispatch,
    filteredMods,
  };
}

export type { FilterState, FilterAction, SortingOption };
