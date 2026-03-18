import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted runs before ESM imports are resolved.
// Use plain require() — no "typeof import()" type assertions, which can confuse
// Vitest's AST hoisting transform.
const tmpDir = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const path = require("path") as any;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const os = require("os") as any;
  return path.join(os.tmpdir(), `storyforge-test-${process.pid}`) as string;
});

vi.mock("electrobun/bun", () => ({
  Utils: { paths: { appData: tmpDir } },
}));

// Mock top-level electrobun so the controller can be imported without a native runtime
vi.mock("electrobun", () => ({
  default: { Updater: {} },
  Utils: { openExternal: vi.fn(), quit: vi.fn(), showNotification: vi.fn() },
}));

// Mock src/bun/index.ts (imported by the controller as "..")
vi.mock("../index", () => ({
  mainWindow: {
    webview: { rpc: { send: vi.fn() } },
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(() => false),
  },
}));

import { utilsController } from "../controllers/utils";
import {
  getInstallationsPath,
  getModsCachePath,
  getStreamMode,
  getVersionsPath,
  getPlatform,
  slugify,
} from "../utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const configPath = join(tmpDir, "storyforge", "config.json");

// Write via Bun.write() (stateless helper) rather than the singleton configFile,
// so we avoid any BunFile instance-level caching between tests.
async function writeConfig(data: Record<string, unknown>) {
  mkdirSync(join(tmpDir, "storyforge"), { recursive: true });
  await Bun.write(configPath, JSON.stringify(data));
}

beforeAll(() => {
  mkdirSync(join(tmpDir, "storyforge"), { recursive: true });
});

beforeEach(() => {
  if (existsSync(configPath)) rmSync(configPath);
});

// ---------------------------------------------------------------------------
// getStreamMode
// ---------------------------------------------------------------------------

describe("getStreamMode", () => {
  it("returns false by default when no config file exists", async () => {
    expect(await getStreamMode()).toBe(false);
  });

  it("returns true when config has streamMode: true", async () => {
    await writeConfig({ streamMode: true });
    expect(await getStreamMode()).toBe(true);
  });

  it("returns false when streamMode is not a boolean", async () => {
    await writeConfig({ streamMode: "yes" });
    expect(await getStreamMode()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getVersionsPath
// ---------------------------------------------------------------------------

describe("getVersionsPath", () => {
  it("returns default path under appData when no relevant config is saved", async () => {
    await writeConfig({}); // empty config — no versionPath key
    expect(await getVersionsPath()).toBe(join(tmpDir, "storyforge", "versions"));
  });

  it("returns custom path saved in config", async () => {
    await writeConfig({ versionPath: "/custom/versions" });
    expect(await getVersionsPath()).toBe("/custom/versions");
  });
});

// ---------------------------------------------------------------------------
// getInstallationsPath
// ---------------------------------------------------------------------------

describe("getInstallationsPath", () => {
  it("returns default path under appData when no relevant config is saved", async () => {
    await writeConfig({}); // empty config — no installationsPath key
    expect(await getInstallationsPath()).toBe(join(tmpDir, "storyforge", "installations"));
  });

  it("returns custom path saved in config", async () => {
    await writeConfig({ installationsPath: "/custom/installations" });
    expect(await getInstallationsPath()).toBe("/custom/installations");
  });
});

// ---------------------------------------------------------------------------
// getModsCachePath
// ---------------------------------------------------------------------------

describe("getModsCachePath", () => {
  it("returns default path under appData when no relevant config is saved", async () => {
    await writeConfig({}); // empty config — no modsCachePath key
    expect(await getModsCachePath()).toBe(join(tmpDir, "storyforge", "mods_cache"));
  });

  it("returns custom path saved in config", async () => {
    await writeConfig({ modsCachePath: "/custom/mods" });
    expect(await getModsCachePath()).toBe("/custom/mods");
  });
});

// ---------------------------------------------------------------------------
// setConfig / getConfig (controller)
// ---------------------------------------------------------------------------

describe("setConfig", () => {
  it("writes all fields to the config file", async () => {
    await utilsController.setConfig({
      streamMode: true,
      versionPath: "/my/versions",
      installationsPath: "/my/installations",
      modsCachePath: "/my/mods",
    });

    const saved = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    expect(saved.streamMode).toBe(true);
    expect(saved.versionPath).toBe("/my/versions");
    expect(saved.installationsPath).toBe("/my/installations");
    expect(saved.modsCachePath).toBe("/my/mods");
  });

  it("merges partial updates without clobbering existing fields", async () => {
    await writeConfig({ streamMode: true, versionPath: "/my/versions" });

    await utilsController.setConfig({ installationsPath: "/new/installations" });

    const saved = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    expect(saved.streamMode).toBe(true); // unchanged
    expect(saved.versionPath).toBe("/my/versions"); // unchanged
    expect(saved.installationsPath).toBe("/new/installations"); // updated
  });
});

describe("getConfig", () => {
  it("reflects values written by setConfig", async () => {
    await utilsController.setConfig({
      streamMode: true,
      versionPath: "/v",
      installationsPath: "/i",
      modsCachePath: "/m",
    });

    const cfg = await utilsController.getConfig();
    expect(cfg.streamMode).toBe(true);
    expect(cfg.versionPath).toBe("/v");
    expect(cfg.installationsPath).toBe("/i");
    expect(cfg.modsCachePath).toBe("/m");
  });

  it("returns defaults when no config has been saved", async () => {
    const cfg = await utilsController.getConfig();
    expect(cfg.streamMode).toBe(false);
    expect(cfg.versionPath).toBe(join(tmpDir, "storyforge", "versions"));
    expect(cfg.installationsPath).toBe(join(tmpDir, "storyforge", "installations"));
    expect(cfg.modsCachePath).toBe(join(tmpDir, "storyforge", "mods_cache"));
  });
});

// ---------------------------------------------------------------------------
// slugify (pure function)
// ---------------------------------------------------------------------------

describe("slugify", () => {
  it("lowercases and converts spaces to hyphens", () => {
    expect(slugify("My World")).toBe("my-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens into one", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  My Installation  ")).toBe("my-installation");
  });

  it("returns 'default' for empty string", () => {
    expect(slugify("")).toBe("default");
  });

  it("returns 'default' when all characters are stripped", () => {
    expect(slugify("!!!")).toBe("default");
  });
});

// ---------------------------------------------------------------------------
// getPlatform (pure function)
// ---------------------------------------------------------------------------

describe("getPlatform", () => {
  it("returns 'mac' on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
    expect(getPlatform()).toBe("mac");
  });

  it("returns 'windows' on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    expect(getPlatform()).toBe("windows");
  });

  it("returns 'linux' on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    expect(getPlatform()).toBe("linux");
  });
});
