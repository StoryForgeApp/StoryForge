import type { MyWebviewRPCType } from "@/shared/rpc";
import { BrowserView, BrowserWindow, Screen, Session, Updater } from "electrobun/bun";
import { installationController } from "./controllers/installations";
import { serverController } from "./controllers/servers";
import { versionController } from "./controllers/versions";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

const session = Session.fromPartition("persist:storyforge");

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

const windowHeight = Number(session.cookies.get({ name: "windowHeight" }));
const windowWidth = Number(session.cookies.get({ name: "windowWidth" }));
const windowX = Number(session.cookies.get({ name: "windowX" }));
const windowY = Number(session.cookies.get({ name: "windowY" }));

console.log({
  windowHeight,
  windowWidth,
  windowX,
  windowY,
});

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
  partition: "persist:storyforge",
  rpc: myWebviewRPC,
  title: "Story Forge",
  titleBarStyle: "hiddenInset",
  transparent: true,
  url,
});

console.log("Story Forge app started!");
