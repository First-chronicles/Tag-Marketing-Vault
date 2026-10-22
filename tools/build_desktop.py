r"""Build the desktop copy of Kim's Tag Marketing Vault from the online vault's source.

  python tools/build_desktop.py

Reads  src/vault-artifact.html  (the exact page published to claude.ai)
       data/live/<collection>/*.json  (vault data exported from the online vault)
       ..\TAG Brain\**\*.md  (via tools/import_brain.py -> data/brain/library, the "TAG Brain" section)
       assets/*  (images; file name = asset id + extension)
Writes index.html, css/vault.css, js/vault.js, data/seed.js
Open index.html in Chrome or Edge. Videos play from their file paths on this PC.
"""
import hashlib, io, json, re, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = io.open(ROOT / "src" / "vault-artifact.html", encoding="utf-8").read()

title = re.search(r"<title>(.*?)</title>", src, re.S).group(1)
css = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
js = re.search(r"<script>(.*?)</script>", src, re.S).group(1)
body = src[src.index("</style>") + len("</style>"):src.index("<script>")].strip()

(ROOT / "css").mkdir(exist_ok=True)
(ROOT / "js").mkdir(exist_ok=True)
io.open(ROOT / "css" / "vault.css", "w", encoding="utf-8", newline="\n").write(css.strip() + "\n")
io.open(ROOT / "js" / "vault.js", "w", encoding="utf-8", newline="\n").write(js.strip() + "\n")

COLS = {"prompts": "prompts", "folders": "folders", "loginSheet": "sheet", "loginRows": "rows", "tasks": "tasks", "library": "library"}
import import_brain  # refresh data/brain from the TAG Brain Obsidian vault first
if import_brain.BRAIN.exists():
    import_brain.main()

seed = {}
for col, key in COLS.items():
    seed[key] = {}
    for base in ("live", "brain"):
        d = ROOT / "data" / base / col
        if d.exists():
            seed[key].update({f.stem: json.loads(f.read_text(encoding="utf-8")) for f in sorted(d.glob("*.json"))})
removed_file = ROOT / "data" / "removed.json"  # pages taken out of the desktop vault: kept in data/live, dropped from the seed and from browsers on next open
removed = {k: v for k, v in (json.loads(removed_file.read_text(encoding="utf-8")) if removed_file.exists() else {}).items() if isinstance(v, list)}
for key, ids in removed.items():
    for i in ids:
        seed.get(key, {}).pop(i, None)
videos_file = ROOT / "data" / "videos.json"  # online links for lesson videos, matched by file name; empty means keep the PC file
video_links = {k: v.strip() for k, v in (json.loads(videos_file.read_text(encoding="utf-8")).get("videos", {}) if videos_file.exists() else {}).items() if isinstance(v, str) and v.strip()}
for page in seed.get("library", {}).values():
    vids = page.get("videos") or []
    for v in vids:
        name = re.split(r"[\\/]", str(v.get("path", "")))[-1]
        if name in video_links:
            v["path"] = video_links[name]
            v["title"] = v.get("title") or name.rsplit(".", 1)[0]
    if vids:
        page["vrev"] = hashlib.sha1(json.dumps(vids, sort_keys=True).encode("utf-8")).hexdigest()[:12]
def lesson_thumbs():
    """A thumbnail per video lesson, cut from the frames the transcriber saved (Video Notes/<course>/<Module>/<Lesson>/frames)."""
    notes_root = ROOT.parent / "Video Notes"
    out_dir = ROOT / "theme" / "thumbs"
    if not notes_root.exists():
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    folders = {p.name: p for p in notes_root.glob("*/*/*") if (p / "frames").is_dir()}
    for pid, page in seed.get("library", {}).items():
        for v in page.get("videos") or []:
            name = re.split(r"[\\/]", str(v.get("path", "")))[-1].rsplit(".", 1)[0]
            folder = folders.get(name) or folders.get(str(v.get("title", "")))
            if not folder:
                continue
            frames = sorted((folder / "frames").glob("*.jpg"))
            if not frames:
                continue
            out = out_dir / f"{pid}.webp"
            from PIL import Image, ImageStat
            def detail(f):  # pick the busiest early frame, so a blank slide never becomes the thumbnail
                with Image.open(f) as im:
                    return sum(ImageStat.Stat(im.convert("L").resize((160, 90))).stddev)
            pick = max(frames[: max(2, len(frames) // 2)], key=detail)
            if not out.exists() or out.stat().st_mtime < pick.stat().st_mtime or out.stat().st_size == 0 or page.get("_rethumb"):
                with Image.open(pick) as im:
                    w, h = im.size
                    im = im.convert("RGB").crop((0, 0, w, int(h * 0.955)))  # drop the recorded player bar
                    im.thumbnail((640, 360))
                    im.save(out, "WEBP", quality=78)
            page["thumb"] = f"theme/thumbs/{pid}.webp"
            break


lesson_thumbs()
glossary_file = ROOT / "data" / "glossary.json"  # the Glossary view (definition of terms), grouped
glossary = json.loads(glossary_file.read_text(encoding="utf-8")).get("groups", []) if glossary_file.exists() else []
assets = {f.stem: "assets/" + f.name for f in sorted((ROOT / "assets").glob("*")) if f.is_file()}
version = int(time.time())
io.open(ROOT / "data" / "seed.js", "w", encoding="utf-8", newline="\n").write(
    "/* Generated by tools/build_desktop.py. Starting data for the desktop vault. */\n"
    f"window.VAULT_SEED_VERSION = {version};\n"
    f"window.VAULT_ASSETS = {json.dumps(assets, ensure_ascii=False)};\n"
    f"window.VAULT_REMOVED = {json.dumps(removed)};\n"
    f"window.VAULT_GLOSSARY = {json.dumps(glossary, ensure_ascii=False)};\n"
    f"window.VAULT_SEED = {json.dumps(seed, ensure_ascii=False, indent=1)};\n")

sources_tag = '<script src="data/sources.js"></script>\n' if (ROOT / "data" / "sources.js").exists() else ""  # TAG Brain source listings (tools/import_brain.py)
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} (Desktop)</title>
<link rel="stylesheet" href="css/vault.css">
</head>
<body>
{body}
<script src="data/seed.js"></script>
{sources_tag}<script src="js/vault.js"></script>
</body>
</html>
"""
io.open(ROOT / "index.html", "w", encoding="utf-8", newline="\n").write(html)
counts = {k: len(v) for k, v in seed.items()}
print("Built desktop vault:", ROOT / "index.html")
print("Seed:", counts, "| assets:", len(assets), "| version:", version)
