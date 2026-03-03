import type { MyWebviewRPCType } from "@/shared/rpc";
import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import { installationController } from "./controllers/installations";
import { serverController } from "./controllers/servers";
import { versionController } from "./controllers/versions";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const myWebviewRPC = BrowserView.defineRPC<MyWebviewRPCType>({
  handlers: {
    // When the browser sends a message we can handle it
    // in the main bun process
    requests: {
      ...versionController,
      ...serverController,
      ...installationController,
    },
  },
  maxRequestTime: 30000,
});

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
    }
  }
  return "views://mainview/index.html";
}

// Create the main application window
const url = await getMainViewUrl();

export const mainWindow = new BrowserWindow({
  frame: {
    height: 700,
    width: 900,
    x: 200,
    y: 200,
  },
  partition: "persist:storyforge",
  rpc: myWebviewRPC,
  title: "Story Forge",
  titleBarStyle: "hiddenInset",
  transparent: true,
  url,
});

console.log("Story Forge app started!");
