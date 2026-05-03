import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRPC } from "./use-rpc";

export const useInstallations = () => {
  const { rpc } = useRPC();
  return useQuery({
    queryFn: () => rpc?.request.getInstallations(),
    queryKey: ["installations"],
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
