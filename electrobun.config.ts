import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    identifier: "lovelesscodes.storyforge.dev",
    name: "Story Forge",
    version: "0.0.1",
    description: "A VintageStory mod manager built with Bun and React",
    urlSchemes: ["storyforge", "storyforge-dev"],
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  release: {
    baseUrl: "https://github.com/StoryForgeApp/storyforge/releases/latest/download"
  },
  build: {
    // Vite builds to dist/, we copy from there
    copy: {
      "dist/assets": "views/mainview/assets",
      "dist/index.html": "views/mainview/index.html",
    },
    linux: {
      bundleCEF: process.env.NODE_ENV === "production",
      icon: "icon.iconset/icon_512x512.png",
    },
    mac: {
      bundleCEF: false,
      icons: "icon.iconset",
    },
    // Ignore Vite output in watch mode — HMR handles view rebuilds separately
    // @ts-expect-error ElectrobunConfig doesn't have watchIgnore yet, but it should be added to avoid unnecessary restarts during development
    watchIgnore: ["dist/**"],
    win: {
      bundleCEF: false,
      icon: "icon.iconset/icon_512x512.png",
    },
  },
} satisfies ElectrobunConfig;
