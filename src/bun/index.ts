import { exists, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { BrowserView, BrowserWindow, Screen, Session, Updater, Utils } from "electrobun/bun";
import type { StoryForgeRPCType } from "@/shared/rpc";
import { installationController } from "./controllers/installations";
import { logController } from "./controllers/logs";
import { modController } from "./controllers/mods";
import { serverController } from "./controllers/servers";
import { utilsController } from "./controllers/utils";
import { versionController } from "./controllers/versions";
import { worldsController } from "./controllers/worlds";
import { getPlatform } from "./utils";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const windowConfig = join(Utils.paths.config, "window.json");
const platform = getPlatform();
const session = Session.defaultSession;

function getDisplayAtCursor() {
  const cursor = Screen.getCursorScreenPoint();
  const displays = Screen.getAllDisplays();

  return (
    displays.find((display) => {
      const { x, y, width, height } = display.bounds;
      return cursor.x >= x && cursor.x < x + width && cursor.y >= y && cursor.y < y + height;
    }) || Screen.getPrimaryDisplay()
  );
}

const myWebviewRPC = BrowserView.defineRPC<StoryForgeRPCType>({
  handlers: {
    // When the browser sends a message we can handle it
    // in the main bun process
    requests: {
      ...versionController,
      ...serverController,
      ...installationController,
      ...modController,
      ...utilsController,
      ...worldsController,
      ...logController,
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

const windowConfigData = (await exists(windowConfig))
  ? (Bun.JSON5.parse(await readFile(windowConfig, "utf-8")) as Record<string, unknown>)
  : {};

const windowHeight = Number(windowConfigData.windowHeight);
const windowWidth = Number(windowConfigData.windowWidth);
const windowX = Number(windowConfigData.windowX);
const windowY = Number(windowConfigData.windowY);

const height = Number.isNaN(windowHeight) || windowHeight === 0 ? 700 : windowHeight;
const width = Number.isNaN(windowWidth) || windowWidth === 0 ? 900 : windowWidth;
const targetDisplay = getDisplayAtCursor();

const x =
  Number.isNaN(windowX) || windowX === 0
    ? Math.round((targetDisplay.workArea.width - width) / 2) + targetDisplay.workArea.x
    : windowX;
const y =
  Number.isNaN(windowY) || windowY === 0
    ? Math.round((targetDisplay.workArea.height - height) / 2) + targetDisplay.workArea.y
    : windowY;

export const mainWindow = new BrowserWindow({
  frame: {
    height,
    width,
    x,
    y,
  },
  // @ts-expect-error partition is missing from type definition, but it is supported by BrowserWindow options
  partition: session.partition,
  rpc: myWebviewRPC,
  title: "Story Forge",
  titleBarStyle: "hiddenInset",
  transparent: true,
  url,
  renderer: platform === "linux" ? "cef" : "native", // CEF on Linux for better font rendering and drag-and-drop support
});

const handleResizeOrMove = async (e: unknown) => {
  const event = e as {
    data: { height?: number; width?: number; x: number; y: number };
  };
  const { x, y } = event.data;
  if (event.data.height && event.data.width) {
    windowConfigData.windowHeight = event.data.height;
    windowConfigData.windowWidth = event.data.width;
  }
  windowConfigData.windowX = x;
  windowConfigData.windowY = y;

  await writeFile(windowConfig, Bun.JSON5.stringify(windowConfigData, null, 2) || "");
};

mainWindow.on("resize", handleResizeOrMove);
mainWindow.on("move", handleResizeOrMove);

console.log("Story Forge app started!");
