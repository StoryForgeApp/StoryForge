# Application Logging System Design

**Goal:** Replace all 108 ad-hoc `console.*` calls with a structured logger that writes JSON Lines to appdata files with rotation, and exposes logs in a new `/logs` UI page.

## Logger API

```typescript
log.debug(category, message, data?)
log.info(category, message, data?)
log.warn(category, message, data?)
log.error(category, message, data?)
```

Categories: `general | installations | downloads | mods | dotnet | servers | versions | worlds | utils`
Levels: `debug | info | warn | error`

## Storage

- **Format:** JSON Lines (`.jsonl`) — one `LogEntry` JSON per line
- **Location:** `{appData}/storyforge/logs/`
- **Files:** `storyforge.log` (current, ≤5MB), `storyforge.1.log`, `storyforge.2.log`
- **Rotation:** When current file exceeds 5MB, rename chain and create new file. Max 3 files.

## Frontend

- New route `/logs` with sidebar entry "Logs"
- Tab filters: All / Debug / Info / Warn / Error (with counts)
- Category filter dropdown
- Scrollable log list, color-coded by level, newest first
- Clear button (deletes all log files)
- Auto-refresh via polling (5s)
- Existing `/installations/logs?path=...` game log viewer stays untouched

## Mirroring

- Backend: writes to both file and `console.*` (dev output)
- Frontend: sends log entries to backend for file persistence + mirrors to `console.*`
