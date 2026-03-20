import { useRouteContext } from "@tanstack/react-router";

export const useRPC = () => {
  const { electroview } = useRouteContext({ from: "__root__" });

  return {
    rpc: electroview.rpc,
  };
};
