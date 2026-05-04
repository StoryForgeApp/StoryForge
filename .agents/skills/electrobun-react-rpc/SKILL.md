---
name: electrobun-react-rpc
description: Use when building Electrobun desktop apps with React and need type-safe RPC between the Bun main process and the webview. Covers InferRPCSchema pattern, controller-based handlers, shared type definitions, React context integration, request/response calls, and one-way message listeners.
---

# Electrobun React RPC

Type-safe RPC between Bun main process and React webview in Electrobun, using controller objects and schema inference.

## Overview

Electrobun provides bidirectional RPC. This skill documents the pattern used for React apps where:

- **Bun** handles requests (filesystem, network, OS APIs)
- **Webview** calls requests and listens to one-way messages
- **Types** are shared and inferred from plain controller objects

## Project Structure

```
src/
├── shared/
│   ├── rpc.ts          # Shared StoryForgeRPCType
│   └── helper.ts       # InferRPCSchema helper
├── bun/
│   ├── index.ts        # Main process, BrowserWindow, BrowserView.defineRPC
│   └── controllers/
│       └── *.ts        # Handler objects + inferred types
└── mainview/
    ├── main.tsx        # Electroview.defineRPC, router context
    └── hooks/
        └── use-rpc.ts  # React hook to access rpc
```

## Shared Types

### InferRPCSchema Helper

Create a helper that infers `params`/`response` from plain async functions:

```ts
// src/shared/helper.ts
import { RPCSchema } from "electrobun";

export type InferRPCSchema<T> = RPCSchema<{
  requests: {
    [K in keyof T]: T[K] extends (...args: any[]) => infer R
      ? {
          params: Parameters<T[K]> extends readonly []
            ? undefined
            : Parameters<T[K]> extends readonly [infer Single]
              ? Single
              : Parameters<T[K]>;
          response: Awaited<R> | undefined;
        }
      : never;
  };
}>;
```

### Combine Controllers into Shared Schema

```ts
// src/shared/rpc.ts
import type { RPCSchema } from "electrobun";
import type { VersionController } from "@/bun/controllers/versions";
import type { InstallationController } from "@/bun/controllers/installations";

// Messages emitted FROM bun TO webview
type MessagesType = VersionController["messages"];

export type StoryForgeRPCType = {
  bun: {
    requests: VersionController["requests"] & InstallationController["requests"];
    messages: MessagesType;
  };
  webview: RPCSchema<{
    messages: MessagesType;
  }>;
};
```

## Controllers (Bun Side)

Controllers are plain objects with async functions. Export both the implementation and the inferred schema type.

```ts
// src/bun/controllers/versions.ts
import { InferRPCSchema } from "@/shared/helper";
import { mainWindow } from "..";

export const versionController = {
  getInstalledVersions: async (): Promise<{ version: string; size: number }[]> => {
    // ... filesystem logic
    return [];
  },

  downloadVersion: async ({ version }: { version: string }) => {
    // Start async work, return immediately
    mainWindow.webview.rpc?.send("downloadProgress", { id: version, progress: 0, speed: 0 });
    return { success: true, message: "Download started" };
  },
};

export type VersionController = InferRPCSchema<typeof versionController> & {
  messages: {
    downloadProgress: { id: string; progress: number; speed: number };
  };
};
```

## Main Process Setup

```ts
// src/bun/index.ts
import { BrowserWindow, BrowserView } from "electrobun/bun";
import type { StoryForgeRPCType } from "@/shared/rpc";
import { versionController } from "./controllers/versions";

const myWebviewRPC = BrowserView.defineRPC<StoryForgeRPCType>({
  handlers: {
    requests: {
      ...versionController,
    },
  },
  maxRequestTime: 30000,
});

export const mainWindow = new BrowserWindow({
  title: "My App",
  url: "views://mainview/index.html",
  rpc: myWebviewRPC,
});

// Send one-way messages to the webview
mainWindow.webview.rpc?.send("downloadProgress", { id: "1.0", progress: 50, speed: 1000 });
```

## Webview Setup (React)

```ts
// src/mainview/main.tsx
import { Electroview } from "electrobun/view";
import type { StoryForgeRPCType } from "@/shared/rpc";
import { createRouter, RouterProvider } from "@tanstack/react-router";

const rpc = Electroview.defineRPC<StoryForgeRPCType>({
  handlers: {
    messages: {},
    requests: {},
  },
  maxRequestTime: 60000,
});

const electroview = new Electroview({ rpc });
export type ElectroViewContext = typeof electroview;

const router = createRouter({
  context: { electroview },
  routeTree,
});

// Render app...
```

## React Hook

```ts
// src/mainview/hooks/use-rpc.ts
import { useRouteContext } from "@tanstack/react-router";

export const useRPC = () => {
  const { electroview } = useRouteContext({ from: "__root__" });
  return { rpc: electroview.rpc };
};
```

## Making Requests

```ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRPC } from "./use-rpc";

export const useInstalledVersions = () => {
  const { rpc } = useRPC();
  return useQuery({
    queryFn: () => rpc?.request.getInstalledVersions(),
    queryKey: ["installedVersions"],
  });
};

export const useDownloadVersion = () => {
  const { rpc } = useRPC();
  return useMutation({
    mutationFn: (version: string) => rpc?.request.downloadVersion({ version }),
  });
};
```

## Listening to Messages

Use `addMessageListener` / `removeMessageListener` for one-way events from bun:

```ts
import { useEffect } from "react";
import { useRPC } from "./use-rpc";

export const useDownloadProgress = (version: string) => {
  const { rpc } = useRPC();

  useEffect(() => {
    const handleProgress = ({
      id,
      progress,
      speed,
    }: {
      id: string;
      progress: number;
      speed: number;
    }) => {
      if (id !== version) return;
      console.log("Progress:", progress, "Speed:", speed);
    };

    rpc?.addMessageListener("downloadProgress", handleProgress);
    return () => rpc?.removeMessageListener("downloadProgress", handleProgress);
  }, [rpc, version]);
};
```

## Key Rules

- **Requests** are `rpc?.request.methodName(params)` — async, round-trip.
- **Messages** are one-way fire-and-forget via `rpc?.send()` (bun) and `addMessageListener` (webview).
- **Controllers** are plain objects; `InferRPCSchema` converts them to typed schemas.
- **Shared types** must import from BOTH `bun` and `mainview` sides. Use path aliases (`@/shared/*`) that resolve in both environments.
- **maxRequestTime** defaults vary by side; set explicitly on both.

## Common Mistakes

| Mistake                                    | Fix                                               |
| ------------------------------------------ | ------------------------------------------------- |
| Calling `rpc.methodName()` directly        | Use `rpc?.request.methodName(params)`             |
| Forgetting `removeMessageListener`         | Always return cleanup in `useEffect`              |
| Importing `electrobun/bun` in webview code | Webview imports from `electrobun/view`            |
| Missing `messages` in controller type      | Append `& { messages: { ... } }` to inferred type |
