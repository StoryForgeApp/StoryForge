import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    identifier: 'lovelesscodes.storyforge.dev',
    name: 'Story Forge',
    version: '0.1.3',
    description: 'A VintageStory mod manager built with Bun and React',
    urlSchemes: [
      'storyforge',
      'storyforge-dev',
    ],
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  release: {
    baseUrl: 'https://github.com/StoryForgeApp/storyforge/releases/latest/download',
  },
  build: {
    copy: {
      'dist/assets': 'views/mainview/assets',
      'dist/index.html': 'views/mainview/index.html',
    },
    linux: {
      bundleCEF: false,
      icon: 'icon.iconset/icon_512x512.png',
    },
    mac: {
      bundleCEF: false,
      icons: 'icon.iconset',
    },
    watchIgnore: [
      'dist/**',
    ],
    win: {
      bundleCEF: false,
      icon: 'assets/icon_512x512.ico',
    },
  },
} satisfies ElectrobunConfig