import type { MyWebviewRPCType } from "@/shared/rpc";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Electroview } from "electrobun/view";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./contexts/theme.context";
import { routeTree } from "./routeTree.gen";

const rpc = Electroview.defineRPC<MyWebviewRPCType>({
  handlers: {
    messages: {
      logToWebview: ({ msg }) => {
        // this will appear in the inspect element devtools console
        console.log(`bun asked me to logToWebview: ${msg}`);
      },
    },
    requests: {
      someWebviewFunction: ({ a, b }) => {
        document.body.innerHTML += `bun asked me to do math with ${a} and ${b}\n`;
        return a + b;
      },
    },
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
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  ),
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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
