import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Electroview } from "electrobun/view";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import type { StoryForgeRPCType } from "@/shared/rpc";
import { LogoFull } from "./components/logo";
import { ThemeProvider } from "./contexts/theme.context";
import { routeTree } from "./routeTree.gen";

const rpc = Electroview.defineRPC<StoryForgeRPCType>({
  handlers: {
    messages: {},
    requests: {},
  },
  maxRequestTime: 60000,
});
const electroview = new Electroview({ rpc });
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
});

export type ElectroViewContext = typeof electroview;

// Create a new router instance
const router = createRouter({
  context: { electroview, queryClient },
  routeTree,

  Wrap: ({ children }) => (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <ThemeProvider>{children}</ThemeProvider>
      <TanStackDevtools
        config={{
          customTrigger: (
            <LogoFull className="size-12 opacity-0 transition-all duration-300 ease-in-out hover:opacity-100" />
          ),
        }}
        plugins={[
          {
            name: "Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            name: "Router",
            render: <TanStackRouterDevtoolsPanel router={router} />,
          },
          formDevtoolsPlugin(),
          hotkeysDevtoolsPlugin(),
        ]}
      />
    </PersistQueryClientProvider>
  ),
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

router.subscribe("onLoad", (e) => {
  console.log("saved last visited", e.toLocation.pathname, "to local storage");
  localStorage.setItem(
    "lastVisited",
    `${e.toLocation.pathname}${e.toLocation.search ? `?${e.toLocation.searchStr}` : ""}`,
  );
});

// Render the app
const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
