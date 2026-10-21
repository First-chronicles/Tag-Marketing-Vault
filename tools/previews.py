r"""In-vault previews of the source files TAG Brain notes point to, so files open inside the vault (also once it is deployed).

Called by tools/import_brain.py. For each listed file it makes one of:
  files/<id>.pdf | .webp | .svg | .html   (copied or resized, shown in the viewer)
  previews/<id>.js                          (text, table or document data, loaded with a <script> tag so it also works from file://)
and returns {"t": type, "h": id} for the vault's Source window, or {"x": reason} when the file is left out.
Types: m markdown, c code/plain text, g table (csv/tsv/xlsx), d document (docx/pptx turned into markdown), p pdf, i image, w web page.
Never copied: secrets (.env, credentials, keys, tokens), videos, archives, raw page backups, files over the size caps.
Outputs are cached by path + size + date, and files no longer listed are removed at the end of each build.
"""
import csv, hashlib, io, json, re, shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES, PREV = ROOT / "files", ROOT / "previews"
SECRET_NAME = re.compile(r"(^\.env|secret|credential|token|oauth|password|passwd|\.pem$|\.key$|id_rsa|id_ed25519|settings\.local|adc\.json)", re.I)
SECRET_TEXT = re.compile(r"(pit-[0-9a-f-]{20,}|sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"
                         r"|(?i:(?:api[_-]?key|token|secret|password|passwd|pwd|client_secret|refresh_token|developer_token)\s*[:=]\s*)\S+)")
BACKUP_DIR = re.compile(r"(^|/)(backups?|fix-backups|live|live_m|before|after|html|_epipe_imgs|wp-staging|otto-faq-backup)(/|$)", re.I)
TEXT = {".md": "m", ".txt": "c", ".log": "c", ".py": "c", ".js": "c", ".ts": "c", ".php": "c", ".ps1": "c", ".sh": "c", ".json": "c", ".xml": "c", ".css": "c", ".sql": "c", ".yml": "c", ".yaml": "c"}
IMAGES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_TEXT, MAX_PDF, MAX_HTML, MAX_ROWS, MAX_COLS = 400_000, 25_000_000, 1_500_000, 400, 40
made = set()


def pid(rel):
    return hashlib.sha1(rel.encode("utf-8")).hexdigest()[:16]


def redact(t):
    return SECRET_TEXT.sub("[redacted]", t)


def fresh(out, src):
    """True when out exists and is newer than src (cache hit)."""
    return out.exists() and out.stat().st_mtime >= src.stat().st_mtime


def write_js(h, data):
    out = PREV / f"{h}.js"
    out.write_text(f"window.__vaultPreview({json.dumps(h)},{json.dumps(data, ensure_ascii=False, separators=(',', ':'))});\n", encoding="utf-8")
    made.add(out)


def table_rows(rows):
    rows = [[("" if v is None else str(v))[:300] for v in r[:MAX_COLS]] for r in rows]
    while rows and not any(c.strip() for c in rows[-1]):
        rows.pop()
    return rows


def docx_md(p):
    import docx
    d, out = docx.Document(str(p)), []
    body = d.element.body
    paras = {id(x._p): x for x in d.paragraphs}
    tables = {id(x._tbl): x for x in d.tables}
    for el in body.iterchildren():
        if id(el) in paras:
            x = paras[id(el)]
            t = x.text.strip()
            if not t:
                continue
            st = (x.style.name or "").lower() if x.style is not None else ""
            m = re.search(r"heading\s*(\d)", st)
            if m or st == "title":
                out.append("#" * min(3, int(m.group(1)) if m else 1) + " " + t)
            elif "list" in st:
                out.append("- " + t)
            else:
                out.append(t)
            out.append("")
        elif id(el) in tables:
            for r in tables[id(el)].rows:
                out.append("| " + " | ".join(c.text.strip().replace("|", "/").replace("\n", " ") for c in r.cells) + " |")
            out.append("")
    return "\n".join(out)


def pptx_md(p):
    out = []
    with zipfile.ZipFile(p) as z:
        slides = sorted((n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)), key=lambda n: int(re.findall(r"\d+", n)[0]))
        for i, n in enumerate(slides, 1):
            texts = [t for t in re.findall(r"<a:t>([^<]*)</a:t>", z.read(n).decode("utf-8", "replace")) if t.strip()]
            out += [f"## Slide {i}", ""] + [f"- {t}" for t in texts] + [""]
    return "\n".join(out)


