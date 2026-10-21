r"""Copy Kim's TAG Brain (the Obsidian vault) into the desktop vault as library pages.

  python tools/import_brain.py        (build_desktop.py runs this for you)

Reads  ..\TAG Brain\**\*.md   (Obsidian notes, read-only)
Writes data/brain/library/brain-*.json   (one page per note; wipes the folder first)

Each note becomes a page in the "TAG Brain" sidebar section. Top folders become categories,
subfolders become groups. [[Wikilinks]] become in-vault links. Edit notes in Obsidian, then rebuild.
"""
import hashlib, io, json, re, shutil
import previews
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRAIN = ROOT.parent / "TAG Brain"
OUT = ROOT / "data" / "brain" / "library"
WORK = ROOT.parent.resolve()
SOURCES_JS = ROOT / "data" / "sources.js"

CATS = {  # top folder (or client folder) -> vault category id
    "10 Clients/Pipeliners": "brain-pipeliners",
    "10 Clients/Alphalete Trenchless": "brain-alphalete",
    "10 Clients/Summit Plumbing Pros AZ": "brain-summit",
    "10 Clients/Prestige Plumbing": "brain-prestige",
    "20 SOPs and Guides": "brain-sops",
    "30 Learning": "brain-learning",
    "40 Trackers and Logs": "brain-trackers",
    "50 EOD Reports": "brain-eod",
    "60 Tools and Integrations": "brain-tools",
    "70 Projects": "brain-projects",
    "99 Meta": "brain-home",
}
SKIP = ("00 Inbox", "99 Meta/Templates", ".obsidian")
MONTHS = "January February March April May June July August September October November December".split()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:90]


def place(rel):
    """(category id, group) for a note path relative to the brain root."""
    parts = rel.parts
    if len(parts) == 1:
        return "brain-home", ""
    for depth in (2, 1):
        key = "/".join(parts[:depth])
        if key in CATS:
            sub = parts[depth:-1]
            return CATS[key], sub[0] if sub else ""
    return None, ""


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n?", text, re.S)
    if not m:
        return {}, text
    meta = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        meta[k.strip()] = v.strip().strip("'\"")
    return meta, text[m.end():]


def main():
    notes = [p for p in BRAIN.rglob("*.md") if not any(str(p.relative_to(BRAIN).as_posix()).startswith(s) for s in SKIP)]
    ids, seen = {}, set()
    for p in notes:
        i = "brain-" + slug(p.stem)
        while i in seen:
            i += "-x"
        seen.add(i)
        ids[p.stem.lower()] = i

    def link(m):
        target, alias = m.group(1).split("#")[0].strip(), (m.group(2) or "").strip()
        i = ids.get(target.split("/")[-1].removesuffix(".md").lower())
        label = alias or target
        return f"[{label}](lib:{i})" if i else label

    sources = set()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    count = 0
    for p in notes:
        rel = p.relative_to(BRAIN)
        cat, group = place(rel)
        if not cat:
            continue
        if cat == "brain-eod":
            m = re.search(r"(\d{4})-(\d{2})", p.stem)
            group = f"{m.group(1)}-{m.group(2)} {MONTHS[int(m.group(2)) - 1]}" if m else ""
        text = io.open(p, encoding="utf-8").read().replace("\r", "")
        meta, body = frontmatter(text)
        body = re.sub(r"^#\s+.*\n?", "", body.lstrip("\n"), count=1)          # title shows as the page heading
        body = re.sub(r"!\[\[[^\]]*\]\]", "", body)                            # embeds
        body = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]*))?\]\]", link, body)
        body = re.sub(r"\s*\(\[[^\]]*\]\(file:///[^)]*\)\)", "", body)                 # "([open](file:///...))" after a path
        body = re.sub(r"\[([^\]]*)\]\(file:///[^)]*\)", r"\1", body)                     # other links to files on this PC: keep the words
        body = re.sub(r"^\s*Sources?:[^\n]*\n?", "", body, count=1, flags=re.M)          # the source shows as a card in the vault instead
        body = re.sub(r"^```.*$", "", body, flags=re.M)
        body = re.sub(r"^(#{2,4})\s", lambda h: "#" * (len(h.group(1)) - 1) + " ", body, flags=re.M)
        info = " · ".join(x for x in (meta.get("type", "").title(), meta.get("client", "").replace("-", " ").title() if meta.get("client") not in ("", "none", "all") else "", meta.get("date", "")) if x)
        body = (f"> {info}\n\n" if info else "") + body.strip() + "\n"
        mtime = int(p.stat().st_mtime * 1000)
        src = rel_source(meta.get("source", ""))
        if src is not None:
            sources.add(src)
        page = {"name": p.stem, "cat": cat, "group": group, "body": body, "images": [], "videos": [],
                "source": "brain", "src": src, "date": meta.get("date", ""), "createdAt": born(p.stat()), "updatedAt": mtime}
        page["rev"] = hashlib.sha1(json.dumps(page, sort_keys=True).encode("utf-8")).hexdigest()[:12]
        io.open(OUT / (ids[p.stem.lower()] + ".json"), "w", encoding="utf-8", newline="\n").write(json.dumps(page, ensure_ascii=False, indent=1))
        count += 1
    write_sources(sources)
    print(f"TAG Brain: {count} notes imported into {OUT}, {len(sources)} source paths listed in {SOURCES_JS.name}")


