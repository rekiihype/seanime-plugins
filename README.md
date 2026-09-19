# seanime-plugins

My Seanime extension marketplace.

Point Seanime at it: **Extensions page → marketplace URL field** →

```
https://raw.githubusercontent.com/rekiihype/seanime-plugins/main/marketplace.json
```

(Leave it empty to go back to the official repo.)

## Add a plugin

1. `mkdir plugins/<id>` — add `code.ts` (entry `init()`) and `<id>.json` (manifest, filename must equal the id).
2. Add an entry to `marketplace.json` with `id` + `manifestURI`.
3. `python3 check.py` — mirrors the server's sanity checks; run before pushing.
4. To ship an update: bump `version` in the manifest. Never change `id`.

## Dev loop

Manifest with `"isDevelopment": true` + absolute `"payloadURI"` → drop it in the
server's `extensions/` dir (`~/.config/Seanime/extensions/` on Linux) → reload
from the Extensions page. Dev extensions hot-reload and cannot be installed remotely.

## Notes

- Type definitions aren't tracked (they're 186 KB of third-party files). Fetch
  them once for editor typing:

  ```bash
  for f in app plugin system core; do
    curl -sL "https://raw.githubusercontent.com/5rahim/seanime-extensions/main/$f.d.ts" -o "$f.d.ts"
  done
  ```

  `/// <reference path="../../app.d.ts" />` in your code.ts then gives full typing.
- Repo must be public for `raw.githubusercontent.com` URLs to work.
- Icons are optional (empty `icon` shows the first letter).
- Only the **marketplace** array format works for plugins; the `{"urls": [...]}`
  repository format skips them server-side.
