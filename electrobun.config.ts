import type { ElectrobunConfig } from "electrobun";
import packageJson from "./package.json";

export default {
  app: {
    identifier: "lovelesscodes.storyforge.dev",
    name: "Story Forge",
    version: packageJson.version,
    description: "A VintageStory mod manager built with Bun and React",
    urlSchemes: ["storyforge", "storyforge-dev"],
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  release: {
    baseUrl: "https://github.com/StoryForgeApp/storyforge/releases/latest/download",
  },
  build: {
    copy: {
      "dist/assets": "views/mainview/assets",
      "dist/index.html": "views/mainview/index.html",
    },
    linux: {
      bundleCEF: true,
      defaultRenderer: "cef",
      icon: "icon.iconset/icon_512x512.png",
      bundleWGPU: false,
    },
    mac: {
      bundleCEF: false,
      icons: "icon.iconset",
      notarize: false,
      codesign: false,
      defaultRenderer: "native",
      bundleWGPU: false,
    },
    watchIgnore: ["dist/**"],
    win: {
      bundleCEF: false,
      icon: "assets/icon_512x512.ico",
      defaultRenderer: "native",
      bundleWGPU: false,
    },
  },
} satisfies ElectrobunConfig;
