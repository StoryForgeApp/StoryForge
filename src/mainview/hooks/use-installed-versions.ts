import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

export const useInstalledVersions = () => {
  const { electroview } = useRouteContext({ from: "__root__" });
  return useQuery({
    queryFn: async () => electroview.rpc?.request.getInstalledVersions(),
    queryKey: ["installedVersions"],
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
