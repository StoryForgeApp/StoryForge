# .NET Runtime Auto-Install Design

**Goal:** When Vintage Story requires a .NET runtime not present on the system, offer to download and install it automatically into `~/.dotnet`, then launch the game.

## Version Mapping

| Vintage Story Version | Required .NET Runtime |
| --------------------- | --------------------- |
| >= 1.22.x             | 10.0                  |
| 1.21.x                | 8.0                   |
| < 1.21.x              | 7.0                   |

## Architecture

```
playWithInstallation()
  → determine dotnet version from game version
  → checkDotnet(version)
    ├── PATH check: `dotnet --list-runtimes`
    └── Local cache check: ~/.dotnet/shared/Microsoft.NETCore.App/<version>/
  → not found → return { needsDotnet: true, version }
  → frontend shows modal dialog
  → user clicks Install → downloadDotnet(version)
  → progress messages update dialog
  → completed → retry playWithInstallation
  → spawn with DOTNET_ROOT=~/.dotnet
```

## Download Source

Microsoft CDN: `https://dotnetcli.azureedge.net/dotnet/Runtime/<version>/dotnet-runtime-<version>-<os>-<arch>.tar.gz`

Resolve latest patch version via release metadata API:
`https://dotnetcli.azureedge.net/dotnet/release-metadata/<major>.0/releases.json`

## Files

| File                                                | Purpose                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/bun/controllers/dotnet.ts`                     | NEW: `checkDotnet`, `downloadDotnet` endpoints + progress/status messages                    |
| `src/bun/controllers/installations.ts`              | Modify: `playWithInstallation` — version→dotnet mapping, check before spawn, set DOTNET_ROOT |
| `src/shared/rpc.ts`                                 | Add `DotnetController` to types                                                              |
| `src/mainview/components/dotnet/install-dialog.tsx` | NEW: Modal with prompt → download progress → done                                            |
| `src/mainview/routes/installations/index.tsx`       | Modify: wire dialog into play flow                                                           |
| `src/mainview/routes/installations/worlds.tsx`      | Modify: wire dialog into play flow                                                           |

## Frontend States

1. **Prompt:** Title, version info, size estimate, Install/Skip buttons
2. **Downloading:** Progress bar + speed (reuse existing download progress patterns)
3. **Extracting:** Spinner + "Extracting..."
4. **Done:** Brief success + auto-dismiss + auto-launch
5. **Error:** Error message + Close button
