import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    identifier: "lovelesscodes.storyforge.dev",
    name: "Story Forge",
    version: "0.0.1",
    description: "A VintageStory mod manager built with Bun and React",
    urlSchemes: ["storyforge", "storyforge-dev"],
  },
  build: {
    // Vite builds to dist/, we copy from there
    copy: {
      "dist/assets": "views/mainview/assets",
      "dist/index.html": "views/mainview/index.html",
    },
    linux: {
      bundleCEF: false,
      icon: "assets/icon.png",
    },
    mac: {
      bundleCEF: false,
    },
    // Ignore Vite output in watch mode — HMR handles view rebuilds separately
    // @ts-expect-error ElectrobunConfig doesn't have watchIgnore yet, but it should be added to avoid unnecessary restarts during development
    watchIgnore: ["dist/**"],
    win: {
      bundleCEF: false,
      icon: "assets/icon.png",
    },
  },
} satisfies ElectrobunConfig;
