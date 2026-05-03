import { useQuery, keepPreviousData, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRPC } from "./use-rpc";

interface UseModQueriesProps {
  path: string;
  debouncedSearch: string;
  debouncedVersions: { label: string; value: string }[];
}

export function useModQueries({ path, debouncedSearch, debouncedVersions }: UseModQueriesProps) {
  const { rpc } = useRPC();

  const { data: installedMods, refetch: refetchInstalledMods } = useQuery({
    queryKey: ["installedMods", path],
    queryFn: () =>
      rpc?.request.getInstalledMods({
        path,
      }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: modsData } = useQuery({
    queryKey: ["mods", debouncedSearch, debouncedVersions],
    queryFn: () =>
      rpc?.request.fetchMods({
        search: debouncedSearch,
        versions: debouncedVersions.map((v) => v.value),
      }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });

  const modsString = useMemo(
    () => installedMods?.map((mod) => `${mod.modid}@${mod.version}`).join(","),
    [installedMods],
  );

  const { data: modUpdates } = useQuery({
    queryKey: ["modUpdates", modsString],
    queryFn: async () => {
      if (!modsString) return {};
      return rpc?.request.fetchModUpdates({ modsString });
    },
    enabled: !!modsString,
    staleTime: 5 * 60 * 1000,
  });

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

  const { mutate: openLink } = useMutation({
    mutationFn: async (url: string) => rpc?.request.openLink({ url }),
  });

  return {
    installedMods,
    refetchInstalledMods,
    modsData,
    modUpdates,
    installedModIds,
    openLink,
  };
}
