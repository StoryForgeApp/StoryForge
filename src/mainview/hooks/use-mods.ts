import { useQuery, keepPreviousData, useMutation } from "@tanstack/react-query";
import { useMemo, useReducer } from "react";
import { useRouteContext } from "@tanstack/react-router";
import { initialFilterState, filterReducer, type SortingOption } from "@/mainview/types/mods";
import useDebounce from "./use-debounce";

interface UseModsReturn {
  // Query results
  installedMods: { name: string; version: string; modid: string; file: string }[] | undefined;
  refetchInstalledMods: () => Promise<unknown>;
  mods: import("@/mainview/types/mods").Mod[];
  modsData: import("@/mainview/types/mods").Mod[] | undefined;
  modUpdates: Record<string, import("@/mainview/types/mods").ModUpdate> | undefined;
  installedModIds: number[];
  openLink: (url: string) => void;
  // Filter state
  filterState: {
    sorting: SortingOption;
    showOnlyInstalled: boolean;
    search: string;
    author: string;
    versions: { label: string; value: string }[];
  };
  filterDispatch: React.Dispatch<
    | { type: "SET_SORTING"; payload: SortingOption }
    | { type: "SET_SHOW_ONLY_INSTALLED"; payload: boolean }
    | { type: "SET_SEARCH"; payload: string }
    | { type: "SET_AUTHOR"; payload: string }
    | { type: "SET_VERSIONS"; payload: { label: string; value: string }[] }
  >;
}

export function useMods(path: string): UseModsReturn {
  const { electroview } = useRouteContext({ from: "__root__" });
  const [filterState, filterDispatch] = useReducer(filterReducer, initialFilterState);

  const { sorting, showOnlyInstalled, search, author, versions } = filterState;

  // Debounce the values for queries
  const debouncedSearch = useDebounce(search, 500);
  const debouncedVersions = useDebounce(versions, 1000);

  // Query for installed mods
  const { data: installedMods, refetch: refetchInstalledMods } = useQuery({
    queryKey: ["installedMods", path],
    queryFn: () =>
      electroview.rpc?.request.getInstalledMods({
        path,
      }),
    staleTime: 10 * 60 * 1000,
  });

  // Query for mods list
  const { data: modsData } = useQuery({
    queryKey: ["mods", debouncedSearch, debouncedVersions],
    queryFn: () =>
      electroview.rpc?.request.fetchMods({
        search: debouncedSearch,
        versions: debouncedVersions.map((v) => v.value),
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  // Calculate mods string for updates query
  const modsString = useMemo(
    () => installedMods?.map((mod) => `${mod.modid}@${mod.version}`).join(","),
    [installedMods],
  );

  // Query for mod updates
  const { data: modUpdates } = useQuery({
    queryKey: ["modUpdates", modsString],
    queryFn: async () => {
      if (!modsString) return {};
      return electroview.rpc?.request.fetchModUpdates({ modsString });
    },
    enabled: !!modsString,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate installed mod IDs
  const installedModIds = useMemo(() => {
    if (!installedMods) return [];
    return (
      modsData
        ?.filter((mod) =>
          installedMods.find(
            (m) =>
              m.modid.toString().toLowerCase() === mod.modid.toString().toLowerCase() ||
              mod.modidstrs.find((id) => id.toLowerCase() === m.modid.toString().toLowerCase()),
          ),
        )
        .map((mod) => mod.modid) || []
    );
  }, [installedMods, modsData]);

  // Apply filters to mods data
  const mods = useMemo(() => {
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

  // Open link mutation
  const { mutate: openLink } = useMutation({
    mutationFn: async (url: string) => electroview.rpc?.request.openLink({ url }),
  });

  return {
    // Query results
    installedMods,
    refetchInstalledMods,
    mods,
    modsData,
    modUpdates,
    installedModIds,
    openLink,
    // Filter state
    filterState,
    filterDispatch,
  };
}

export type { SortingOption };
