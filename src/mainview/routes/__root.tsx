import "@/mainview/index.css";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, redirect } from "@tanstack/react-router";
import { domAnimation, LazyMotion } from "motion/react";
import { MainLayout } from "@/mainview/layouts/main";
import type { ElectroViewContext } from "../main";

const RootLayout = () => (
  <LazyMotion features={domAnimation}>
    <MainLayout>
      <Outlet />
    </MainLayout>
  </LazyMotion>
);

export const Route = createRootRouteWithContext<{
  electroview: ElectroViewContext;
  queryClient: QueryClient;
}>()({
  component: RootLayout,
  beforeLoad: async ({ location, context }) => {
    const lastVisited = localStorage.getItem("lastVisited");
    const alreadyVisited = sessionStorage.getItem("alreadyVisited");
    if (!alreadyVisited) {
      if (lastVisited && location.pathname === "/" && lastVisited !== "/") {
        sessionStorage.setItem("alreadyVisited", "true");
        throw redirect({ to: lastVisited });
      }
    }
    const streamMode = await context.electroview.rpc?.request.getStreamMode();

    return {
      streamMode,
    };
  },
});
