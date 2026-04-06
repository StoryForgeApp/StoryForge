# Story Forge

A modern, cross-platform desktop application for managing Vintage Story game installations, mods, and servers.  
Built with [Electrobun](https://github.com/blackholeconstellation/electrobun), React 19, Tailwind CSS 4, and Vite.

## Features

- **Installation Management**: Create, configure, and manage multiple Vintage Story installations
- **Mod Management**: Browse, install, update, and configure mods with version control
- **World Management**: View and manage game worlds across installations
- **Log Viewer**: Real-time log monitoring with syntax highlighting for different log levels
- **Server Browser**: Discover and connect to public Vintage Story servers
- **Version Management**: Download and switch between different game versions
- **Settings**: Configure app theme, stream mode, and custom paths for game data
- **Modern UI**: Beautiful, responsive interface with dark/light mode support

## Tech Stack

- **Desktop Framework**: [Electrobun](https://github.com/blackholeconstellation/electrobun) (Electron alternative powered by Bun)
- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router with file-based routing
- **State Management**: TanStack Query for server state, Zustand for client state
- **Styling**: Tailwind CSS 4 with custom design system
- **UI Components**: Base UI + custom component library
- **Forms**: TanStack Form with Valibot validation
- **Build Tool**: Vite with Hot Module Replacement (HMR)
- **Package Manager**: Bun

## Prerequisites

- [Bun](https://bun.sh) 1.3.9 or higher (used for parallel builds and HMR)
- macOS, Windows, or Linux

## Installation

```bash
# Clone the repository
git clone https://github.com/StoryForgeApp/storyforge.git
cd storyforge

# Install dependencies
bun install
```

## Development

### Start with HMR (Recommended)

```bash
bun run dev:hmr
```

This starts:

- Vite dev server on `http://localhost:5173` with HMR
- Electrobun in watch mode
- Changes to React components update instantly without reload

### Start without HMR

```bash
bun run dev
```

Uses bundled assets. Requires rebuilding (`bun run build`) to see changes.

### Linting & Formatting

```bash
# Check code quality
bun run lint

# Fix and format code
bun run format
```

## Building

```bash
# Development build
bun run build:dev

# Canary build (for testing)
bun run build:canary

# Stable release build
bun run build:stable
```

Built applications are output to the `dist/` directory.

## Project Structure

```
storyforge/
├── src/
│   ├── bun/                    # Main process (Electrobun/Bun backend)
│   │   ├── index.ts           # Application entry point
│   │   └── controllers/       # RPC handlers for different features
│   │       ├── installations.ts
│   │       ├── mods.ts
│   │       ├── versions.ts
│   │       └── ...
│   ├── mainview/              # React frontend
│   │   ├── routes/           # TanStack Router file-based routes
│   │   ├── components/       # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # Zustand stores
│   │   └── main.tsx         # React entry point
│   └── lib/
│       └── utils.ts         # Utility functions
├── electrobun.config.ts     # Electrobun configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json
```

## Architecture

Story Forge uses a multi-process architecture:

- **Main Process (Bun)**: Handles file system operations, game process management, and native APIs
- **Renderer Process (React)**: Provides the user interface
- **RPC Layer**: Type-safe communication between main and renderer via Electrobun's RPC system

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTE.md) for details on:

- Code of Conduct
- Development workflow
- Submitting pull requests
- Reporting issues

## License

[GNU GPLv3 License](LICENSE.md)

## Acknowledgments

- [Vintage Story](https://www.vintagestory.at/) - The amazing survival crafting game
- [Electrobun](https://github.com/blackboardsh/electrobun) - The Bun-powered desktop framework
- [TanStack](https://tanstack.com/) - Excellent React utilities

## Support

- [GitHub Issues](https://github.com/StoryForgeApp/storyforge/issues) - Bug reports and feature requests
- [Discord](https://discord.gg/gByx63peUC) - Community chat and support