def rel_source(path):
    """'C:\\TAG Marketing Claude\\Pipeliners\\x' -> 'Pipeliners/x' (None when it is outside the work folder or missing)."""
    path = path.strip().strip("'\"")
    if not path:
        return None
    try:
        rel = Path(path).resolve().relative_to(WORK)
    except (ValueError, OSError):
        return None
    return rel.as_posix() if rel.as_posix() != "." else ""


def born(st):
    """Date created in ms (Windows keeps a real creation time; fall back to the change time elsewhere)."""
    return int(getattr(st, "st_birthtime", st.st_ctime) * 1000)


def hidden(name):
    return name.startswith((".", "~$")) or name in ("node_modules", "__pycache__") or name.lower().startswith(".env")


def listing(rel):
    """One level of a folder (or a single file's details) for the vault's Source window. Names, sizes and dates only, never contents."""
    p = WORK / rel
    if p.is_file():
        st = p.stat()
        return {"k": "file", "s": st.st_size, "m": int(st.st_mtime * 1000), "b": born(st)}
    if not p.is_dir():
        return {"k": "missing"}
    items = []
    for c in sorted(p.iterdir(), key=lambda c: (not c.is_dir(), c.name.lower())):
        if hidden(c.name):
            continue
        try:
            st = c.stat()
            items.append({"n": c.name, "d": 1, "c": sum(1 for x in c.iterdir() if not hidden(x.name)), "m": int(st.st_mtime * 1000), "b": born(st)} if c.is_dir()
                         else {"n": c.name, "s": st.st_size, "m": int(st.st_mtime * 1000), "b": born(st)})
        except OSError:
            continue
    return {"k": "dir", "total": len(items), "items": items[:300]}


def write_sources(sources):
    out = {}
    for rel in sorted(sources):
        out[rel] = listing(rel)
        if out[rel]["k"] == "dir":  # one level of subfolders too, so Kim can step into them
            for it in out[rel]["items"]:
                if it.get("d"):
                    sub = f"{rel}/{it['n']}" if rel else it["n"]
                    out.setdefault(sub, listing(sub))
    # in-vault previews ("pv") so files open inside the vault, also once it is deployed (tools/previews.py)
    previews.start()
    for rel, info in out.items():
        if info["k"] == "file":
            info["pv"] = previews.preview(WORK, rel)
        elif info["k"] == "dir":
            for it in info["items"]:
                if not it.get("d"):
                    it["pv"] = previews.preview(WORK, f"{rel}/{it['n']}" if rel else it["n"])
    count, size = previews.finish()
    print(f"Previews: {count} files, {size / 1e6:.1f} MB in files/ and previews/")
    SOURCES_JS.write_text("/* Generated by tools/import_brain.py. File names, sizes, dates and preview ids for TAG Brain source links. */\n"
                          f"window.VAULT_SOURCES = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")


if __name__ == "__main__":
    main()
