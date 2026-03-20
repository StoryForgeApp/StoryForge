import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRPC } from "./use-rpc";

export const useInstalledVersions = () => {
  const { rpc } = useRPC();
  return useQuery({
    queryFn: () => rpc?.request.getInstalledVersions(),
    queryKey: ["installedVersions"],
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
