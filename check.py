#!/usr/bin/env python3
"""Validate marketplace.json + every manifest. Run before pushing.

Mirrors Seanime's server-side sanity checks (internal/extension_repo/utils.go):
the server silently drops marketplace entries and rejects manifests, so catch
it here instead of in the app.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
ID_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$")
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
TYPES = {"plugin", "anime-torrent-provider", "manga-provider", "onlinestream-provider", "custom-source"}
LANGS = {"typescript", "javascript", "go"}

errors: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        errors.append(msg)


mp = json.loads((ROOT / "marketplace.json").read_text())
check(isinstance(mp, list), "marketplace.json must be a JSON array (the {'urls': [...]} form skips plugins)")

seen = set()
for e in mp:
    check(bool(e.get("id")) and bool(e.get("manifestURI")),
          f"marketplace entry needs non-empty id + manifestURI: {e.get('name') or e}")
    check(e.get("id") not in seen, f"duplicate id in marketplace.json: {e.get('id')}")
    seen.add(e.get("id"))

manifests = sorted((ROOT / "plugins").glob("*/*.json"))
for path in manifests:
    m = json.loads(path.read_text())
    where = str(path.relative_to(ROOT))
    check(path.stem == m.get("id"), f"{where}: filename must equal id ({m.get('id')})")
    for f in ("id", "name", "version", "language", "type", "author"):
        check(bool(m.get(f)), f"{where}: missing required field '{f}'")
    eid = m.get("id", "") or ""
    check(ID_RE.match(eid) and 3 <= len(eid) <= 40,
          f"{where}: invalid id (3-40 chars, letters/digits/'-', starts with a letter)")
    check(len(m.get("name", "")) <= 50, f"{where}: name over 50 chars")
    check(len(m.get("author", "")) <= 25, f"{where}: author over 25 chars")
    check(bool(SEMVER_RE.match(m.get("version", "") or "")), f"{where}: version must be x.y.z")
    check(m.get("language") in LANGS, f"{where}: language must be one of {sorted(LANGS)}")
    check(m.get("type") in TYPES, f"{where}: type must be one of {sorted(TYPES)}")
    check(bool(m.get("payload") or m.get("payloadURI")), f"{where}: needs payload or payloadURI")
    if m.get("type") == "plugin":
        check(m.get("plugin", {}).get("version") == "1", f"{where}: plugin.version must be exactly '1'")
    if m.get("isDevelopment"):
        errors.append(f"{where}: isDevelopment must not be set in a published manifest")
    else:
        check(eid in m.get("payloadURI", ""), f"{where}: payloadURI should point at plugins/{eid}/code.ts")
        check(bool(m.get("manifestURI")), f"{where}: manifestURI required for update checks")
    check(eid in seen, f"{where}: not listed in marketplace.json")

if errors:
    print("\n".join("FAIL " + e for e in errors))
    sys.exit(1)
print(f"OK: {len(mp)} marketplace entries, {len(manifests)} manifests")
