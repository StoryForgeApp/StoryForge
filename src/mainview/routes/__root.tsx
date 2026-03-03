import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { MainLayout } from "@/mainview/layouts/main";
import "@/mainview/index.css";
import type { QueryClient } from "@tanstack/react-query";
import { domAnimation, LazyMotion } from "motion/react";
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
}>()({ component: RootLayout });