def preview(work, rel):
    """Preview record for one file (rel is relative to the work folder), making its output if needed."""
    src = work / rel
    name, ext = src.name, src.suffix.lower()
    if SECRET_NAME.search(name):
        return {"x": "Private file (credentials or keys). Not copied into the vault."}
    try:
        size = src.stat().st_size
    except OSError:
        return {"x": "File could not be read."}
    h = pid(rel)
    try:
        if ext in TEXT:
            if size > MAX_TEXT:
                return {"x": "Too large to preview (data or log dump)."}
            out = PREV / f"{h}.js"
            if not fresh(out, src):
                write_js(h, {"text": redact(src.read_text(encoding="utf-8", errors="replace"))})
            made.add(out)
            return {"t": TEXT[ext], "h": h}
        if ext in (".csv", ".tsv"):
            out = PREV / f"{h}.js"
            if not fresh(out, src):
                with io.open(src, encoding="utf-8-sig", errors="replace", newline="") as f:
                    rows = list(csv.reader(f, delimiter="\t" if ext == ".tsv" else ","))
                write_js(h, {"sheets": [{"name": name, "total": len(rows), "rows": table_rows(rows[:MAX_ROWS])}]})
            made.add(out)
            return {"t": "g", "h": h}
        if ext == ".xlsx":
            out = PREV / f"{h}.js"
            if not fresh(out, src):
                import openpyxl
                wb = openpyxl.load_workbook(str(src), read_only=True, data_only=True)
                sheets = []
                for ws in wb.worksheets:
                    rows = [list(r) for _, r in zip(range(MAX_ROWS), ws.iter_rows(values_only=True))]
                    sheets.append({"name": ws.title, "total": ws.max_row or len(rows), "rows": table_rows(rows)})
                write_js(h, {"sheets": sheets})
            made.add(out)
            return {"t": "g", "h": h}
        if ext in (".docx", ".pptx"):
            out = PREV / f"{h}.js"
            if not fresh(out, src):
                write_js(h, {"text": redact(docx_md(src) if ext == ".docx" else pptx_md(src))})
            made.add(out)
            return {"t": "d", "h": h}
        if ext == ".pdf":
            if size > MAX_PDF:
                return {"x": "PDF too large to include (over 25 MB)."}
            out = FILES / f"{h}.pdf"
            if not fresh(out, src):
                shutil.copy2(src, out)
            made.add(out)
            return {"t": "p", "h": h, "f": out.name}
        if ext in IMAGES:
            out = FILES / f"{h}.webp"
            if not fresh(out, src):
                from PIL import Image
                with Image.open(src) as im:
                    im = im.convert("RGBA") if im.mode in ("P", "LA") else im
                    im.thumbnail((1600, 1600))
                    im.save(out, "WEBP", quality=74, method=4)
            made.add(out)
            return {"t": "i", "h": h, "f": out.name}
        if ext == ".svg" and size < 500_000:
            out = FILES / f"{h}.svg"
            if not fresh(out, src):
                shutil.copy2(src, out)
            made.add(out)
            return {"t": "i", "h": h, "f": out.name}
        if ext == ".html":
            if BACKUP_DIR.search(rel) or name.startswith(("_", "backup")) or "backup" in name.lower():
                return {"x": "Raw page backup. Kept on the PC only."}
            if size > MAX_HTML:
                return {"x": "Web page too large to include."}
            out = FILES / f"{h}.html"
            if not fresh(out, src):
                shutil.copy2(src, out)
            made.add(out)
            return {"t": "w", "h": h, "f": out.name}
    except Exception as e:  # a broken file should never stop the build
        return {"x": f"Preview could not be made ({type(e).__name__})."}
    if ext in (".mp4", ".mov", ".webm"):
        return {"x": "Video. Kept on the PC only."}
    if ext in (".zip", ".bin", ".pyc", ".ttf", ".woff", ".woff2"):
        return {"x": "No preview for this kind of file."}
    return {"x": "No preview for this kind of file."}


def start():
    FILES.mkdir(exist_ok=True)
    PREV.mkdir(exist_ok=True)
    made.clear()


def finish():
    """Remove outputs for files that are no longer listed; return (count, bytes)."""
    for d in (FILES, PREV):
        for f in d.iterdir():
            if f not in made:
                f.unlink()
    return len(made), sum(f.stat().st_size for f in made)
