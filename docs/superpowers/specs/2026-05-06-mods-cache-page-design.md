# Mods Cache Page Design

**Goal:** Settings sub-page showing cached mods with size/status, detect and remove orphaned mods.

**Backend:** `getCachedMods()` scans `cache.json` + `mods_cache/` dir, checks all installation `Mods/` dirs for inode matches. `removeOrphanedMods()` deletes orphaned files + cleans `cache.json`.

**Frontend:** `/settings/` becomes menu listing sub-pages. `/settings/mods-cache` shows list with size, status (in-use/orphaned), "Remove All Orphaned" button.

**Orphan detection:** Compare cached file inodes against all installation Mods/ file inodes. Hardlinks share inodes — if no installation has a file with the same inode, the cache entry is orphaned.
