import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";

export const useInstallations = () => {
  const { electroview } = useRouteContext({ from: "__root__" });
  return useQuery({
    queryFn: () => electroview.rpc?.request.getInstallations(),
    queryKey: ["installations"],
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
