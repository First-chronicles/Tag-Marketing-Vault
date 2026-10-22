(function () {
  "use strict";

  const CLIENTS = ["All clients", "Pipeliners", "Alphalete", "Summit AZ"];
  const CATEGORIES = ["SEO Prompts", "Content Writing", "Keyword Research", "Website Development", "Image & Video Generation", "AI Agent Prompts"];
  const LEGACY_CAT = { "SEO research": "SEO Prompts", "Keywords": "Keyword Research", "Content": "Content Writing", "GBP": "Content Writing", "Google Ads": "SEO Prompts", "Reporting": "SEO Prompts", "Other": "SEO Prompts" };
  const promptCat = (c) => CATEGORIES.includes(c) ? c : (LEGACY_CAT[c] || "SEO Prompts");
  /* Sidebar structure. kind: pages (doc pages), prompts (prompt categories), sheet (editable tables) */
  const TREE = [
    /* TAG Brain: notes imported from Kim's Obsidian vault (tools/import_brain.py); groups are the vault's subfolders */
    { id: "brain", name: "TAG Brain", kind: "pages", cats: [
      ["brain-home", "Home"], ["brain-pipeliners", "Pipeliners"], ["brain-alphalete", "Alphalete Trenchless"], ["brain-summit", "Summit Plumbing Pros AZ"],
      ["brain-prestige", "Prestige Plumbing"], ["brain-sops", "SOPs and Guides"], ["brain-learning", "Learning"], ["brain-trackers", "Trackers and Logs"],
      ["brain-eod", "EOD Reports"], ["brain-tools", "Tools and Integrations"], ["brain-projects", "Projects"]] },
    { id: "learning", name: "Learning Center", kind: "pages", cats: [
      ["local-seo", "Local SEO"], ["traditional-seo", "Traditional SEO"], ["ai-seo", "AI SEO (AEO & GEO)"], ["google-ads", "Google Ads"],
      ["web-dev", "Web Development"], ["ai-lessons", "AI & Automation Lessons"], ["analytics", "Analytics & Reporting"]] },
    { id: "skool", name: "Skool Lessons", kind: "pages", cats: [["skool-local-seo", "Local SEO"]] },
    { id: "workflows", name: "Workflows & SOPs", kind: "pages", cats: [
      ["seo-workflows", "SEO Workflows"], ["content-optimization", "Content Optimization"], ["website-optimization", "Website Optimization"],
      ["gbp-management", "GBP Management"], ["reporting-processes", "Reporting Processes"], ["automation-workflows", "Automation Workflows"]] },
    { id: "ai", name: "AI & Automations", kind: "pages", cats: [
      ["ai-agents", "AI Agents"], ["claude-projects", "Claude Projects"], ["automation-templates", "Automation Templates"],
      ["n8n-workflows", "n8n Workflows"], ["ai-tools", "AI Tools & Integrations"]] },
    { id: "prompts", name: "Prompt Library", kind: "prompts", cats: CATEGORIES.map((c) => [c, c]) },
    { id: "resources", name: "Resources & Templates", kind: "pages", cats: [
      ["seo-checklists", "SEO Checklists"], ["reporting-templates", "Reporting Templates"], ["gbp-templates", "GBP Templates"],
      ["audit-templates", "Audit Templates"], ["research-templates", "Research Templates"], ["tools-links", "Useful Tools & Links"]] },
    { id: "private", name: "Private", kind: "sheet", cats: [["login", "Login Credentials"], ["accounts", "Platform Accounts"]] }
  ];
  const CAT_INFO = {};
  TREE.forEach((sec) => sec.cats.forEach(([id, name]) => { if (sec.kind === "pages") CAT_INFO[id] = { id, name, section: sec }; }));
  const LEGACY_SECTION_CAT = { lessons: "local-seo", library: "audit-templates", notes: "seo-workflows" };
  const catOf = (pg) => (pg.cat && CAT_INFO[pg.cat]) ? pg.cat : (LEGACY_SECTION_CAT[pg.section || "library"] || "seo-workflows");
  const treeState = { secClosed: new Set(), catOpen: new Set(), modOpen: new Set(), showEmpty: false };
  try { const t = JSON.parse(localStorage.getItem("pl-tree") || "{}"); (t.secClosed || []).forEach((x) => treeState.secClosed.add(x)); (t.catOpen || []).forEach((x) => treeState.catOpen.add(x)); (t.modOpen || []).forEach((x) => treeState.modOpen.add(x)); treeState.showEmpty = !!t.showEmpty; } catch (e) {}
  const saveTree = () => { try { localStorage.setItem("pl-tree", JSON.stringify({ secClosed: [...treeState.secClosed], catOpen: [...treeState.catOpen], modOpen: [...treeState.modOpen], showEmpty: treeState.showEmpty })); } catch (e) {} };
  const MAX_VERSIONS = 20;

  /* Line icons (16px, stroke = currentColor) */
  const svg = (d, extra = "") => `<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const I = {
    search: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4L14 14"/>'),
    plus: svg('<path d="M8 3v10M3 8h10"/>'),
    copy: svg('<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4A1.5 1.5 0 0 1 4.5 2.5H11"/>'),
    more: svg('<circle cx="3.5" cy="8" r=".6" fill="currentColor"/><circle cx="8" cy="8" r=".6" fill="currentColor"/><circle cx="12.5" cy="8" r=".6" fill="currentColor"/>', 'stroke-width="1.6"'),
    history: svg('<circle cx="8" cy="8" r="5.8"/><path d="M8 4.8V8l2.2 1.4"/>'),
    close: svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
    back: svg('<path d="M10 3.5L5.5 8l4.5 4.5"/>'),
    grip: svg('<circle cx="6" cy="4" r=".5" fill="currentColor"/><circle cx="10" cy="4" r=".5" fill="currentColor"/><circle cx="6" cy="8" r=".5" fill="currentColor"/><circle cx="10" cy="8" r=".5" fill="currentColor"/><circle cx="6" cy="12" r=".5" fill="currentColor"/><circle cx="10" cy="12" r=".5" fill="currentColor"/>', 'stroke-width="1.6"'),
    eye: svg('<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>'),
    eyeOff: svg('<path d="M2 2l12 12M6.6 6.7A2 2 0 0 0 9.3 9.4M4.3 4.5C2.6 5.7 1.5 8 1.5 8S4 12.5 8 12.5c1.3 0 2.5-.5 3.5-1.1M7 3.6c.3 0 .7-.1 1-.1 4 0 6.5 4.5 6.5 4.5s-.5 1-1.5 2.1"/>'),
    external: svg('<path d="M9 2.5h4.5V7M13.5 2.5L7.5 8.5M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"/>'),
    chev: svg('<path d="M6 4l4 4-4 4"/>'),
    lock: svg('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>')
  };

  const S = {
    prompts: new Map(), folders: new Map(), sheet: new Map(), rows: new Map(), tasks: new Map(), library: new Map(), assets: null, libEditId: null, pwCache: new Map(), vaultKey: null, lq: "",
    view: "all", openId: null,
    q: "", client: "", category: "", status: "", tool: "", tag: "",
    sort: "edited", layout: "list",
    mode: "loading", downloads: null, saving: 0, savedAt: 0
  };
  try { const l = localStorage.getItem("pl-layout"); if (l === "gallery" || l === "list") S.layout = l; } catch (e) {}

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const now = () => Date.now();
  const uid = () => "p" + now().toString(36) + Math.random().toString(36).slice(2, 7);
  const fmtDate = (t) => t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmtTime = (t) => t ? new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const clientClass = (c) => c === "Pipeliners" ? "t-pipeliners" : c === "Alphalete" ? "t-alphalete" : c === "Summit AZ" ? "t-summit" : "";
  const varsOf = (text) => { const out = []; const re = /\[([^\[\]\n]{1,40})\]/g; let m; while ((m = re.exec(text || ""))) { const k = m[1].trim(); if (k && !out.includes(k)) out.push(k); } return out; };
  const blankPrompt = () => ({ title: "", text: "", notes: "", client: "All clients", category: "SEO Prompts", tags: [], status: "Draft", tool: "Claude", folderId: "", favorite: false, deleted: false, deletedAt: 0, createdAt: now(), updatedAt: now(), versions: [] });
  const normalize = (d) => Object.assign(blankPrompt(), d || {}, { category: promptCat(d && d.category), tags: Array.isArray(d && d.tags) ? d.tags.map(String) : [], versions: Array.isArray(d && d.versions) ? d.versions : [] });

  function toast(msg) {
    const old = $(".toast"); if (old) old.remove();
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  /* ---------- storage: shared db when available, this browser otherwise ---------- */
  const Store = {
    db: null, queues: new Map(),
    async init() {
      let db = null;
      try { if (window.claude && typeof window.claude.use === "function") db = await window.claude.use("db"); } catch (e) { db = null; }
      try { if (window.claude && typeof window.claude.use === "function") S.downloads = await window.claude.use("downloads"); } catch (e) { S.downloads = null; }
      try { if (window.claude && typeof window.claude.use === "function") S.assets = await window.claude.use("assets"); } catch (e) { S.assets = null; }
      if (db) {
        this.db = db; S.mode = "db";
        let pending = 6;
        const ready = () => { if (--pending === 0) render(); };
        let first1 = true, first2 = true, first3 = true, first4 = true, first5 = true, first6 = true;
        db.collection("library").onSnapshot((snap) => {
          const next = new Map(snap.docs.map((d) => [d.id, d.data()]));
          if (libTimer && S.view.startsWith("lib:") && S.library.has(S.view.slice(4))) next.set(S.view.slice(4), S.library.get(S.view.slice(4)));
          S.library = next;
          if (first6) { first6 = false; ready(); } else onRemote();
        }, (e) => storeError(e));
        db.collection("tasks").onSnapshot((snap) => {
          const next = new Map(snap.docs.map((d) => [d.id, d.data()]));
          taskTimers.forEach((_, id) => { if (S.tasks.has(id)) next.set(id, S.tasks.get(id)); });
          S.tasks = next;
          if (first5) { first5 = false; ready(); } else onRemote();
        }, (e) => storeError(e));
        db.collection("loginSheet").onSnapshot((snap) => {
          S.sheet = new Map(snap.docs.map((d) => [d.id, d.data()]));
          if (first3) { first3 = false; ready(); } else onRemote();
        }, (e) => storeError(e));
        db.collection("loginRows").onSnapshot((snap) => {
          const next = new Map(snap.docs.map((d) => [d.id, d.data()]));
          rowTimers.forEach((_, rid) => { if (S.rows.has(rid)) next.set(rid, S.rows.get(rid)); });
          S.rows = next;
          if (first4) { first4 = false; ready(); } else if (S.vaultKey) decryptAll().then(onRemote); else onRemote();
        }, (e) => storeError(e));
        db.collection("prompts").onSnapshot((snap) => {
          S.prompts = new Map(snap.docs.map((d) => [d.id, normalize(d.data())]));
          if (first1) { first1 = false; ready(); } else onRemote();
        }, (e) => storeError(e));
        db.collection("folders").onSnapshot((snap) => {
          S.folders = new Map(snap.docs.map((d) => [d.id, d.data()]));
          if (first2) { first2 = false; ready(); } else onRemote();
        }, (e) => storeError(e));
      } else {
        S.mode = "local";
        try {
          let raw = JSON.parse(localStorage.getItem("pl-data") || "null");
          const seedV = window.VAULT_SEED_VERSION || 0;
          let haveV = 0; try { haveV = +localStorage.getItem("pl-seed-version") || 0; } catch (e) {}
          if (window.VAULT_SEED && (!raw || seedV > haveV)) {
            /* first run copies the seed; a newer seed adds new items and replaces an item only when the seed's copy is newer than this browser's (so local edits win) */
            raw = raw || {};
            Object.entries(window.VAULT_SEED).forEach(([col, docs]) => { raw[col] = raw[col] || {}; Object.entries(docs || {}).forEach(([k, v]) => { const mine = raw[col][k]; if (!mine || ((v && v.updatedAt) || 0) > ((mine && mine.updatedAt) || 0)) raw[col][k] = v; }); });
            /* TAG Brain pages mirror the Obsidian notes: take the seed copy whenever the note changed (rev), drop notes that left the brain */
            const seedLib = window.VAULT_SEED.library || {};
            raw.library = raw.library || {};
            Object.entries(seedLib).forEach(([k, v]) => { if (v && v.source === "brain" && (!raw.library[k] || raw.library[k].rev !== v.rev)) raw.library[k] = v; });
            Object.keys(raw.library).forEach((k) => { const d = raw.library[k]; if (d && d.source === "brain" && !seedLib[k]) delete raw.library[k]; });
            /* lesson videos follow data/videos.json: when the build's video list changed (vrev), this browser takes the new links */
            Object.entries(seedLib).forEach(([k, v]) => { const mine = raw.library[k]; if (mine && v && v.vrev && mine.vrev !== v.vrev) raw.library[k] = Object.assign({}, mine, { videos: v.videos, vrev: v.vrev }); });
            /* pages this browser already had keep their text, but take the seed's placement (category and module group) */
            Object.entries((window.VAULT_SEED.library) || {}).forEach(([k, v]) => { const mine = raw.library && raw.library[k]; if (mine && v && v.group !== undefined && (mine.cat !== v.cat || mine.group !== v.group)) raw.library[k] = Object.assign({}, mine, { cat: v.cat, group: v.group }); });
            try { localStorage.setItem("pl-data", JSON.stringify(raw)); localStorage.setItem("pl-seed-version", String(seedV)); } catch (e) {}
          }
          raw = raw || {};
          /* pages the desktop build retired (data/removed.json) leave this browser too, unless Kim has written in them */
          let dropped = 0;
          Object.entries(window.VAULT_REMOVED || {}).forEach(([col, ids]) => (ids || []).forEach((k) => { const d = raw[col] && raw[col][k]; if (d && !String(d.body || d.text || "").trim()) { delete raw[col][k]; dropped++; } }));
          if (dropped) { try { localStorage.setItem("pl-data", JSON.stringify(raw)); } catch (e) {} }
          Object.entries(raw.prompts || {}).forEach(([k, v]) => S.prompts.set(k, normalize(v)));
          Object.entries(raw.folders || {}).forEach(([k, v]) => S.folders.set(k, v));
          Object.entries(raw.sheet || {}).forEach(([k, v]) => S.sheet.set(k, v));
          Object.entries(raw.rows || {}).forEach(([k, v]) => S.rows.set(k, v));
          Object.entries(raw.tasks || {}).forEach(([k, v]) => S.tasks.set(k, v));
          Object.entries(raw.library || {}).forEach(([k, v]) => S.library.set(k, v));
        } catch (e) {}
        render();
      }
    },
    persistLocal() {
      try { localStorage.setItem("pl-data", JSON.stringify({ prompts: Object.fromEntries(S.prompts), folders: Object.fromEntries(S.folders), sheet: Object.fromEntries(S.sheet), rows: Object.fromEntries(S.rows), tasks: Object.fromEntries(S.tasks), library: Object.fromEntries(S.library) })); } catch (e) {}
    },
    mapFor(col) { return { prompts: S.prompts, folders: S.folders, loginSheet: S.sheet, loginRows: S.rows, tasks: S.tasks, library: S.library }[col]; },
    write(col, id, data) {
      this.mapFor(col).set(id, data);
      if (!this.db) { this.persistLocal(); return Promise.resolve(); }
      return this.enqueue(col + "/" + id, () => this.db.collection(col).doc(id).set(JSON.parse(JSON.stringify(data))));
    },
    remove(col, id) {
      this.mapFor(col).delete(id);
      if (!this.db) { this.persistLocal(); return Promise.resolve(); }
      return this.enqueue(col + "/" + id, () => this.db.collection(col).doc(id).delete());
    },
    enqueue(key, fn) {
      S.saving++; paintSaved();
      const prev = this.queues.get(key) || Promise.resolve();
      const next = prev.catch(() => {}).then(fn).then(
        () => { S.saving--; S.savedAt = now(); paintSaved(); },
        (e) => { S.saving--; paintSaved(); storeError(e); }
      );
      this.queues.set(key, next);
      return next;
    }
  };
  function storeError(e) {
    const code = e && e.code;
    if (code === "quota_exceeded") toast("Your library is full. Delete some prompts from Trash to make room.");
    else if (code === "revoked") toast("Saving is no longer available on this page.");
    else toast("Couldn't save that change. Try again in a moment.");
  }

  /* ---------- data actions ---------- */
  function savePrompt(id, patch, opts = {}) {
    const cur = S.prompts.get(id); if (!cur) return;
    const next = Object.assign({}, cur, patch);
    if (!opts.keepTime) next.updatedAt = now();
    return Store.write("prompts", id, next);
  }
  function createPrompt(extra = {}) {
    const id = uid();
    const p = Object.assign(blankPrompt(), extra);
    if (S.view.startsWith("folder:") && !extra.folderId) p.folderId = S.view.slice(7);
    if (S.view.startsWith("pcat:")) p.category = S.view.slice(5);
    Store.write("prompts", id, p);
    openPrompt(id, true);
  }
  function duplicatePrompt(id) {
    const p = S.prompts.get(id); if (!p) return;
    Store.write("prompts", uid(), Object.assign({}, p, { title: (p.title || "Untitled") + " (copy)", favorite: false, createdAt: now(), updatedAt: now(), versions: [] }));
    toast("Duplicated"); render();
  }
  function trashPrompt(id) {
    if (S.openId === id) closePrompt();
    savePrompt(id, { deleted: true, deletedAt: now() }, { keepTime: true });
    toast("Moved to Trash"); render();
  }
  function restorePrompt(id) { savePrompt(id, { deleted: false, deletedAt: 0 }, { keepTime: true }); toast("Restored"); render(); }

  /* ---------- filtering ---------- */
  function visiblePrompts() {
    let arr = [...S.prompts.entries()].map(([id, p]) => Object.assign({ id }, p));
    if (S.view === "trash") arr = arr.filter((p) => p.deleted);
    else {
      arr = arr.filter((p) => !p.deleted);
      if (S.view.startsWith("folder:")) arr = arr.filter((p) => p.folderId === S.view.slice(7));
      if (S.view.startsWith("pcat:")) arr = arr.filter((p) => promptCat(p.category) === S.view.slice(5));
    }
    if (S.category) arr = arr.filter((p) => p.category === S.category);
    const q = S.q.trim().toLowerCase();
    if (q) arr = arr.filter((p) => [p.title, p.text, p.notes, p.client, p.category].join("\n").toLowerCase().includes(q));
    return arr.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  const anyFilter = () => S.q || S.category;

  /* ---------- render: sidebar ---------- */
  function renderSide() {
    const live = [...S.prompts.values()].filter((p) => !p.deleted);
    const trashCount = S.prompts.size - live.length;
    const folders = [...S.folders.entries()].sort((a, b) => String(a[1].name).localeCompare(String(b[1].name)));
    const nav = (key, label, count) => `<button class="nav ${S.view === key && !S.openId ? "on" : ""}" data-nav="${esc(key)}" title="${esc(label)}"><span>${esc(label)}</span>${count != null ? `<span class="count">${count}</span>` : ""}</button>`;
    /* only sections and categories with at least one item are listed (or the one open right now) */
    const catCount = (sec, cid) => sec.kind === "prompts" ? live.filter((p) => promptCat(p.category) === cid).length : sec.kind === "sheet" ? rowOrder(cid).length : pagesIn(cid).length;
    const catKey = (sec, cid) => (sec.kind === "prompts" ? "pcat:" : sec.kind === "sheet" ? "sheet:" : "cat:") + cid;
    const shownCats = (sec) => sec.cats.filter(([cid]) => catCount(sec, cid) > 0 || S.view === catKey(sec, cid) || (sec.kind === "pages" && S.view.startsWith("lib:") && S.library.has(S.view.slice(4)) && catOf(S.library.get(S.view.slice(4))) === cid));
    const pageRow = ([id, pg], pages) => `<div class="folder-row">${nav("lib:" + id, pageLabel(pg, pages)).replace(/title="[^"]*"/, () => `title="${esc(pg.name || "Untitled")}"`)}<button class="icon-btn folder-more" data-lib-menu="${esc(id)}" aria-label="Page options">${I.more}</button></div>`;
    const sidePages = (cid, pages) => {
      const { loose, groups } = groupPages(pages);
      return loose.map((e) => pageRow(e, pages)).join("") + groups.map(([g, list]) => {
        const key = cid + "|" + g, open = treeState.modOpen.has(key), mp = modParts(g);
        return `<div class="mod"><button class="mod-head ${open ? "open" : ""}" data-toggle-mod="${esc(key)}" aria-expanded="${open}" title="${esc(g)}">${I.chev}<span class="mod-num">${esc(mp.num)}</span><span class="mod-name">${esc(mp.name)}</span><span class="count">${list.length}</span></button>
          ${open ? `<div class="mod-pages">${list.map((e) => pageRow(e, list)).join("")}</div>` : ""}</div>`;
      }).join("");
    };
    $("#side").innerHTML = `
      <button class="brand" data-nav="all" title="Prompt Library"><span class="brand-text"><b>TAG Marketing</b><small>Kim's Vault</small></span></button>
      <button class="search-btn" id="sideSearch">${I.search}<span>Search</span><kbd>Ctrl K</kbd></button>
      ${nav("graph", "Brain Graph")}
      ${nav("study", "Study Timer", studyBadge())}
      ${(window.VAULT_GLOSSARY || []).length ? nav("glossary", "Glossary") : ""}
      ${TREE.map((sec) => {
        const cats = shownCats(sec);
        if (!cats.length) return "";
        const closed = treeState.secClosed.has(sec.id);
        const body = closed ? "" : cats.map(([cid, cname]) => {
          if (sec.kind === "prompts") return `<div class="tree-cat">${nav("pcat:" + cid, cname, catCount(sec, cid))}</div>`;
          if (sec.kind === "sheet") return `<div class="tree-cat">${nav("sheet:" + cid, cname, catCount(sec, cid))}</div>`;
          const pages = pagesIn(cid), open = treeState.catOpen.has(cid);
          return `<div class="tree-cat"><div class="cat-row">
              <button class="chev-btn ${open ? "open" : ""}" data-toggle-cat="${cid}" aria-label="${open ? "Collapse" : "Expand"} ${esc(cname)}" aria-expanded="${open}">${I.chev}</button>
              ${nav("cat:" + cid, cname, pages.length || null)}
              <button class="icon-btn cat-add" data-add-page="${cid}" aria-label="New page in ${esc(cname)}" title="New page">${I.plus}</button></div>
            ${open ? `<div class="tree-pages">${sidePages(cid, pages) || `<div class="side-empty">No pages yet</div>`}</div>` : ""}</div>`;
        }).join("");
        return `<div class="tree-sec"><button class="sec-head ${closed ? "" : "open"}" data-toggle-sec="${sec.id}" aria-expanded="${!closed}">${I.chev}<span>${esc(sec.name)}</span></button>${body}</div>`;
      }).join("")}
      <div class="side-foot">
        ${trashCount || S.view === "trash" ? nav("trash", "Trash", trashCount) : ""}
        ${window.VAULT_SEED ? `<button class="nav" id="toggleScene"><span>Scenery background</span><span class="count">${sceneOn() ? "On" : "Off"}</span></button>` : ""}
        <button class="nav" id="importBtn"><span>Import</span></button>
        <button class="nav" id="exportBtn"><span>Export backup</span></button>
        ${S.mode === "local" ? `<div class="store-note">${window.VAULT_SEED ? "Desktop copy. Changes save in this browser. Use Export backup to keep a copy." : "Saving in this browser only. Open this page on claude.ai to save to your account."}</div>` : ""}
      </div>`;
  }

  /* ---------- render: list view ---------- */
  function viewTitle() {
    if (S.view === "trash") return "Trash";
    if (S.view.startsWith("folder:")) { const f = S.folders.get(S.view.slice(7)); return f ? f.name : "Folder"; }
    if (S.view.startsWith("pcat:")) return S.view.slice(5);
    return "Prompt Library";
  }
  function chipSelect(id, label, value, options) {
    return `<select class="chip-select ${value ? "set" : ""}" id="${id}" aria-label="${esc(label)}"><option value="">${esc(label)}</option>${options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }
  const metaTags = (p) => `<span class="tag ${clientClass(p.client)}">${esc(p.client)}</span><span class="tag">${esc(p.category)}</span>`;
  function renderList() {
    const name = viewTitle();
    const items = visiblePrompts();
    const trash = S.view === "trash";
    $("#topTitle").textContent = name;
    let body;
    if (!items.length) {
      if (anyFilter()) body = `<div class="empty"><h2>No prompts match</h2><p>Try a different search or clear the filters.</p><button class="btn" id="clearFilters">Clear filters</button></div>`;
      else if (trash) body = `<div class="empty"><h2>Trash is empty</h2><p>Deleted prompts land here, so you can restore them later.</p></div>`;
      else body = `<div class="empty"><h2>Start your prompt library</h2><p>Save a prompt once, then find it and copy it in seconds. Add [brackets] like [City] to fill them in when you copy.</p><button class="btn primary" data-new>${I.plus}New prompt</button></div>`;
    } else if (S.layout === "gallery" && !trash) {
      body = `<div class="gallery">${items.map((p) => `
        <div class="card" data-open="${p.id}" tabindex="0">
          <div class="ctop"><span class="title">${esc(p.title || "Untitled")}</span></div>
          <div class="preview">${esc(p.text.slice(0, 220) || "Empty prompt")}</div>
          <div class="meta">${metaTags(p)}</div>
          <button class="btn sm" data-copy="${p.id}">${I.copy}Copy prompt</button>
        </div>`).join("")}</div>`;
    } else {
      body = `<div class="list">${items.map((p) => `
        <div class="row" data-open="${p.id}" tabindex="0">
          <div style="min-width:0"><div class="title">${esc(p.title || "Untitled")}</div><div class="preview">${esc(p.text.replace(/\s+/g, " ").slice(0, 140) || "Empty prompt")}</div></div>
          <div class="meta">${metaTags(p)}</div>
          <div class="acts">
            ${trash ? `<button class="btn sm" data-restore="${p.id}">Restore</button><button class="btn sm danger" data-purge="${p.id}">Delete forever</button>`
              : `<button class="icon-btn" data-copy="${p.id}" aria-label="Copy prompt" title="Copy prompt">${I.copy}</button>
                 <button class="icon-btn" data-row-menu="${p.id}" aria-label="More actions" title="More">${I.more}</button>`}
          </div>
        </div>`).join("")}</div>`;
    }
    $("#view").innerHTML = `
      ${S.view.startsWith("pcat:") ? `<div class="crumbs"><button class="back" data-nav="all">${I.back}Prompt Library</button></div>` : ""}
      <div class="head"><h1>${esc(name)}</h1><span class="sub">${items.length} ${items.length === 1 ? "prompt" : "prompts"}</span><span class="spacer"></span>
        ${trash ? (items.length ? `<button class="btn danger" id="emptyTrash">Empty trash</button>` : "") : `<button class="btn primary" data-new>${I.plus}New prompt</button>`}</div>
      <div class="toolbar">
        <label class="search">${I.search}<input id="q" type="search" placeholder="Search titles, prompt text, tags, and notes" value="${esc(S.q)}" aria-label="Search prompts"></label>
        ${S.view.startsWith("pcat:") ? "" : chipSelect("fCategory", "Category", S.category, CATEGORIES.filter((c) => c === S.category || [...S.prompts.values()].some((p) => !p.deleted && promptCat(p.category) === c)))}
        ${trash ? "" : `<div class="seg" role="group" aria-label="Layout"><button id="lyList" class="${S.layout === "list" ? "on" : ""}">List</button><button id="lyGallery" class="${S.layout === "gallery" ? "on" : ""}">Gallery</button></div>`}
        ${anyFilter() ? `<button class="clear-link" id="clearFilters2">Clear</button>` : ""}
      </div>
      ${body}`;
  }

  /* ---------- render: prompt page ---------- */
  let draftTimer = null, baseline = null, versionTaken = false;
  function propSelect(id, label, value, options) {
    return `<div class="prop"><label for="${id}">${esc(label)}</label><select id="${id}">${options.map((o) => `<option value="${esc(o.v ?? o)}" ${(o.v ?? o) === value ? "selected" : ""}>${esc(o.l ?? o)}</option>`).join("")}</select></div>`;
  }
  function renderPage() {
    const id = S.openId, p = S.prompts.get(id);
    if (!p) { S.openId = null; return renderList(); }
    $("#topTitle").textContent = p.title || "Untitled";
    $("#view").innerHTML = `
      <div class="page">
        <div class="crumbs"><button class="back" id="back">${I.back}${esc(viewTitle())}</button>
          <div class="page-acts"><span class="saved" id="savedLbl" aria-live="polite"></span>
            ${p.deleted ? `<button class="btn sm" id="pgRestore">Restore</button>` : ""}
            <button class="icon-btn lg" id="pgHistory" aria-label="Version history" title="Version history">${I.history}</button>
            <button class="icon-btn lg" id="pgMore" aria-label="More actions" title="More">${I.more}</button>
          </div></div>
        <input class="title-input" id="pgTitle" placeholder="Untitled" value="${esc(p.title)}" aria-label="Title">
        <div class="props">
          ${propSelect("pgClient", "Client", p.client, CLIENTS)}
          ${propSelect("pgCategory", "Category", p.category, CATEGORIES)}
        </div>
        <div class="block-head"><h3>Prompt</h3><span class="spacer"></span><button class="btn primary desk-copy" id="pgCopy">${I.copy}Copy prompt</button></div>
        <div class="prompt-box"><textarea class="prompt-text" id="pgText" spellcheck="false" placeholder="Paste or write your prompt here. Use [brackets] for parts you change each time, like [Client] or [City]." aria-label="Prompt text">${esc(p.text)}</textarea></div>
        <div class="vars-hint" id="varsHint"></div>
        <div class="block-head" style="margin-top:28px"><h3>Notes</h3></div>
        <textarea class="notes-text" id="pgNotes" placeholder="What it's for, tips, and results" aria-label="Notes">${esc(p.notes)}</textarea>
      </div>
      <div class="copy-dock"><button class="btn primary" id="pgCopy2">${I.copy}Copy prompt</button></div>`;
    autoGrow($("#pgText")); autoGrow($("#pgNotes")); paintVars(); paintSaved();
    regrowSoon();
  }
  /* fonts load after the first paint and change line heights, so measure the editors again once they arrive (and on resize) */
  const regrowAll = () => document.querySelectorAll("#pgText, #pgNotes, #libBody").forEach(autoGrow);
  const regrowSoon = () => { try { document.fonts.ready.then(regrowAll); } catch (e) {} setTimeout(regrowAll, 400); };
  window.addEventListener("resize", regrowAll);
  function autoGrow(el) { if (!el) return; el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }
  function paintVars() {
    const el = $("#varsHint"); const t = $("#pgText"); if (!el || !t) return;
    const v = varsOf(t.value);
    el.innerHTML = v.length ? `<span>${v.length} fill-in${v.length === 1 ? "" : "s"}:</span>${v.map((k) => `<span class="var-pill">[${esc(k)}]</span>`).join("")}<span>You'll fill ${v.length === 1 ? "it" : "them"} in when you copy.</span>` : "";
  }
  function paintSaved() {
    const el = $("#savedLbl"); if (!el) return;
    if (draftTimer || S.saving > 0) el.textContent = "Saving…";
    else if (S.savedAt && now() - S.savedAt < 4000) el.textContent = "Saved";
    else el.textContent = "";
  }
  function readDraft() {
    return { title: $("#pgTitle").value, text: $("#pgText").value, notes: $("#pgNotes").value };
  }
  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(commitDraft, 700);
    paintSaved();
  }
  function commitDraft() {
    clearTimeout(draftTimer); draftTimer = null;
    const id = S.openId; const p = S.prompts.get(id); if (!p || !$("#pgTitle")) return;
    const d = readDraft();
    if (d.title === p.title && d.text === p.text && d.notes === p.notes) { paintSaved(); return; }
    const patch = Object.assign({}, d);
    if (!versionTaken && baseline && (baseline.text !== d.text || baseline.title !== d.title) && (baseline.text || baseline.title)) {
      patch.versions = [{ title: baseline.title, text: baseline.text, notes: baseline.notes, at: baseline.at }].concat(p.versions).slice(0, MAX_VERSIONS);
      versionTaken = true;
    }
    savePrompt(id, patch);
    $("#topTitle").textContent = d.title || "Untitled";
  }
  function openPrompt(id, focusTitle) {
    if (S.openId) commitDraft();
    S.openId = id;
    const p = S.prompts.get(id);
    baseline = p ? { title: p.title, text: p.text, notes: p.notes, at: p.updatedAt } : null;
    versionTaken = false;
    closeDrawer(); render();
    $("#main").scrollTop = 0;
    if (focusTitle) setTimeout(() => { const t = $("#pgTitle"); if (t) t.focus(); }, 30);
  }
  function closePrompt() { commitDraft(); S.openId = null; baseline = null; render(); }
  function onRemote() {
    if (S.view.startsWith("lib:")) {
      const a = document.activeElement;
      if ((a && (a.id === "libTitle" || a.id === "libBody" || (a.dataset && a.dataset.imgCap != null))) || libTimer || $("#scrim")) { renderSide(); return; }
    }
    if (S.view === "tasks" && !S.openId) {
      const a = document.activeElement;
      if ((a && a.matches && a.matches(".task-input, [data-add-task]")) || dragTask || $("#scrim") || $("#menu")) { renderSide(); return; }
    }
    if (S.view.startsWith("sheet:") && !S.openId) {
      const a = document.activeElement;
      if ((a && a.classList && a.classList.contains("cell")) || dragRow || dragCol || $("#scrim")) { renderSide(); return; }
    }
    if (S.openId) {
      const editing = document.activeElement && ["pgTitle", "pgText", "pgNotes", "tagInput"].includes(document.activeElement.id);
      if (!S.prompts.get(S.openId)) { S.openId = null; render(); return; }
      if (editing || draftTimer) { renderSide(); return; }
    }
    render();
  }

  function render() {
    if (S.mode === "loading") return;
    renderSide();
    $("#view").classList.toggle("graph-mode", S.view === "graph" && !S.openId);
    if (S.view !== "graph") stopGraph();
    if (S.view === "tasks") S.view = "study"; /* Tasks was replaced by the Study Timer; task data stays in storage and backups */
    paintStudyPill();
    if (S.openId) renderPage(); else if (S.view === "graph") renderGraph(); else if (S.view === "study") renderStudy(); else if (S.view === "glossary") renderGlossary(); else if (S.view.startsWith("sheet:")) renderLogins(); else if (S.view.startsWith("lib:")) renderLibPage(); else if (S.view.startsWith("cat:")) renderCat(); else renderList();
  }

  /* ---------- tool logins sheet ---------- */
  /* Passwords are encrypted in the browser (AES-GCM, key from the vault password via PBKDF2) before they're saved. */
  const SHEETS = {
    login: { name: "Login Credentials", search: "Search names, links, usernames, and emails", cols: [
      { id: "name", name: "Name", type: "text", width: 170 },
      { id: "link", name: "Link", type: "link", width: 210 },
      { id: "username", name: "Username", type: "text", width: 160 },
      { id: "email", name: "Email", type: "text", width: 200 },
      { id: "password", name: "Password", type: "password", width: 190 },
      { id: "notes", name: "Notes", type: "text", width: 240 }] },
    accounts: { name: "Platform Accounts", search: "Search platforms, owners, and plans", cols: [
      { id: "platform", name: "Platform", type: "text", width: 170 },
      { id: "link", name: "Link", type: "link", width: 200 },
      { id: "email", name: "Account email", type: "text", width: 200 },
      { id: "owner", name: "Account owner", type: "text", width: 150 },
      { id: "plan", name: "Plan", type: "text", width: 130 },
      { id: "cost", name: "Cost", type: "text", width: 110 },
      { id: "renewal", name: "Renewal date", type: "text", width: 130 },
      { id: "notes", name: "Notes", type: "text", width: 240 }] }
  };
  const curSheet = () => (S.view.startsWith("sheet:") && SHEETS[S.view.slice(6)]) ? S.view.slice(6) : "login";
  const metaKey = (sh) => sh === "login" ? "meta" : "meta-" + sh;
  const rowSheet = (r) => (r && SHEETS[r.sheet]) ? r.sheet : "login";
  const TYPE_LABEL = { text: "Text", link: "Link", password: "Password" };
  const rowTimers = new Map();
  let dragRow = null, dragCol = null;

  const safeUrl = (u) => { const s = String(u || "").trim(); if (!s) return ""; const full = /^https?:\/\//i.test(s) ? s : "https://" + s; try { const x = new URL(full); return /^https?:$/.test(x.protocol) && x.hostname.includes(".") ? x.href : ""; } catch (e) { return ""; } };
  const sheetMeta = (sh = curSheet()) => S.sheet.get(metaKey(sh)) || {};
  const sheetCols = (sh = curSheet()) => (Array.isArray(sheetMeta(sh).columns) && sheetMeta(sh).columns.length ? sheetMeta(sh).columns : SHEETS[sh].cols);
  const vaultSet = () => !!S.sheet.get("crypto");
  function rowOrder(sh = curSheet()) {
    const mine = [...S.rows.entries()].filter(([, r]) => rowSheet(r) === sh).map(([id]) => id);
    const order = Array.isArray(sheetMeta(sh).order) ? sheetMeta(sh).order : [];
    const known = order.filter((id) => mine.includes(id));
    const extra = mine.filter((id) => !known.includes(id)).sort((a, b) => (S.rows.get(a).createdAt || 0) - (S.rows.get(b).createdAt || 0));
    return known.concat(extra);
  }
  function saveMeta(patch) {
    const m = Object.assign({ columns: sheetCols(), order: rowOrder() }, patch);
    return Store.write("loginSheet", metaKey(curSheet()), m);
  }
  const cellText = (rid, cid) => { const r = S.rows.get(rid); const v = r && r.cells ? r.cells[cid] : ""; return typeof v === "string" ? v : ""; };

  /* crypto */
  const b64 = (buf) => { let s = ""; new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriveKey(pass, salt) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(salt), iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptText(key, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decryptText(key, o) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, key, unb64(o.ct));
    return new TextDecoder().decode(pt);
  }
  async function decryptAll() {
    if (!S.vaultKey) return;
    for (const [rid, r] of S.rows) for (const c of sheetCols(rowSheet(r)).filter((x) => x.type === "password")) {
      const k = rid + "|" + c.id, v = r.cells && r.cells[c.id];
      if (S.pwCache.has(k) && rowTimers.has(rid)) continue;
      if (v && v.ct) { try { S.pwCache.set(k, await decryptText(S.vaultKey, v)); } catch (e) { S.pwCache.set(k, ""); } }
      else S.pwCache.set(k, "");
    }
  }
  function setupVault(then) {
    const d = dialog("Set your vault password", `
      <p class="muted">Your passwords are locked with this vault password before they're saved. You'll type it once each time you open the page.</p>
      <div class="field"><label for="vp1">Vault password</label><input id="vp1" type="password" autocomplete="new-password"></div>
      <div class="field"><label for="vp2">Type it again</label><input id="vp2" type="password" autocomplete="new-password"><span class="err" id="vpErr" hidden></span></div>
      <p class="warn">Write it down somewhere safe. If you forget it, the saved passwords can't be recovered.</p>`,
      `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="vpOk">Set password</button>`);
    const err = (m) => { const e = $("#vpErr", d); e.textContent = m; e.hidden = false; };
    setTimeout(() => $("#vp1", d).focus(), 30);
    const go = async () => {
      const a = $("#vp1", d).value, b = $("#vp2", d).value;
      if (a.length < 8) return err("Use at least 8 characters");
      if (a !== b) return err("The two passwords don't match");
      const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
      const key = await deriveKey(a, salt);
      await Store.write("loginSheet", "crypto", { salt, check: await encryptText(key, "vault-ok"), createdAt: now() });
      S.vaultKey = key; await decryptAll(); closeDialog(); toast("Vault password set"); render(); if (then) then();
    };
    $("#vpOk", d).onclick = go;
    d.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }
  function unlockVault(then) {
    const c = S.sheet.get("crypto"); if (!c) return setupVault(then);
    const d = dialog("Unlock passwords", `
      <div class="field"><label for="vu">Vault password</label><input id="vu" type="password" autocomplete="current-password"><span class="err" id="vuErr" hidden>That vault password isn't right</span></div>`,
      `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="vuOk">Unlock</button>`);
    const inp = $("#vu", d);
    setTimeout(() => inp.focus(), 30);
    inp.addEventListener("input", () => { $("#vuErr", d).hidden = true; });
    const go = async () => {
      const btn = $("#vuOk", d); btn.textContent = "Unlocking…";
      try {
        const key = await deriveKey(inp.value, c.salt);
        if ((await decryptText(key, c.check)) !== "vault-ok") throw new Error("bad");
        S.vaultKey = key; await decryptAll(); closeDialog(); toast("Unlocked"); render(); if (then) then();
      } catch (e) { btn.textContent = "Unlock"; $("#vuErr", d).hidden = false; inp.select(); }
    };
    $("#vuOk", d).onclick = go;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }
  function lockVault() { S.vaultKey = null; S.pwCache.clear(); toast("Passwords locked"); render(); }

  /* rows */
  function scheduleRow(rid) {
    clearTimeout(rowTimers.get(rid));
    rowTimers.set(rid, setTimeout(() => saveRow(rid), 600));
  }
  async function saveRow(rid) {
    clearTimeout(rowTimers.get(rid));
    const r = S.rows.get(rid); if (!r) { rowTimers.delete(rid); return; }
    const cells = Object.assign({}, r.cells);
    if (S.vaultKey) for (const c of sheetCols(rowSheet(r)).filter((x) => x.type === "password")) {
      const k = rid + "|" + c.id;
      if (S.pwCache.has(k)) { const plain = S.pwCache.get(k); cells[c.id] = plain ? await encryptText(S.vaultKey, plain) : ""; }
    }
    rowTimers.delete(rid);
    Store.write("loginRows", rid, { cells, sheet: rowSheet(r), createdAt: r.createdAt || now(), updatedAt: now() });
  }
  function flushRows() { [...rowTimers.keys()].forEach((rid) => saveRow(rid)); }
  function newRow(at, focusCol) {
    const rid = "r" + uid();
    const order = rowOrder();
    Store.write("loginRows", rid, { cells: {}, sheet: curSheet(), createdAt: now(), updatedAt: now() });
    order.splice(at == null ? order.length : at, 0, rid);
    saveMeta({ order });
    renderLogins();
    setTimeout(() => { const el = $(`.cell[data-r="${rid}"][data-c="${focusCol || sheetCols()[0].id}"]`); if (el) el.focus(); }, 20);
  }
  function moveRow(rid, to) {
    const order = rowOrder().filter((x) => x !== rid);
    order.splice(Math.max(0, Math.min(to, order.length)), 0, rid);
    saveMeta({ order }); renderLogins();
  }
  function deleteRow(rid) {
    const name = cellText(rid, sheetCols()[0].id) || "this row";
    confirmBox("Delete row", `Delete “${name}”? This can't be undone.`, "Delete row", () => {
      clearTimeout(rowTimers.get(rid)); rowTimers.delete(rid);
      Store.remove("loginRows", rid); saveMeta({ order: rowOrder().filter((x) => x !== rid) }); toast("Row deleted"); renderLogins();
    });
  }
  function rowMenu(anchor, rid) {
    const i = rowOrder().indexOf(rid);
    menu(anchor, [
      { label: "Insert row above", run: () => newRow(i) },
      { label: "Insert row below", run: () => newRow(i + 1) },
      { label: "Move up", run: () => moveRow(rid, i - 1) },
      { label: "Move down", run: () => moveRow(rid, i + 1) },
      "-", { label: "Delete row", danger: true, run: () => deleteRow(rid) }
    ]);
  }

  /* columns */
  function colMenu(anchor, cid) {
    const cols = sheetCols(), i = cols.findIndex((c) => c.id === cid), c = cols[i]; if (!c) return;
    const move = (to) => { const next = cols.slice(); next.splice(i, 1); next.splice(to, 0, c); saveMeta({ columns: next }); renderLogins(); };
    menu(anchor, [
      { label: "Rename", run: () => nameBox("Rename column", "Column name", c.name, "Rename", (v) => { saveMeta({ columns: cols.map((x) => x.id === cid ? Object.assign({}, x, { name: v }) : x) }); renderLogins(); }) },
      { label: "Insert column left", run: () => addColumn(i) },
      { label: "Insert column right", run: () => addColumn(i + 1) },
      { label: "Move left", run: () => move(Math.max(0, i - 1)) },
      { label: "Move right", run: () => move(Math.min(cols.length - 1, i + 1)) },
      "-", { label: "Delete column", danger: true, run: () => {
        if (cols.length === 1) { toast("A table needs at least one column"); return; }
        confirmBox("Delete column", `Delete the “${c.name}” column and everything typed in it?`, "Delete column", () => {
          saveMeta({ columns: cols.filter((x) => x.id !== cid) });
          [...S.rows.entries()].forEach(([rid, r]) => { if (rowSheet(r) === curSheet() && r.cells && cid in r.cells) { const cells = Object.assign({}, r.cells); delete cells[cid]; Store.write("loginRows", rid, Object.assign({}, r, { cells, updatedAt: now() })); } });
          toast("Column deleted"); renderLogins();
        });
      } }
    ]);
  }
  function addColumn(at) {
    const d = dialog("Add column", `
      <div class="field"><label for="ncName">Column name</label><input id="ncName" autocomplete="off" placeholder="Account owner"><span class="err" id="ncErr" hidden>Enter a column name</span></div>
      <div class="field"><label for="ncType">Type</label><select id="ncType" class="field-select"><option value="text">Text</option><option value="link">Link (opens the site)</option><option value="password">Password (hidden and locked)</option></select></div>`,
      `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="ncOk">Add column</button>`);
    const inp = $("#ncName", d);
    setTimeout(() => inp.focus(), 30);
    inp.addEventListener("input", () => { inp.classList.remove("bad"); $("#ncErr", d).hidden = true; });
    const go = () => {
      const name = inp.value.trim(); if (!name) { inp.classList.add("bad"); $("#ncErr", d).hidden = false; inp.focus(); return; }
      const cols = sheetCols().slice();
      cols.splice(at == null ? cols.length : at, 0, { id: "c" + uid(), name, type: $("#ncType", d).value, width: 170 });
      saveMeta({ columns: cols }); closeDialog(); renderLogins();
    };
    $("#ncOk", d).onclick = go;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
  }

  /* render */
  function cellHtml(rid, c) {
    const a = `data-r="${rid}" data-c="${esc(c.id)}"`;
    if (c.type === "password") {
      const stored = S.rows.get(rid)?.cells?.[c.id];
      if (!S.vaultKey) return `<td class="pw-cell"><button class="cell-btn" data-pw-unlock ${a}>${stored && stored.ct ? "••••••••" : `<span class="ph">${vaultSet() ? "Unlock to add" : "Set vault password"}</span>`}</button></td>`;
      const val = S.pwCache.get(rid + "|" + c.id) || "";
      return `<td class="pw-cell"><div class="cell-wrap"><input class="cell" type="password" ${a} data-pw="1" value="${esc(val)}" autocomplete="new-password" spellcheck="false"><button class="icon-btn cell-act" data-pw-eye ${a} aria-label="Show password" title="Show">${I.eye}</button><button class="icon-btn cell-act" data-pw-copy ${a} aria-label="Copy password" title="Copy">${I.copy}</button></div></td>`;
    }
    const v = cellText(rid, c.id);
    if (c.type === "link") {
      const u = safeUrl(v);
      return `<td><div class="cell-wrap"><input class="cell" ${a} value="${esc(v)}" spellcheck="false" autocomplete="off">${u ? `<a class="icon-btn cell-act" href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="Open link" title="Open">${I.external}</a>` : ""}</div></td>`;
    }
    return `<td><input class="cell" ${a} value="${esc(v)}" spellcheck="false" autocomplete="off"></td>`;
  }
  function renderLogins() {
    const cols = sheetCols();
    const q = S.lq.trim().toLowerCase();
    const all = rowOrder();
    const ids = q ? all.filter((rid) => cols.some((c) => c.type !== "password" && cellText(rid, c.id).toLowerCase().includes(q))) : all;
    const hasPw = cols.some((c) => c.type === "password");
    const sh = SHEETS[curSheet()];
    $("#topTitle").textContent = sh.name;
    $("#view").innerHTML = `
      <div class="crumbs"><span class="crumb-label">Private</span></div>
      <div class="head"><h1>${esc(sh.name)}</h1><span class="sub">${all.length} ${all.length === 1 ? "row" : "rows"}</span><span class="spacer"></span>
        ${hasPw ? (S.vaultKey ? `<button class="btn" id="lockVault">${I.lock}Lock passwords</button>` : `<button class="btn" id="unlockVault">${I.lock}${vaultSet() ? "Unlock passwords" : "Set vault password"}</button>`) : ""}
        <button class="btn primary" data-new-row>${I.plus}New row</button></div>
      <div class="toolbar sheet-tools"><label class="search">${I.search}<input id="lq" type="search" placeholder="${esc(sh.search)}" value="${esc(S.lq)}" aria-label="Search logins"></label></div>
      <div class="sheet-wrap">
        <table class="sheet">
          <colgroup><col style="width:44px">${cols.map((c) => `<col data-colw="${esc(c.id)}" style="width:${Math.round(c.width || 170)}px">`).join("")}<col style="width:44px"></colgroup>
          <thead><tr><th class="gutter"></th>${cols.map((c) => `<th data-col="${esc(c.id)}" draggable="true" title="Drag to move this column"><div class="th-in"><span class="th-name">${esc(c.name)}</span>${c.type !== "text" ? `<span class="th-type">${TYPE_LABEL[c.type]}</span>` : ""}<button class="icon-btn th-menu" data-col-menu="${esc(c.id)}" aria-label="Column options for ${esc(c.name)}">${I.more}</button></div><span class="col-resize" data-resize="${esc(c.id)}" aria-hidden="true"></span></th>`).join("")}<th class="end"><button class="icon-btn" id="addCol" aria-label="Add column" title="Add column">${I.plus}</button></th></tr></thead>
          <tbody>${ids.map((rid) => `<tr data-row="${rid}"><td class="gutter"><span class="row-handle" data-handle="${rid}" title="Drag to move this row">${I.grip}</span><span class="row-num">${all.indexOf(rid) + 1}</span></td>${cols.map((c) => cellHtml(rid, c)).join("")}<td class="end"><button class="icon-btn" data-sheet-row-menu="${rid}" aria-label="Row options">${I.more}</button></td></tr>`).join("")}</tbody>
        </table>
        ${q && !ids.length ? `<div class="sheet-empty">No rows match your search.</div>` : ""}
        <button class="add-row" data-new-row>${I.plus}New row</button>
      </div>
      <p class="notice">${hasPw ? "Passwords are locked with your vault password before they're saved, so they can't be read without it. " : ""}Tip: press Enter to move down a row.</p>`;
  }

  /* ---------- library pages ---------- */
  let libTimer = null;
  /* sidebar label: drop a two-word prefix that 3+ pages in the same category share (e.g. "Modern SEO M1 L2: ..." shows as "M1 L2: ...") */
  const shortName = (name, pages) => {
    const m = /^(\S+\s+\S+)\s+(.+)$/.exec(name); if (!m) return name;
    return pages.filter(([, p]) => String(p.name || "").startsWith(m[1] + " ")).length >= 3 ? m[2].replace(/^[:\-\s]+/, "") : name;
  };
  /* course modules: pages with a `group` (e.g. "Module 1: The Local SEO Reality Check") are listed under their module, lessons in number order and the module summary last */
  const modParts = (g) => { const m = /^Module\s+(\d+):?\s*(.*)$/i.exec(g || ""); return m ? { num: m[1].padStart(2, "0"), name: m[2] || g } : { num: "", name: g }; };
  const lessonSort = (a, b) => (/summary/i.test(a[1].name) - /summary/i.test(b[1].name)) || String(a[1].name).localeCompare(String(b[1].name), undefined, { numeric: true });
  function groupPages(pages) {
    const loose = [], groups = new Map();
    pages.forEach((e) => { const g = e[1].group; if (g) { if (!groups.has(g)) groups.set(g, []); groups.get(g).push(e); } else loose.push(e); });
    return { loose, groups: [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([g, list]) => [g, list.sort(lessonSort)]) };
  }
  const pageLabel = (pg, pages) => pg.group && /\bM\d+(\s+L\d+)?:/.test(pg.name || "")
    ?String(pg.name || "Untitled").replace(/^.*?\bM\d+\s*/, "").replace(/^L(\d+):\s*/, "$1. ").replace(/^[:\-\s]+/, "") || pg.name
    : shortName(pg.name || "Untitled", pages);
  const pagesIn = (cid) => [...S.library.entries()].filter(([, pg]) => catOf(pg) === cid).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  function addPage(cid) {
    const info = CAT_INFO[cid]; if (!info) return;
    nameBox("New page in " + info.name, "Page name", "", "Create page", (v) => {
      const id = "b" + uid();
      Store.write("library", id, { name: v, body: "", cat: cid, createdAt: now(), updatedAt: now() });
      treeState.catOpen.add(cid); saveTree();
      S.view = "lib:" + id; S.openId = null; render();
      setTimeout(() => { const b = $("#libBody"); if (b) b.focus(); }, 30);
    });
  }
  /* category page filters: search, sort and a date range (note date, date added or last edited); kept per category while the vault is open */
  const CF = { cid: "", q: "", sort: "default", field: "date", from: "", to: "" };
  const pageTime = (pg, field) => field === "edited" ? pg.updatedAt || 0 : field === "added" ? pg.createdAt || 0 : (pg.date && Date.parse(pg.date + "T00:00:00")) || pg.createdAt || 0;
  function renderCat() {
    const cid = S.view.slice(4), info = CAT_INFO[cid];
    if (!info) { S.view = "all"; return renderList(); }
    if (CF.cid !== cid) Object.assign(CF, { cid, q: "", sort: "default", from: "", to: "" });
    const pages = pagesIn(cid);
    $("#topTitle").textContent = info.name;
    $("#view").innerHTML = `
      <div class="crumbs"><span class="crumb-label">${esc(info.section.name)}</span></div>
      <div class="head"><h1>${esc(info.name)}</h1><span class="sub" id="catCount">${pages.length} ${pages.length === 1 ? "page" : "pages"}</span><span class="spacer"></span><button class="btn primary" data-add-page="${cid}">${I.plus}New page</button></div>
      ${pages.length ? `<div class="toolbar cat-filters">
        <label class="search">${I.search}<input id="cfQ" type="search" placeholder="Search these pages" value="${esc(CF.q)}" aria-label="Search pages"></label>
        <select class="chip-select" id="cfSort" aria-label="Sort"><option value="default" ${CF.sort === "default" ? "selected" : ""}>Default order</option><option value="new" ${CF.sort === "new" ? "selected" : ""}>Newest first</option><option value="old" ${CF.sort === "old" ? "selected" : ""}>Oldest first</option><option value="az" ${CF.sort === "az" ? "selected" : ""}>Name A to Z</option></select>
        <select class="chip-select" id="cfField" aria-label="Date to use"><option value="date" ${CF.field === "date" ? "selected" : ""}>Note date</option><option value="added" ${CF.field === "added" ? "selected" : ""}>Date added</option><option value="edited" ${CF.field === "edited" ? "selected" : ""}>Last edited</option></select>
        <label class="src-date-in">From<input type="date" id="cfFrom" value="${esc(CF.from)}"></label>
        <label class="src-date-in">To<input type="date" id="cfTo" value="${esc(CF.to)}"></label>
        <button class="clear-link" id="cfClear">Clear</button>
      </div><div id="catList"></div>`
      : `<div class="empty"><h2>No pages in ${esc(info.name)} yet</h2><p>Add your first page for this topic. Pages open as clean documents you can edit any time.</p><button class="btn primary" data-add-page="${cid}">${I.plus}New page</button></div>`}`;
    if (!pages.length) return;
    const row = ([id, pg], list) => {
      const first = String(pg.body || "").split("\n").map((l) => l.replace(/^(?:[#>\-*|\s]+|\d+[.)]\s+)+/, "").replace(/\*\*/g, "").trim()).find((l) => l && !/^-+$/.test(l)) || "Empty page";
      const when = pg.date ? "Dated " + fmtDate(Date.parse(pg.date + "T00:00:00")) : "Created " + fmtDate(pg.createdAt);
      return `<div class="row page-row" data-nav="lib:${id}" tabindex="0"><div style="min-width:0"><div class="title">${esc(pg.group ? pageLabel(pg, list) : pg.name || "Untitled")}</div><div class="preview">${esc(first.slice(0, 140))}</div></div><div class="meta">${(pg.videos || []).length ? `<span class="tag">${pg.videos.length} ${pg.videos.length === 1 ? "video" : "videos"}</span>` : ""}<span class="sub" title="Added ${esc(fmtDate(pg.createdAt))} · Edited ${esc(fmtDate(pg.updatedAt))}">${esc(when)}</span>${(pg.images || []).length ? `<span class="tag">${pg.images.length} ${pg.images.length === 1 ? "image" : "images"}</span>` : ""}</div><div class="acts"><button class="icon-btn" data-lib-menu="${esc(id)}" aria-label="Page options">${I.more}</button></div></div>`;
    };
    const paint = () => {
      const q = CF.q.trim().toLowerCase(), from = dayStart(CF.from), to = dayStart(CF.to);
      const shown = pages.filter(([, pg]) => {
        const t = pageTime(pg, CF.field);
        if (q && !((pg.name || "") + "\n" + (pg.body || "")).toLowerCase().includes(q)) return false;
        if (from && t < from) return false;
        if (to && t >= to + 864e5) return false;
        return true;
      });
      const sorter = { new: (a, b) => pageTime(b[1], CF.field) - pageTime(a[1], CF.field), old: (a, b) => pageTime(a[1], CF.field) - pageTime(b[1], CF.field), az: (a, b) => String(a[1].name).localeCompare(String(b[1].name), undefined, { numeric: true }) }[CF.sort];
      const { loose, groups } = groupPages(shown);
      const ord = (list) => sorter ? list.slice().sort(sorter) : list;
      $("#catCount").textContent = shown.length === pages.length ? `${pages.length} ${pages.length === 1 ? "page" : "pages"}` : `${shown.length} of ${pages.length} pages`;
      $("#catList").innerHTML = !shown.length ? `<div class="empty"><h2>No pages match</h2><p>Change the search or the date range, or clear the filters.</p></div>`
        : (loose.length ? `<div class="list">${ord(loose).map((e) => row(e, pages)).join("")}</div>` : "")
          + groups.map(([g, list]) => { const mp = modParts(g); return `<section class="mod-sec"><div class="mod-sec-head"><span class="mod-num">${esc(mp.num ? "Module " + Number(mp.num) : "")}</span><h2>${esc(mp.name)}</h2><span class="sub">${list.length} ${list.length === 1 ? "page" : "pages"}</span></div><div class="list">${ord(list).map((e) => row(e, list)).join("")}</div></section>`; }).join("");
    };
    paint();
    $("#cfQ").addEventListener("input", (e) => { CF.q = e.target.value; paint(); });
    [["cfSort", "sort"], ["cfField", "field"], ["cfFrom", "from"], ["cfTo", "to"]].forEach(([elId, key]) => $("#" + elId).addEventListener("change", (e) => { CF[key] = e.target.value; paint(); }));
    $("#cfClear").addEventListener("click", () => { Object.assign(CF, { q: "", sort: "default", from: "", to: "" }); renderCat(); });
  }
  function flushLib() {
    if (!libTimer) return;
    clearTimeout(libTimer); libTimer = null;
    const id = S.view.startsWith("lib:") ? S.view.slice(4) : null, cur = id && S.library.get(id), t = $("#libTitle"), b = $("#libBody");
    if (!cur || !t || !b) return;
    if (cur.name === (t.value.trim() || "Untitled") && cur.body === b.value) return;
    Store.write("library", id, Object.assign({}, cur, { name: t.value.trim() || "Untitled", body: b.value, updatedAt: now() }));
    renderSide();
  }
  function libMenu(anchor, id) {
    const pg = S.library.get(id); if (!pg) return;
    menu(anchor, [
      { label: "Rename", run: () => nameBox("Rename page", "Page name", pg.name, "Rename", (v) => { Store.write("library", id, Object.assign({}, pg, { name: v, updatedAt: now() })); render(); }) },
      { label: "Delete page", danger: true, run: () => confirmBox("Delete page", `Delete “${pg.name}” and everything on it? This can't be undone.`, "Delete page", () => {
        Store.remove("library", id); if (S.view === "lib:" + id) S.view = "cat:" + catOf(pg); toast("Page deleted"); render();
      }) }
    ]);
  }
  /* page images: stored as artifact assets (ids kept on the page doc); data URLs only when testing outside claude.ai */
  /* page videos: full-size files play only in the desktop copy (file:// paths); the online vault shows where they are */
  const isDesktop = () => S.mode === "local";
  const fileUrl = (path) => "file:///" + String(path).replace(/\\/g, "/").split("/").map((seg, i) => (i === 0 && /^[A-Za-z]:$/.test(seg)) ? seg : encodeURIComponent(seg)).join("/");
  const vidTitle = (v) => v.title || String(v.path || "").split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
  /* videos: an online link (YouTube, Google Drive, Vimeo or a direct .mp4/.webm) plays anywhere; a file path on this PC plays only when the vault is opened from this PC */
  const isLink = (p) => /^https?:\/\//i.test(String(p || ""));
  function videoEmbed(url) {
    let m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/))) return { kind: "frame", src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0&modestbranding=1" };
    if ((m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([A-Za-z0-9_-]{10,})/))) return { kind: "frame", src: "https://drive.google.com/file/d/" + m[1] + "/preview" };
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/))) return { kind: "frame", src: "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : "") };
    if (/\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(url)) return { kind: "file", src: url };
    return null;
  }
  function videoBlock(pg) {
    const vids = pg.videos || [];
    if (!vids.length && pg.source === "brain") return "";
    const canEdit = pg.source !== "brain";
    const cap = (v, i) => `<figcaption><span>${esc(vidTitle(v))}</span>${canEdit ? `<button class="icon-btn" data-vid-del="${i}" aria-label="Remove video" title="Remove video">${I.close}</button>` : ""}</figcaption>`;
    return `<div class="vid-block">
      ${vids.map((v, i) => {
        if (isLink(v.path)) {
          const e = videoEmbed(v.path);
          if (e && e.kind === "frame") return `<figure class="vid"><div class="vid-frame"><iframe src="${esc(e.src)}" title="${esc(vidTitle(v))}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>${cap(v, i)}</figure>`;
          if (e) return `<figure class="vid"><video controls preload="metadata" src="${esc(e.src)}"></video>${cap(v, i)}</figure>`;
          return `<div class="vid-card"><span class="vid-badge">Video</span><div style="min-width:0"><b>${esc(vidTitle(v))}</b><div class="vid-path"><a class="doc-link" href="${esc(v.path)}" target="_blank" rel="noopener noreferrer">Open the video</a></div></div></div>`;
        }
        if (location.protocol === "file:") return `<figure class="vid"><video controls preload="metadata" src="${esc(fileUrl(v.path))}"></video>${cap(v, i)}</figure>`;
        return `<div class="vid-card"><span class="vid-badge">Video</span><div style="min-width:0"><b>${esc(vidTitle(v))}</b><div class="vid-path">This video is saved on Kim's PC, so it plays only in the desktop copy. Add an online link (YouTube, Google Drive or Vimeo) to play it here.</div></div>${canEdit ? `<button class="icon-btn" data-vid-del="${i}" aria-label="Remove video" title="Remove video">${I.close}</button>` : ""}</div>`;
      }).join("")}
      ${canEdit ? `<button class="btn sm" id="addVid">${I.plus}Add video</button>` : ""}
    </div>`;
  }
  function addVideo() {
    const id = S.view.slice(4), cur = S.library.get(id); if (!cur) return;
    nameBox("Add video", "YouTube, Google Drive or Vimeo link (or a file path on this PC)", "", "Add video", (v) => {
      const path = v.replace(/^"+|"+$/g, "").trim();
      if (isLink(path)) { if (!videoEmbed(path)) toast("Saved. This link will open in a new tab instead of playing here."); }
      else if (!/^[A-Za-z]:[\/]/.test(path)) { toast("Paste a YouTube, Google Drive or Vimeo link, or a full path like C:\Users\kimbe\Videos\lesson.mp4"); return; }
      Store.write("library", id, Object.assign({}, cur, { videos: (cur.videos || []).concat({ path, title: "" }), updatedAt: now() }));
      renderLibPage();
    });
  }
  function removeVideo(i) {
    const id = S.view.slice(4), cur = S.library.get(id); if (!cur) return;
    confirmBox("Remove video", "Remove this video from the page? The file on your computer stays where it is.", "Remove video", () => {
      Store.write("library", id, Object.assign({}, cur, { videos: (cur.videos || []).filter((_, k) => k !== i), updatedAt: now() }));
      renderLibPage();
    });
  }
  const imgSrc = (im) => im.local || (window.VAULT_ASSETS && window.VAULT_ASSETS[im.id]) || ("/_blob/" + im.id);
  const canAddImages = () => !!S.assets || S.mode === "local";
  async function addImages(files) {
    const id = S.view.startsWith("lib:") ? S.view.slice(4) : null; if (!id) return;
    const list = [...files].filter((f) => /^image\/(png|jpeg|gif|webp)$/.test(f.type));
    if (!list.length) { toast("Choose a PNG, JPG, GIF, or WebP image"); return; }
    flushLib();
    for (const f of list) {
      if (f.size > 20 * 1024 * 1024) { toast(f.name + " is over 20 MB"); continue; }
      let entry;
      try {
        if (S.assets) { const r = await S.assets.upload(f); entry = { id: r.id, caption: "", addedAt: now() }; }
        else {
          if (f.size > 1.5 * 1024 * 1024) { toast("In this test copy, images must be under 1.5 MB"); continue; }
          const data = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(f); });
          entry = { id: "local" + uid(), local: data, caption: "", addedAt: now() };
        }
      } catch (e) {
        const c = e && e.code;
        toast(c === "too_large" ? "That image is too large" : c === "quota_or_state" ? "Image storage is full" : c === "unsupported_type" ? "That file type isn't supported" : "Couldn't add the image. Try again.");
        continue;
      }
      const cur = S.library.get(id); if (!cur) return;
      Store.write("library", id, Object.assign({}, cur, { images: (cur.images || []).concat(entry), updatedAt: now() }));
    }
    toast(list.length === 1 ? "Image added" : "Images added");
    renderLibPage();
  }
  function removeImage(idx) {
    const id = S.view.slice(4), cur = S.library.get(id); if (!cur) return;
    const im = (cur.images || [])[idx]; if (!im) return;
    confirmBox("Remove image", "Remove this image from the page? This can't be undone.", "Remove image", async () => {
      Store.write("library", id, Object.assign({}, cur, { images: cur.images.filter((_, i) => i !== idx), updatedAt: now() }));
      if (S.assets && !im.local) { try { await S.assets.delete(im.id); } catch (e) {} }
      toast("Image removed"); renderLibPage();
    });
  }
  function viewImage(idx) {
    const cur = S.library.get(S.view.slice(4)); const im = cur && (cur.images || [])[idx]; if (!im) return;
    const d = dialog(im.caption || "Image", `<img class="img-full" src="${esc(imgSrc(im))}" alt="${esc(im.caption || "Page image")}">`);
    d.querySelector(".dialog").classList.add("wide");
  }
  /* document view: a small, escaped Markdown subset (#, ##, ###, -, 1., >, **bold**, ---) */
  function inlineMd(t) {
    return esc(t).replace(/&lt;br&gt;/g, "<br>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((lib:[A-Za-z0-9_.~:@+-]+|https?:\/\/[^\s)]+|file:\/\/\/[^\s)]+)\)/g, (m, label, href) => href.startsWith("lib:")
        ? `<a class="doc-link" href="#" data-nav="${href}">${label}</a>` : `<a class="doc-link" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
  }
  function renderDoc(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n");
    let html = "", list = null, para = [], table = null;
    const cellsOf = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    const flushTable = () => {
      if (!table) return;
      const rows = table.filter((r) => !r.every((c) => /^:?-{3,}:?$/.test(c)));
      const [head, ...rest] = rows;
      html += `<div class="doc-table"><table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${rest.map((r) => `<tr>${head.map((_, i) => `<td>${inlineMd(r[i] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      table = null;
    };
    const flushPara = () => { if (para.length) { html += `<p>${para.map(inlineMd).join("<br>")}</p>`; para = []; } };
    const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const line = raw.trimEnd();
      let m;
      if (/^\s*\|.*\|\s*$/.test(line)) { flushPara(); closeList(); (table = table || []).push(cellsOf(line)); continue; }
      flushTable();
      if (!line.trim()) { flushPara(); closeList(); continue; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flushPara(); closeList(); const n = m[1].length + 1; html += `<h${n}>${inlineMd(m[2])}</h${n}>`; continue; }
      if (/^-{3,}$/.test(line.trim())) { flushPara(); closeList(); html += "<hr>"; continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); closeList(); html += `<div class="doc-note">${inlineMd(m[1])}</div>`; continue; }
      if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flushPara(); if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; } html += `<li>${inlineMd(m[1])}</li>`; continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; } html += `<li>${inlineMd(m[1])}</li>`; continue; }
      if (list && /^\s{2,}\S/.test(raw)) { html = html.replace(/<\/li>$/, `<br><span class="li-sub">${inlineMd(line.trim())}</span></li>`); continue; }
      closeList(); para.push(line);
    }
    flushPara(); closeList(); flushTable();
    return html;
  }
  /* ---------- Glossary: definition of terms from data/glossary.json, one block per group, A to Z inside each ---------- */
  let glossQ = "";
  function renderGlossary() {
    $("#topTitle").textContent = "Glossary";
    const groups = (window.VAULT_GLOSSARY || []).map((g, gi) => ({ id: "g" + gi, name: g.name, about: g.about || "", terms: (g.terms || []).map(([term, also, def]) => ({ term, also, def })).sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: "base" })) }));
    const total = groups.reduce((n, g) => n + g.terms.length, 0);
    $("#view").innerHTML = `
      <div class="head"><h1>Glossary</h1><span class="sub">${total} terms · ${groups.length} groups</span></div>
      <div class="toolbar"><label class="search">${I.search}<input id="glossQ" type="search" placeholder="Search a term or its meaning" value="${esc(glossQ)}" aria-label="Search the glossary"></label></div>
      <nav class="gl-jump" aria-label="Glossary groups">${groups.map((g) => `<button class="st-chip" data-gl-jump="${g.id}">${esc(g.name)}<span>${g.terms.length}</span></button>`).join("")}</nav>
      <div id="glossBody"></div>`;
    const paint = () => {
      const q = glossQ.trim().toLowerCase();
      const shown = groups.map((g) => Object.assign({}, g, { terms: q ? g.terms.filter((t) => [t.term, t.also, t.def].join(" ").toLowerCase().includes(q)) : g.terms })).filter((g) => g.terms.length);
      $("#glossBody").innerHTML = shown.length ? shown.map((g) => `
        <section class="mod-sec gl-sec" id="${g.id}">
          <div class="mod-sec-head"><h2>${esc(g.name)}</h2><span class="sub">${g.terms.length} ${g.terms.length === 1 ? "term" : "terms"}</span></div>
          ${g.about ? `<p class="gl-about">${esc(g.about)}</p>` : ""}
          <div class="gl-grid">${g.terms.map((t) => `<article class="gl-card"><h3>${esc(t.term)}</h3>${t.also ? `<div class="gl-also">${esc(t.also)}</div>` : ""}<p>${esc(t.def)}</p></article>`).join("")}</div>
        </section>`).join("") : `<div class="empty"><h2>No terms match</h2><p>Try a shorter word, or clear the search.</p></div>`;
    };
    paint();
    $("#glossQ").addEventListener("input", (e) => { glossQ = e.target.value; paint(); });
    $(".gl-jump").addEventListener("click", (e) => { const b = e.target.closest("[data-gl-jump]"); if (!b) return; glossQ = ""; $("#glossQ").value = ""; paint(); const sec = $("#" + b.dataset.glJump); if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }

  /* ---------- Study Timer: focus and break countdowns, chime + notification, ambient sound made in the browser or Kim's own music files ---------- */
  /* Scenery background: the desktop copy ships theme/peaceful-bg.webp; on by default, switch in the sidebar footer */
  const sceneOn = () => { let v = null; try { v = localStorage.getItem("pl-scene"); } catch (e) {} return !!window.VAULT_SEED && v !== "off"; };
  const applyScene = () => document.body.classList.toggle("scenic", sceneOn());
  applyScene();
  const STUDY_MODES = { focus: "Focus", short: "Short break", long: "Long break" };
  const STUDY_SOUNDS = [["off", "Off"], ["rain", "Rain"], ["brown", "Brown noise"], ["ocean", "Ocean"], ["focus", "Deep focus"], ["music", "My music"]];
  const ST = { focus: 25, short: 5, long: 15, autoBreak: true, chime: true, follow: true, sound: "off", volume: 0.5, mode: "focus", endAt: 0, left: 0, total: 0, log: [] };
  try { Object.assign(ST, JSON.parse(localStorage.getItem("pl-study") || "{}")); } catch (e) {}
  if (!ST.total) { ST.total = ST.focus * 60; ST.left = ST.total; }
  const saveStudy = () => { try { localStorage.setItem("pl-study", JSON.stringify(ST)); } catch (e) {} };
  const baseTitle = document.title;
  const studyRunning = () => ST.endAt > 0;
  const studyLeft = () => studyRunning() ? Math.max(0, (ST.endAt - now()) / 1000) : ST.left;
  const mmss = (s) => { s = Math.ceil(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const studyIdle = () => !studyRunning() && ST.left >= ST.total;
  const studyBadge = () => studyIdle() ? null : mmss(studyLeft());
  const todayLog = () => { const d = new Date().toDateString(); return ST.log.filter((x) => new Date(x.at).toDateString() === d); };

  function studySet(mode) { ST.mode = mode; ST.endAt = 0; ST.total = Math.round(ST[mode] * 60); ST.left = ST.total; saveStudy(); }
  function studyStart() {
    if (ST.left <= 0) ST.left = ST.total;
    ST.endAt = now() + ST.left * 1000; saveStudy();
    if (ST.sound !== "off") soundOn(ST.sound);
    if ("Notification" in window && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
  }
  function studyPause() { ST.left = studyLeft(); ST.endAt = 0; saveStudy(); if (ST.follow) soundPause(); }
  function studyReset() { studySet(ST.mode); if (ST.follow) soundPause(); }
  function studyDone() {
    const was = ST.mode;
    ST.endAt = 0; ST.left = 0;
    if (was === "focus") ST.log = ST.log.concat({ at: now(), min: Math.round(ST.total / 60) }).slice(-400);
    if (ST.chime) chime();
    const next = was === "focus" ? (todayLog().length % 4 === 0 ? "long" : "short") : "focus";
    const msg = was === "focus" ? `Focus done. Time for a ${STUDY_MODES[next].toLowerCase()} (${ST[next]} min).` : "Break over. Ready to focus again?";
    try { if ("Notification" in window && Notification.permission === "granted") new Notification("Study Timer", { body: msg }); } catch (e) {}
    toast(msg);
    studySet(next);
    if (ST.autoBreak && next !== "focus") studyStart(); else if (ST.follow) soundPause();
    render();
  }

  /* sound: Web Audio noise and drones (nothing to download), or an <audio> playlist of files Kim picks */
  let AC = null, SND = null, MUSIC = { list: [], i: 0, el: null };
  const audioCtx = () => { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; };
  function noise(kind) {
    const a = audioCtx(), len = a.sampleRate * 6, b = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } }
    const s = a.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }
  function soundOn(kind) {
    soundPause(true);
    if (kind === "off") return;
    if (kind === "music") { if (MUSIC.el && MUSIC.list.length) { MUSIC.el.volume = ST.volume; MUSIC.el.play().catch(() => {}); } return; }
    const a = audioCtx(), out = a.createGain(), srcs = [];
    out.gain.value = 0; out.connect(a.destination); out.gain.setTargetAtTime(ST.volume, a.currentTime, 0.6);
    const filt = (type, f, q) => { const n = a.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
    const lfo = (rate, depth, param) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g).connect(param); o.start(); srcs.push(o); };
    if (kind === "rain") {
      const hiss = noise("white"), bp = filt("bandpass", 1500, 0.45), g1 = a.createGain(); g1.gain.value = 0.22; hiss.connect(bp).connect(filt("lowpass", 6000)).connect(g1).connect(out);
      const rumble = noise("brown"), g2 = a.createGain(); g2.gain.value = 0.55; rumble.connect(filt("lowpass", 500)).connect(g2).connect(out);
      lfo(0.13, 0.06, g1.gain); hiss.start(); rumble.start(); srcs.push(hiss, rumble);
    } else if (kind === "brown") {
      const s = noise("brown"), g = a.createGain(); g.gain.value = 0.9; s.connect(filt("lowpass", 900)).connect(g).connect(out); s.start(); srcs.push(s);
    } else if (kind === "ocean") {
      const s = noise("brown"), g = a.createGain(); g.gain.value = 0.55; s.connect(filt("lowpass", 650)).connect(g).connect(out); lfo(0.075, 0.45, g.gain); s.start(); srcs.push(s);
    } else if (kind === "focus") {
      const lp = filt("lowpass", 1100), g = a.createGain(); g.gain.value = 0.9; lp.connect(g).connect(out); lfo(0.05, 0.25, g.gain);
      [[110, 0.07], [164.81, 0.05], [220.5, 0.035], [261.63, 0.03], [329.63, 0.025]].forEach(([f, v], i) => { const o = a.createOscillator(), og = a.createGain(); o.type = i ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = (i % 2 ? 4 : -4); og.gain.value = v; o.connect(og).connect(lp); o.start(); srcs.push(o); });
    }
    SND = { out, srcs };
  }
  function soundPause(hard) {
    if (MUSIC.el) MUSIC.el.pause();
    if (!SND || !AC) return;
    const s = SND; SND = null;
    s.out.gain.cancelScheduledValues(AC.currentTime); s.out.gain.setTargetAtTime(0, AC.currentTime, hard ? 0.05 : 0.4);
    setTimeout(() => s.srcs.forEach((n) => { try { n.stop(); } catch (e) {} }), hard ? 200 : 1500);
  }
  function soundVolume(v) { ST.volume = v; saveStudy(); if (SND && AC) SND.out.gain.setTargetAtTime(v, AC.currentTime, 0.1); if (MUSIC.el) MUSIC.el.volume = v; }
  function musicLoad(files) {
    MUSIC.list.forEach((x) => URL.revokeObjectURL(x.url));
    MUSIC.list = [...files].map((f) => ({ name: f.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(f) })); MUSIC.i = 0;
    if (!MUSIC.el) { MUSIC.el = new Audio(); MUSIC.el.addEventListener("ended", () => musicNext()); }
    MUSIC.el.src = MUSIC.list.length ? MUSIC.list[0].url : "";
    ST.sound = "music"; saveStudy(); soundOn("music");
  }
  function musicNext() { if (!MUSIC.list.length) return; MUSIC.i = (MUSIC.i + 1) % MUSIC.list.length; MUSIC.el.src = MUSIC.list[MUSIC.i].url; MUSIC.el.play().catch(() => {}); if (S.view === "study") renderStudy(); }
  function chime() {
    try {
      const a = audioCtx(), t = a.currentTime;
      [0, 0.5, 1].forEach((d, i) => [1, 1.5, 2.01].forEach((m, j) => { const o = a.createOscillator(), g = a.createGain(); o.type = "sine"; o.frequency.value = (i === 2 ? 1046.5 : 880) * m; g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime([0.2, 0.06, 0.03][j], t + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.8); o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + 1.9); }));
    } catch (e) {}
  }

  function paintStudyPill() {
    let p = $("#studyPill");
    const show = !studyIdle() && S.view !== "study";
    if (!show) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement("button"); p.id = "studyPill"; p.className = "study-pill"; p.dataset.nav = "study"; document.body.appendChild(p); }
    p.innerHTML = `<span class="sp-dot ${studyRunning() ? "on" : ""}"></span><span class="sp-mode">${esc(STUDY_MODES[ST.mode])}</span><b>${mmss(studyLeft())}</b>`;
    p.setAttribute("aria-label", `${STUDY_MODES[ST.mode]} timer, ${mmss(studyLeft())} left. Open Study Timer`);
  }
  function paintStudyTick() {
    const left = studyLeft(), run = studyRunning();
    document.title = studyIdle() ? baseTitle : `${mmss(left)} ${STUDY_MODES[ST.mode]} · ${baseTitle}`;
    const b = $('#side [data-nav="study"] .count'); if (b) b.textContent = mmss(left);
    paintStudyPill();
    const tEl = $("#stTime"); if (!tEl) return;
    tEl.textContent = mmss(left);
    const ring = $("#stRing"); if (ring) ring.style.strokeDashoffset = String(ring.dataset.c * (1 - (ST.total ? left / ST.total : 0)));
    const e = $("#stEnds"); if (e) e.textContent = run ? "Ends at " + new Date(ST.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : (ST.left < ST.total ? "Paused" : "Ready");
  }
  setInterval(() => { if (studyRunning() && studyLeft() <= 0) studyDone(); else paintStudyTick(); }, 250);

  function renderStudy() {
    $("#topTitle").textContent = "Study Timer";
    const R = 118, C = 2 * Math.PI * R, run = studyRunning(), tl = todayLog();
    const todayMin = tl.reduce((n, x) => n + x.min, 0);
    const weekMin = ST.log.filter((x) => now() - x.at < 7 * 864e5).reduce((n, x) => n + x.min, 0);
    const presets = ST.mode === "focus" ? [15, 25, 45, 60, 90] : ST.mode === "short" ? [3, 5, 10] : [10, 15, 20, 30];
    const track = MUSIC.list[MUSIC.i];
    $("#view").innerHTML = `
      <div class="head"><h1>Study Timer</h1><span class="sub">${esc(STUDY_MODES[ST.mode])} · ${ST[ST.mode]} min</span></div>
      <div class="study" id="study">
        <section class="st-card st-main">
          <div class="seg st-modes" role="group" aria-label="Timer mode">${Object.entries(STUDY_MODES).map(([k, v]) => `<button data-st-mode="${k}" class="${ST.mode === k ? "on" : ""}">${v}</button>`).join("")}</div>
          <div class="st-dial">
            <svg viewBox="0 0 280 280" aria-hidden="true"><defs><linearGradient id="stGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3d5afe"/><stop offset="1" stop-color="#00c2ff"/></linearGradient></defs>
              <circle cx="140" cy="140" r="${R}" class="st-track"/><circle id="stRing" cx="140" cy="140" r="${R}" class="st-prog" data-c="${C}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - (ST.total ? studyLeft() / ST.total : 0))}"/></svg>
            <div class="st-face"><div class="st-time" id="stTime" aria-live="off">${mmss(studyLeft())}</div><div class="st-ends" id="stEnds">${run ? "Ends at " + new Date(ST.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : (ST.left < ST.total ? "Paused" : "Ready")}</div></div>
          </div>
          <div class="st-ctrl">
            <button class="st-round sm" id="stReset" aria-label="Reset" title="Reset"><svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v2.8h2.8"/></svg></button>
            <button class="st-round go" id="stGo" aria-label="${run ? "Pause" : "Start"}">${run ? `<svg class="i" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>` : `<svg class="i" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/></svg>`}</button>
            <button class="st-round sm" id="stSkip" aria-label="Skip to next" title="Skip"><svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 3.5l6 4.5-6 4.5zM12.5 3.5v9"/></svg></button>
          </div>
          <div class="st-presets">${presets.map((m) => `<button class="st-chip ${ST[ST.mode] === m ? "on" : ""}" data-st-min="${m}">${m} min</button>`).join("")}
            <label class="st-custom"><input id="stCustom" type="number" min="1" max="240" placeholder="Custom" aria-label="Custom minutes"><span>min</span></label></div>
        </section>
        <div class="st-side">
          <section class="st-card">
            <h3 class="st-h">Sound</h3>
            <div class="st-sounds">${STUDY_SOUNDS.map(([k, v]) => `<button class="st-snd ${ST.sound === k ? "on" : ""}" data-st-sound="${k}">${v}</button>`).join("")}</div>
            ${ST.sound === "music" ? `<div class="st-music"><button class="btn sm" id="stPick">${I.plus}${MUSIC.list.length ? "Change music" : "Choose music files"}</button>${track ? `<span class="st-track-name" title="${esc(track.name)}">${esc(track.name)}</span><button class="btn sm ghost" id="stNext">Next</button>` : `<span class="st-note">MP3 or other audio files from your PC. Pick them again after reopening the vault.</span>`}</div>` : ""}
            <label class="st-vol"><span>Volume</span><input type="range" id="stVol" min="0" max="1" step="0.01" value="${ST.volume}" aria-label="Volume"></label>
          </section>
          <section class="st-card">
            <h3 class="st-h">Today</h3>
            <div class="st-stats"><div><b>${todayMin}</b><span>focus min</span></div><div><b>${tl.length}</b><span>sessions</span></div><div><b>${Math.round(weekMin / 6) / 10}</b><span>hours this week</span></div></div>
            ${tl.length ? `<div class="st-log">${tl.slice(-5).reverse().map((x) => `<div><span>${new Date(x.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span><span>${x.min} min focus</span></div>`).join("")}</div>` : `<p class="st-note">Finished focus sessions show up here.</p>`}
          </section>
          <section class="st-card">
            <h3 class="st-h">Settings</h3>
            <label class="st-tog"><input type="checkbox" data-st-opt="autoBreak" ${ST.autoBreak ? "checked" : ""}><span>Start breaks automatically</span></label>
            <label class="st-tog"><input type="checkbox" data-st-opt="chime" ${ST.chime ? "checked" : ""}><span>Chime when time is up</span></label>
            <label class="st-tog"><input type="checkbox" data-st-opt="follow" ${ST.follow ? "checked" : ""}><span>Pause the sound when the timer pauses</span></label>
          </section>
        </div>
      </div>
      <input type="file" id="stFiles" accept="audio/*" multiple hidden>`;
    const root = $("#study");
    root.addEventListener("click", (e) => {
      const t = e.target; let el;
      if ((el = t.closest("[data-st-mode]"))) { studySet(el.dataset.stMode); if (ST.follow) soundPause(); return render(); }
      if ((el = t.closest("[data-st-min]"))) { ST[ST.mode] = +el.dataset.stMin; studySet(ST.mode); return render(); }
      if ((el = t.closest("[data-st-sound]"))) { ST.sound = el.dataset.stSound; saveStudy(); if (ST.sound === "music" && !MUSIC.list.length) { render(); $("#stFiles").click(); return; } if (studyRunning() || ST.sound === "off" || !ST.follow) soundOn(ST.sound); else soundPause(); return render(); }
      if (t.closest("#stGo")) { studyRunning() ? studyPause() : studyStart(); return render(); }
      if (t.closest("#stReset")) { studyReset(); return render(); }
      if (t.closest("#stSkip")) { ST.endAt = 0; const next = ST.mode === "focus" ? "short" : "focus"; studySet(next); if (ST.follow) soundPause(); return render(); }
      if (t.closest("#stPick")) { $("#stFiles").click(); return; }
      if (t.closest("#stNext")) { musicNext(); return; }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.stOpt) { ST[t.dataset.stOpt] = t.checked; saveStudy(); }
      if (t.id === "stCustom") { const m = Math.round(+t.value); if (m >= 1 && m <= 240) { ST[ST.mode] = m; studySet(ST.mode); render(); } else toast("Pick 1 to 240 minutes"); }
    });
    $("#stCustom").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
    $("#stVol").addEventListener("input", (e) => soundVolume(+e.target.value));
    $("#stFiles").addEventListener("change", (e) => { if (e.target.files.length) { musicLoad(e.target.files); render(); } });
    paintStudyTick();
  }

  /* ---------- Brain Graph: every page is a star, pages cluster into regions (TAG Brain categories, other sections), lines are links between pages ---------- */
  const GRAPH_COLORS = ["#f2c879", "#8fd0ef", "#a9d77a", "#c6b6ff", "#f3a98f", "#7fe0c4", "#f7e7a6", "#ef9fc4", "#9fb8ff", "#d8e6ea", "#ffcf9e", "#b5e8a6", "#9ae3f0", "#e3c8ff"]; /* tones from the lake photo: sunlit gold, sky, meadow, dusk */
  let G = null;
  const GLOWS = new Map();
  const glowOf = (color) => { /* one soft radial glow per color, drawn once and reused every frame */
    if (GLOWS.has(color)) return GLOWS.get(color);
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color + "ff"); gr.addColorStop(0.25, color + "88"); gr.addColorStop(1, color + "00"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    GLOWS.set(color, c); return c;
  };
  function stopGraph() { if (G) { cancelAnimationFrame(G.raf); window.removeEventListener("resize", G.onResize); G = null; } }
  function graphModel() {
    const regions = new Map(), nodes = [], byId = new Map();
    [...S.library.entries()].forEach(([id, pg]) => {
      const cat = catOf(pg), info = CAT_INFO[cat];
      const key = info.section.id === "brain" ? cat : info.section.id;
      const label = info.section.id === "brain" ? info.name : info.section.name;
      if (!regions.has(key)) regions.set(key, { key, label, nodes: [] });
      const n = { id, name: pg.name || "Untitled", region: regions.get(key), deg: 0, links: [] };
      regions.get(key).nodes.push(n); nodes.push(n); byId.set(id, n);
    });
    const edges = [];
    nodes.forEach((n) => {
      const body = String((S.library.get(n.id) || {}).body || ""), seen = new Set();
      body.replace(/\(lib:([A-Za-z0-9_.~:@+-]+)\)/g, (m, t) => { const o = byId.get(t); if (o && o !== n && !seen.has(t)) { seen.add(t); edges.push([n, o]); n.deg++; o.deg++; n.links.push(o); o.links.push(n); } return m; });
    });
    /* layout: regions packed around the center (biggest first), nodes on a sunflower spiral inside each region, most-linked pages in the middle */
    const regs = [...regions.values()].sort((a, b) => b.nodes.length - a.nodes.length);
    regs.forEach((r, i) => {
      r.color = GRAPH_COLORS[i % GRAPH_COLORS.length];
      r.r = 30 + 15 * Math.sqrt(r.nodes.length);
      const a = i * 2.39996, d = i ? 150 + 120 * Math.sqrt(i) : 0;
      r.x = Math.cos(a) * d; r.y = Math.sin(a) * d;
    });
    for (let it = 0; it < 220; it++) regs.forEach((a, i) => regs.forEach((b, j) => {
      if (j <= i) return;
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, min = a.r + b.r + 130;
      if (dist < min) { const push = (min - dist) / 2, ux = dx / dist, uy = dy / dist; if (i) { a.x -= ux * push; a.y -= uy * push; } b.x += ux * push; b.y += uy * push; }
    }));
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    regs.forEach((r) => {
      const list = r.nodes.slice().sort((a, b) => b.deg - a.deg), n = list.length;
      list.slice(0, 3).forEach((nd) => { nd.top = true; });
      list.forEach((nd, k) => { const rad = r.r * Math.sqrt((k + 0.5) / n), ang = k * 2.39996 + rnd() * 0.4; nd.x = r.x + Math.cos(ang) * rad; nd.y = r.y + Math.sin(ang) * rad; nd.size = 1.3 + Math.min(4.2, Math.sqrt(nd.deg) * 0.55); });
    });
    const dust = Array.from({ length: 260 }, () => ({ x: (rnd() - 0.5) * 2600, y: (rnd() - 0.5) * 2000, s: rnd() * 0.9 + 0.2 }));
    return { regs, nodes, edges, dust };
  }
  function renderGraph() {
    stopGraph();
    $("#topTitle").textContent = "Brain Graph";
    const model = graphModel();
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#view").innerHTML = `
      <div class="graph-box" id="graphBox">
        <canvas id="graphCv" aria-label="Brain graph of ${model.nodes.length} pages and ${model.edges.length} links"></canvas>
        <div class="atlas-panel">
          <div class="atlas-title"><span class="atlas-dot"></span>TAG Marketing Brain</div>
          <div class="atlas-sub">${model.nodes.length} notes · ${model.edges.length.toLocaleString()} links · ${still ? "still" : "live"}</div>
          <div class="atlas-rows">${model.regs.map((r, i) => `<button class="atlas-row" data-region="${i}"><span class="atlas-sw" style="background:${r.color};box-shadow:0 0 10px ${r.color}"></span><span class="atlas-name">${esc(r.label)}</span><span class="atlas-n">${r.nodes.length}</span></button>`).join("")}</div>
        </div>
        <div class="atlas-tools"><button class="atlas-btn" id="gLabels">Labels</button><button class="atlas-btn" id="gAll">All</button><button class="atlas-btn on" id="gHome">Reset</button></div>
        <div class="atlas-hint">Drag to move &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click a cell to open it</div>
        <div class="atlas-tip" id="gTip" hidden></div>
      </div>`;
    const cv = $("#graphCv"), box = $("#graphBox"), ctx = cv.getContext("2d");
    const st = { k: 1, x: 0, y: 0, labels: false, focus: null, hover: null, drag: null, t: 0 };
    G = { raf: 0, onResize: () => { size(); home(); } };
    /* neurons: each node drifts around its home spot, clusters breathe, signals travel along links and make cells fire */
    model.nodes.forEach((n, i) => { n.hx = n.x; n.hy = n.y; n.ph = i * 1.37; n.fire = 0; n.amp = 2.2 + (i % 5) * 0.5; });
    model.regs.forEach((r, i) => { r.ph = i * 0.9; });
    model.edges.forEach((e, i) => { e.bend = ((i * 7919) % 100) / 100 - 0.5; });
    const adj = new Map(model.nodes.map((n) => [n, []]));
    model.edges.forEach((e) => { adj.get(e[0]).push(e); adj.get(e[1]).push(e); });
    const pulses = [];
    const spawn = (e, from) => { if (pulses.length < 140) pulses.push({ e, from, p: 0, v: 0.008 + Math.random() * 0.012 }); };
    function size() { const r = box.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + "px"; cv.style.height = r.height + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); st.w = r.width; st.h = r.height; }
    function fit(list, pad) {
      const xs = list.map((n) => n.hx ?? n.x), ys = list.map((n) => n.hy ?? n.y);
      const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
      const panel = box.querySelector(".atlas-panel"), left = st.w > 620 && panel ? panel.offsetLeft + panel.offsetWidth + 10 : 0, aw = st.w - left;
      st.k = Math.min(aw / (maxX - minX), st.h / (maxY - minY)) * 0.9; st.x = left + aw / 2 - ((minX + maxX) / 2) * st.k; st.y = st.h / 2 - ((minY + maxY) / 2) * st.k;
    }
    function home() { st.focus = null; fit(model.nodes.length ? model.nodes : [{ x: 0, y: 0 }], 60); setBtn("gHome"); }
    function setBtn(id) { ["gAll", "gHome"].forEach((b) => $("#" + b).classList.toggle("on", b === id)); }
    const toScreen = (n) => [n.x * st.k + st.x, n.y * st.k + st.y];
    const curvePt = (e, p) => { const [a, b] = e, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, cx = mx - dy * e.bend * 0.35, cy = my + dx * e.bend * 0.35, q = 1 - p; return { x: q * q * a.x + 2 * q * p * cx + p * p * b.x, y: q * q * a.y + 2 * q * p * cy + p * p * b.y, cx, cy }; };
    const font = (w, px, fam) => `${w} ${px}px ${fam === "d" ? "'Plus Jakarta Sans', Inter, sans-serif" : "Inter, ui-sans-serif, sans-serif"}`;
    let lastSpawn = 0;
    function step() {
      st.t += 0.016;
      const t = st.t;
      model.regs.forEach((r) => { r.b = still ? 1 : 1 + 0.035 * Math.sin(t * 0.45 + r.ph); });
      model.nodes.forEach((n) => {
        const r = n.region, ox = (n.hx - r.x) * r.b, oy = (n.hy - r.y) * r.b;
        n.x = r.x + ox + (still ? 0 : Math.sin(t * 0.7 + n.ph) * n.amp + Math.sin(t * 1.9 + n.ph * 2.1) * 0.8);
        n.y = r.y + oy + (still ? 0 : Math.cos(t * 0.6 + n.ph * 1.3) * n.amp + Math.cos(t * 1.7 + n.ph) * 0.8);
        n.fire *= 0.94;
      });
      if (still) return;
      if (t - lastSpawn > 0.09 && model.edges.length) {
        lastSpawn = t;
        const src = st.hover && adj.get(st.hover).length ? st.hover : null;
        if (src) { const e = adj.get(src)[Math.floor(Math.random() * adj.get(src).length)]; spawn(e, src); }
        else { const e = model.edges[Math.floor(Math.random() * model.edges.length)]; spawn(e, Math.random() < 0.5 ? e[0] : e[1]); }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i]; pu.p += pu.v;
        if (pu.p >= 1) {
          const to = pu.e[0] === pu.from ? pu.e[1] : pu.e[0]; to.fire = 1; pulses.splice(i, 1);
          if (Math.random() < (to === st.hover ? 0.9 : 0.38)) { const next = adj.get(to); if (next.length) { const e = next[Math.floor(Math.random() * next.length)]; if (e !== pu.e) spawn(e, to); } }
        }
      }
    }
    function draw() {
      step();
      const { w, h } = st, t = st.t;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.55, h * 0.45, Math.max(w, h) * 0.8);
      bg.addColorStop(0, "#14232a"); bg.addColorStop(0.55, "#0c171c"); bg.addColorStop(1, "#060c0f"); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      model.dust.forEach((d, i) => { const x = d.x * st.k * 0.55 + st.x * 0.55 + w * 0.22 + Math.sin(t * 0.2 + i) * 3, y = d.y * st.k * 0.55 + st.y * 0.55 + h * 0.22 + Math.cos(t * 0.17 + i) * 3; if (x > 0 && x < w && y > 0 && y < h) { ctx.fillStyle = `rgba(200,225,235,${0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * 0.8 + i))})`; ctx.fillRect(x, y, d.s, d.s); } });
      /* region glow: a soft nebula behind each cluster */
      model.regs.forEach((r) => { const [x, y] = toScreen(r), rad = r.r * r.b * st.k * 1.35; if (rad < 4) return; ctx.globalAlpha = st.focus && st.focus !== r ? 0.05 : 0.16; ctx.drawImage(glowOf(r.color), x - rad, y - rad, rad * 2, rad * 2); }); ctx.globalAlpha = 1;
      const act = st.hover, focusReg = st.focus;
      ctx.lineWidth = 0.7;
      /* links drawn in three batches (same cluster, across clusters, hovered) instead of one stroke each */
      const paths = { inner: new Path2D(), cross: new Path2D(), hot: new Path2D(), dim: new Path2D() };
      model.edges.forEach((e) => {
        const [a, b] = e, hot = act && (a === act || b === act), dim = focusReg && a.region !== focusReg && b.region !== focusReg;
        const path = hot ? paths.hot : dim ? paths.dim : a.region === b.region ? paths.inner : paths.cross;
        const c = curvePt(e, 0.5), [x1, y1] = toScreen(a), [x2, y2] = toScreen(b);
        path.moveTo(x1, y1); path.quadraticCurveTo(c.cx * st.k + st.x, c.cy * st.k + st.y, x2, y2);
      });
      ctx.strokeStyle = "rgba(190,215,225,.035)"; ctx.stroke(paths.inner);
      ctx.strokeStyle = "rgba(190,215,225,.06)"; ctx.stroke(paths.cross);
      ctx.strokeStyle = "rgba(190,215,225,.01)"; ctx.stroke(paths.dim);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1; ctx.stroke(paths.hot);
      /* signals */
      ctx.globalCompositeOperation = "lighter";
      pulses.forEach((pu) => {
        const fwd = pu.e[0] === pu.from, col = pu.from.region.color;
        for (let k = 0; k < 5; k++) {
          const p = Math.max(0, pu.p - k * 0.025), q = fwd ? p : 1 - p, pt = curvePt(pu.e, q), x = pt.x * st.k + st.x, y = pt.y * st.k + st.y;
          ctx.globalAlpha = (1 - k / 5) * 0.9; ctx.fillStyle = k ? col : "#ffffff"; ctx.beginPath(); ctx.arc(x, y, k ? 1.6 : 2.1, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      /* neurons */
      model.nodes.forEach((n, i) => {
        const [x, y] = toScreen(n); if (x < -30 || x > w + 30 || y < -30 || y > h + 30) return;
        const linked = act && (n === act || act.links.includes(n)), dim = (focusReg && n.region !== focusReg) || (act && !linked);
        const breathe = 0.8 + 0.2 * Math.sin(t * 1.3 + n.ph);
        const r = n.size * Math.max(0.75, Math.min(2.2, Math.sqrt(st.k))) * (n === act ? 1.9 : 1) * (1 + n.fire * 0.9);
        if (!dim) { const halo = r * (3.2 + n.fire * 3); ctx.globalAlpha = breathe * (n.fire > 0.15 ? 1 : 0.55); ctx.drawImage(glowOf(n.region.color), x - halo, y - halo, halo * 2, halo * 2); }
        ctx.globalAlpha = dim ? 0.14 : Math.min(1, breathe + n.fire);
        ctx.fillStyle = n.fire > 0.3 ? "#ffffff" : n.region.color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      /* region names */
      ctx.textAlign = "center";
      model.regs.forEach((r) => { const [x, y] = toScreen({ x: r.x, y: r.y - r.r * r.b - 16 }); ctx.font = font(700, 13, "d"); ctx.fillStyle = focusReg && focusReg !== r ? "rgba(235,242,245,.22)" : "rgba(240,246,248,.88)"; ctx.fillText(r.label, x, y); ctx.font = font(500, 10.5); ctx.fillStyle = focusReg && focusReg !== r ? "rgba(235,242,245,.15)" : "rgba(200,215,220,.6)"; ctx.fillText(`${r.nodes.length} notes`, x, y + 14); });
      if (st.labels || st.k > 2.2 || act) {
        ctx.font = font(500, 11.5);
        model.nodes.forEach((n) => {
          const show = act ? (n === act || act.links.includes(n)) : (st.labels && (n.top || st.k > 2.6)) || st.k > 4;
          if (!show || (focusReg && n.region !== focusReg && !(act && act.links.includes(n)))) return;
          const [x, y] = toScreen(n); if (x < 0 || x > st.w || y < 0 || y > st.h) return;
          const label = n.name.length > 44 ? n.name.slice(0, 42) + "…" : n.name, tw = ctx.measureText(label).width;
          ctx.fillStyle = "rgba(8,16,20,.62)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2 - 7, y - 25, tw + 14, 18, 9) : ctx.rect(x - tw / 2 - 7, y - 25, tw + 14, 18); ctx.fill();
          ctx.fillStyle = n === act ? "#fff" : "rgba(235,242,245,.9)"; ctx.fillText(label, x, y - 12);
        });
      }
      G.raf = requestAnimationFrame(draw);
    }
    function pick(mx, my) { let best = null, bd = 12; model.nodes.forEach((n) => { const [x, y] = toScreen(n), d = Math.hypot(x - mx, y - my); if (d < bd && (!st.focus || n.region === st.focus)) { bd = d; best = n; } }); return best; }
    const tip = $("#gTip");
    cv.addEventListener("mousemove", (e) => {
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (st.drag) { st.x = st.drag.x + (e.clientX - st.drag.mx); st.y = st.drag.y + (e.clientY - st.drag.my); st.drag.moved = st.drag.moved || Math.abs(e.clientX - st.drag.mx) + Math.abs(e.clientY - st.drag.my) > 3; return; }
      const was = st.hover; st.hover = pick(mx, my); cv.style.cursor = st.hover ? "pointer" : "grab";
      if (st.hover && st.hover !== was) { st.hover.fire = 1; adj.get(st.hover).slice(0, 6).forEach((ed) => spawn(ed, st.hover)); }
      if (st.hover) { tip.hidden = false; tip.innerHTML = `<b>${esc(st.hover.name)}</b><span><i style="background:${st.hover.region.color}"></i>${esc(st.hover.region.label)} · ${st.hover.deg} links</span>`; tip.style.left = Math.min(mx + 16, st.w - 270) + "px"; tip.style.top = (my + 16) + "px"; } else tip.hidden = true;
    });
    cv.addEventListener("mouseleave", () => { st.hover = null; tip.hidden = true; st.drag = null; });
    cv.addEventListener("mousedown", (e) => { st.drag = { mx: e.clientX, my: e.clientY, x: st.x, y: st.y, moved: false }; cv.style.cursor = "grabbing"; });
    window.addEventListener("mouseup", function up(e) {
      if (!G) { window.removeEventListener("mouseup", up); return; }
      const d = st.drag; st.drag = null; cv.style.cursor = "grab";
      if (d && !d.moved && e.target === cv) { const r = cv.getBoundingClientRect(), n = pick(e.clientX - r.left, e.clientY - r.top); if (n) { S.view = "lib:" + n.id; S.openId = null; render(); $("#main").scrollTop = 0; } }
    });
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), k = Math.max(0.15, Math.min(12, st.k * f));
      st.x = mx - (mx - st.x) * (k / st.k); st.y = my - (my - st.y) * (k / st.k); st.k = k;
    }, { passive: false });
    box.addEventListener("click", (e) => {
      const row = e.target.closest("[data-region]");
      if (row) { const reg = model.regs[+row.dataset.region]; st.focus = st.focus === reg ? null : reg; box.querySelectorAll(".atlas-row").forEach((b) => b.classList.toggle("on", st.focus && b === row)); if (st.focus) { fit(reg.nodes, 40); setBtn(null); reg.nodes.slice(0, 8).forEach((n) => { n.fire = 1; adj.get(n).slice(0, 2).forEach((ed) => spawn(ed, n)); }); } else home(); return; }
      if (e.target.closest("#gLabels")) { st.labels = !st.labels; e.target.closest("#gLabels").classList.toggle("on", st.labels); return; }
      if (e.target.closest("#gAll")) { st.focus = null; box.querySelectorAll(".atlas-row").forEach((b) => b.classList.remove("on")); fit(model.nodes, 140); setBtn("gAll"); return; }
      if (e.target.closest("#gHome")) { box.querySelectorAll(".atlas-row").forEach((b) => b.classList.remove("on")); home(); }
    });
    window.addEventListener("resize", G.onResize);
    size(); home(); draw();
  }
  /* ---------- TAG Brain sources: where each note came from, browsed inside the vault (names, sizes, dates; files open only on this PC) ---------- */
  const WORK_ROOT = "C:\\TAG Marketing Claude";
  const srcInfo = (rel) => (window.VAULT_SOURCES || {})[rel];
  const winPath = (rel) => rel ? WORK_ROOT + "\\" + rel.replace(/\//g, "\\") : WORK_ROOT;
  const onThisPC = () => location.protocol === "file:";
  const fmtSize = (b) => b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const FILE_KINDS = { pdf: "PDF", md: "MD", txt: "TXT", docx: "DOC", doc: "DOC", xlsx: "SHEET", csv: "CSV", tsv: "CSV", html: "HTML", png: "IMG", jpg: "IMG", jpeg: "IMG", webp: "IMG", gif: "IMG", svg: "IMG", mp4: "VIDEO", json: "JSON", py: "CODE", js: "CODE", php: "CODE", ps1: "CODE", sh: "CODE", zip: "ZIP", pptx: "SLIDES" };
  const kindOf = (name) => { const e = (/\.([^.]+)$/.exec(name) || [])[1]; return e ? FILE_KINDS[e.toLowerCase()] || e.toUpperCase().slice(0, 5) : "FILE"; };
  const KIND_MEANING = { FOLDER: "Folder: holds other files and folders", PDF: "PDF document", MD: "Markdown note (plain text with simple formatting)", TXT: "Plain text file", DOC: "Word document", SHEET: "Excel spreadsheet", CSV: "Spreadsheet data saved as plain text (comma or tab separated)", HTML: "Web page file", IMG: "Image (PNG, JPG, WEBP, GIF or SVG)", VIDEO: "Video file", JSON: "Structured data file used by apps and scripts", CODE: "Script or code file (Python, JavaScript, PHP, PowerShell or shell)", ZIP: "Compressed archive holding other files", SLIDES: "PowerPoint presentation", FILE: "File" };
  const kindTitle = (k) => KIND_MEANING[k] || k + " file";
  function sourceCard(rel) {
    const info = srcInfo(rel), isDir = !info || info.k !== "file", name = rel ? rel.split("/").pop() : "TAG Marketing Claude";
    const meta = !info ? "" : info.k === "dir" ? `${info.total} ${info.total === 1 ? "item" : "items"}` : info.k === "file" ? `${kindOf(name)} · ${fmtSize(info.s)} · Created ${fmtDate(info.b || info.m)}` : "Moved or renamed";
    return `<button class="src-card" data-src-open="${esc(rel)}" title="${esc(winPath(rel))}">
      <span class="src-ico">${isDir ? `<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M1.8 4.2a1 1 0 0 1 1-1h3.4l1.5 1.6h5.5a1 1 0 0 1 1 1v6.6a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z"/></svg>` : `<svg class="i" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M4 1.8h5.2L12.5 5v9.2H4z"/><path d="M9 1.8V5h3.5"/></svg>`}</span>
      <span class="src-txt"><span class="src-k">Source ${isDir ? "folder" : "file"}</span><b>${esc(name)}</b><span class="src-path">${rel ? rel.split("/").map(esc).join(I.chev) : "Work folder"}${meta ? " · " + esc(meta) : ""}</span></span>
      <span class="src-go">${isDir ? "View folder" : "View file"}</span></button>`;
  }
  /* file previews made at build time (tools/previews.py): text/table/document data arrive through a <script> tag so they also load from file:// */
  const PV = new Map(), PV_WAIT = new Map();
  window.__vaultPreview = (h, data) => { PV.set(h, data); (PV_WAIT.get(h) || []).forEach((f) => f(data)); PV_WAIT.delete(h); };
  function loadPreview(h) {
    if (PV.has(h)) return Promise.resolve(PV.get(h));
    return new Promise((res, rej) => {
      const first = !PV_WAIT.has(h);
      PV_WAIT.set(h, (PV_WAIT.get(h) || []).concat(res));
      if (first) { const s = document.createElement("script"); s.src = "previews/" + h + ".js"; s.onerror = () => { PV_WAIT.delete(h); rej(new Error("missing")); }; document.head.appendChild(s); }
    });
  }
  const KIND_GROUPS = { docs: ["MD", "TXT", "DOC", "PDF", "SLIDES"], sheets: ["SHEET", "CSV"], images: ["IMG"], code: ["CODE", "JSON", "HTML"], folders: ["FOLDER"] };
  const fmtDay = (t) => t ? new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const dayStart = (v) => v ? new Date(v + "T00:00:00").getTime() : null;
  function fileMeta(rel) {
    const own = srcInfo(rel); if (own && own.k === "file") return own;
    const i = rel.lastIndexOf("/"), parent = srcInfo(i < 0 ? "" : rel.slice(0, i)), name = rel.slice(i + 1);
    return parent && parent.items ? parent.items.find((x) => x.n === name && !x.d) : null;
  }
  const SB = { q: "", kind: "all", field: "b", from: "", to: "", sort: "new" };
  function sourceBox(rel) {
    const d = dialog("Source", `<div id="srcBody"></div>`, `<button class="btn" id="srcCopy">${I.copy}Copy path</button><button class="btn primary" data-close>Done</button>`);
    d.querySelector(".dialog").classList.add("wide", "src-dialog");
    const crumbsOf = (r, fileName) => {
      const parts = r ? r.split("/") : [];
      return `<div class="src-crumbs">${[`<button class="src-crumb" data-src-go="">TAG Marketing Claude</button>`].concat(parts.map((p, i) => { const sub = parts.slice(0, i + 1).join("/"); return srcInfo(sub) && (i < parts.length - 1 || fileName) ? `<button class="src-crumb" data-src-go="${esc(sub)}">${esc(p)}</button>` : `<span class="src-crumb cur">${esc(p)}</span>`; })).concat(fileName ? [`<span class="src-crumb cur">${esc(fileName)}</span>`] : []).join(`<span class="crumb-sep" aria-hidden="true">${I.chev}</span>`)}</div>`;
    };
    const dates = (x) => `<span class="src-date" title="Created">${esc(fmtDay(x.b))}</span><span class="src-date" title="Modified">${esc(fmtDay(x.m))}</span>`;
    const paintList = (r) => {
      const info = srcInfo(r), body = $("#srcList", d); if (!body || !info || info.k !== "dir") return;
      const q = SB.q.trim().toLowerCase(), from = dayStart(SB.from), to = dayStart(SB.to);
      let items = info.items.filter((it) => {
        const kind = it.d ? "FOLDER" : kindOf(it.n), t = it[SB.field] || 0;
        if (q && !it.n.toLowerCase().includes(q)) return false;
        if (SB.kind !== "all" && !(KIND_GROUPS[SB.kind] || []).includes(kind)) return false;
        if (from && t < from) return false;
        if (to && t >= to + 864e5) return false;
        return true;
      });
      const by = { new: (a, b) => (b[SB.field] || 0) - (a[SB.field] || 0), old: (a, b) => (a[SB.field] || 0) - (b[SB.field] || 0), name: (a, b) => a.n.localeCompare(b.n, undefined, { numeric: true }), size: (a, b) => (b.s || 0) - (a.s || 0) }[SB.sort];
      items = items.slice().sort((a, b) => (b.d || 0) - (a.d || 0) || by(a, b));
      body.innerHTML = items.length ? items.map((it) => {
        const sub = r ? r + "/" + it.n : it.n;
        if (it.d) { const can = !!srcInfo(sub); return `<${can ? `button data-src-go="${esc(sub)}"` : "div"} class="src-row dir"><span class="src-badge dir" title="${esc(kindTitle("FOLDER"))}">FOLDER</span><span class="src-name">${esc(it.n)}</span><span class="src-size">${it.c} ${it.c === 1 ? "item" : "items"}</span>${dates(it)}</${can ? "button" : "div"}>`; }
        const k = kindOf(it.n), ok = it.pv && it.pv.t;
        return `<button class="src-row ${ok ? "" : "nopv"}" data-src-file="${esc(sub)}" title="${esc(ok ? "Preview " + it.n : (it.pv && it.pv.x) || "No preview")}"><span class="src-badge" title="${esc(kindTitle(k))}">${esc(k)}</span><span class="src-name">${esc(it.n)}</span><span class="src-size">${esc(fmtSize(it.s))}</span>${dates(it)}</button>`;
      }).join("") : `<p class="muted src-empty">No files match these filters.</p>`;
      $("#srcCount", d).textContent = `${items.length} of ${info.total}`;
    };
    const paint = (r) => {
      const info = srcInfo(r);
      d.dataset.rel = r;
      if (info && info.k === "file") return paintFile(r);
      let body;
      if (!info) body = `<p class="muted">This location isn't in the vault's file list. It may be deeper than the folders that were listed.</p>`;
      else if (info.k === "missing") body = `<p class="muted">This file or folder was moved or renamed since the note was written.</p>`;
      else body = `
        <div class="src-filters">
          <label class="search">${I.search}<input id="sbQ" type="search" placeholder="Filter by name" value="${esc(SB.q)}" aria-label="Filter files by name"></label>
          <select class="chip-select ${SB.kind !== "all" ? "set" : ""}" id="sbKind" aria-label="File type"><option value="all">All types</option>${Object.keys(KIND_GROUPS).map((k) => `<option value="${k}" ${SB.kind === k ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)}</option>`).join("")}</select>
          <select class="chip-select" id="sbField" aria-label="Date to filter by"><option value="b" ${SB.field === "b" ? "selected" : ""}>Date created</option><option value="m" ${SB.field === "m" ? "selected" : ""}>Date modified</option></select>
          <label class="src-date-in">From<input type="date" id="sbFrom" value="${esc(SB.from)}"></label>
          <label class="src-date-in">To<input type="date" id="sbTo" value="${esc(SB.to)}"></label>
          <select class="chip-select" id="sbSort" aria-label="Sort"><option value="new" ${SB.sort === "new" ? "selected" : ""}>Newest first</option><option value="old" ${SB.sort === "old" ? "selected" : ""}>Oldest first</option><option value="name" ${SB.sort === "name" ? "selected" : ""}>Name A to Z</option><option value="size" ${SB.sort === "size" ? "selected" : ""}>Largest first</option></select>
          <button class="clear-link" id="sbClear">Clear</button><span class="src-count" id="srcCount"></span>
        </div>
        <div class="src-head"><span>Type</span><span>Name</span><span>Size</span><span>Created</span><span>Modified</span></div>
        <div class="src-list" id="srcList"></div>${info.total > info.items.length ? `<p class="muted">Listing the first ${info.items.length} of ${info.total} items.</p>` : ""}`;
      $("#srcBody", d).innerHTML = `${crumbsOf(r)}${body}`;
      paintList(r);
    };
    const paintFile = async (r) => {
      d.dataset.rel = r;
      const meta = fileMeta(r) || {}, name = r.split("/").pop(), k = kindOf(name), pv = meta.pv || {}, i = r.lastIndexOf("/"), parent = i < 0 ? "" : r.slice(0, i);
      $("#srcBody", d).innerHTML = `${crumbsOf(parent, name)}
        <div class="pv-head"><span class="src-badge" title="${esc(kindTitle(k))}">${esc(k)}</span><div class="pv-title"><b>${esc(name)}</b><span>${esc(fmtSize(meta.s))}${meta.b ? " · Created " + esc(fmtDay(meta.b)) : ""}${meta.m ? " · Modified " + esc(fmtDay(meta.m)) : ""}</span></div>
          ${srcInfo(parent) ? `<button class="btn sm" data-src-go="${esc(parent)}">${I.back}Back to folder</button>` : ""}${onThisPC() ? `<a class="btn sm" href="${esc(fileUrl(winPath(r)))}" target="_blank" rel="noopener">${I.external}Open original</a>` : ""}</div>
        <div class="pv-body" id="pvBody">${pv.t ? `<div class="loading">Loading preview…</div>` : `<div class="pv-none"><b>No preview</b><p>${esc(pv.x || "This file can't be shown inside the vault.")}</p></div>`}</div>`;
      if (!pv.t) return;
      const box = $("#pvBody", d);
      if (pv.t === "p") { box.innerHTML = `<iframe class="pv-frame" src="files/${esc(pv.f)}" title="${esc(name)}"></iframe>`; return; }
      if (pv.t === "i") { box.innerHTML = `<img class="pv-img" src="files/${esc(pv.f)}" alt="${esc(name)}">`; return; }
      if (pv.t === "w") { box.innerHTML = `<iframe class="pv-frame" sandbox src="files/${esc(pv.f)}" title="${esc(name)}"></iframe>`; return; }
      try {
        const data = await loadPreview(pv.h);
        if (d.dataset.rel !== r) return;
        if (pv.t === "m" || pv.t === "d") box.innerHTML = `<article class="doc pv-doc">${renderDoc(data.text) || `<p class="doc-empty">This file is empty.</p>`}</article>`;
        else if (pv.t === "c") box.innerHTML = `<pre class="pv-code">${esc(data.text)}</pre>`;
        else if (pv.t === "g") {
          const sheetHtml = (sh) => !sh.rows.length ? `<p class="muted">This sheet is empty.</p>` : `<div class="doc-table pv-table"><table><thead><tr>${sh.rows[0].map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${sh.rows.slice(1).map((row) => `<tr>${sh.rows[0].map((_, j) => `<td>${esc(row[j] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${sh.total > sh.rows.length ? `<p class="muted">Showing the first ${sh.rows.length} of ${sh.total} rows.</p>` : ""}`;
          box.innerHTML = `${data.sheets.length > 1 ? `<div class="seg pv-tabs" role="group" aria-label="Sheets">${data.sheets.map((sh, j) => `<button data-pv-sheet="${j}" class="${j ? "" : "on"}">${esc(sh.name)}</button>`).join("")}</div>` : ""}<div id="pvSheet">${sheetHtml(data.sheets[0])}</div>`;
          box.querySelectorAll("[data-pv-sheet]").forEach((b) => b.addEventListener("click", () => { box.querySelectorAll("[data-pv-sheet]").forEach((x) => x.classList.toggle("on", x === b)); $("#pvSheet", box).innerHTML = sheetHtml(data.sheets[+b.dataset.pvSheet]); }));
        }
      } catch (e) { box.innerHTML = `<div class="pv-none"><b>Preview not found</b><p>Rebuild the vault to make this preview again.</p></div>`; }
    };
    d.addEventListener("click", async (e) => {
      const go = e.target.closest("[data-src-go]"); if (go) { paint(go.dataset.srcGo); return; }
      const f = e.target.closest("[data-src-file]"); if (f) { paintFile(f.dataset.srcFile); return; }
      if (e.target.closest("#sbClear")) { Object.assign(SB, { q: "", kind: "all", from: "", to: "", sort: "new" }); paint(d.dataset.rel || ""); return; }
      if (e.target.closest("#srcCopy")) { try { await navigator.clipboard.writeText(winPath(d.dataset.rel || "")); toast("Path copied"); } catch (err) { toast(winPath(d.dataset.rel || "")); } }
    });
    d.addEventListener("input", (e) => { if (e.target.id === "sbQ") { SB.q = e.target.value; paintList(d.dataset.rel || ""); } });
    d.addEventListener("change", (e) => {
      const map = { sbKind: "kind", sbField: "field", sbFrom: "from", sbTo: "to", sbSort: "sort" }, key = map[e.target.id];
      if (key) { SB[key] = e.target.value; if (key === "kind") e.target.classList.toggle("set", SB.kind !== "all"); paintList(d.dataset.rel || ""); }
    });
    paint(rel);
  }
  function renderLibPage() {
    const id = S.view.slice(4), pg = S.library.get(id);
    if (!pg) { S.view = "all"; return renderList(); }
    if (!treeState.catOpen.has(catOf(pg))) { treeState.catOpen.add(catOf(pg)); saveTree(); renderSide(); }
    if (pg.group && S.libOpenedId !== id) { S.libOpenedId = id; const mk = catOf(pg) + "|" + pg.group; if (!treeState.modOpen.has(mk)) { treeState.modOpen.add(mk); saveTree(); renderSide(); } }
    $("#topTitle").textContent = pg.name || "Untitled";
    if (S.libEditId !== id && !(pg.body || "").trim()) S.libEditId = id;
    const editing = S.libEditId === id;
    const edited = pg.updatedAt ? "Last edited " + fmtTime(pg.updatedAt) : "";
    $("#view").innerHTML = `
      <div class="page doc-page">
        <div class="crumbs"><span class="crumb-label">${esc(CAT_INFO[catOf(pg)].section.name)}</span><span class="crumb-sep" aria-hidden="true">${I.chev}</span><button class="back" data-nav="cat:${catOf(pg)}">${esc(CAT_INFO[catOf(pg)].name)}</button><div class="page-acts">
          ${canAddImages() && !(pg.images || []).length && pg.source !== "brain" ? `<button class="btn sm ghost" id="addImg">${I.plus}Image</button>` : ""}
          ${editing ? `<button class="btn sm primary" id="libDone">Done</button>` : `<button class="btn sm" id="libEdit">Edit</button>`}
          <button class="icon-btn lg" data-lib-menu="${esc(id)}" aria-label="Page options" title="More">${I.more}</button></div></div>
        ${editing
          ? `<input class="title-input" id="libTitle" placeholder="Untitled" value="${esc(pg.name)}" aria-label="Page name">
             <div class="fmt-hint"># Heading &nbsp; ## Subheading &nbsp; - Bullet &nbsp; 1. Numbered &nbsp; **bold** &nbsp; &gt; Note &nbsp; --- Divider</div>
             ${videoBlock(pg)}
             <textarea class="notes-text lib-body" id="libBody" placeholder="Start writing" aria-label="Page content">${esc(pg.body || "")}</textarea>`
          : `<h1 class="doc-title">${esc(pg.name || "Untitled")}</h1>
             <div class="doc-meta">${esc(edited)}</div>
             ${typeof pg.src === "string" ? sourceCard(pg.src) : ""}
             ${videoBlock(pg)}
             <article class="doc" id="libDoc">${renderDoc(pg.body) || `<p class="doc-empty">This page is empty. Click Edit to start writing.</p>`}</article>`}
        ${(pg.images || []).length ? `<div class="img-block">
          <div class="block-head"><h3>Images</h3><span class="spacer"></span>${canAddImages() ? `<button class="btn sm" id="addImg">${I.plus}Add image</button>` : ""}</div>
          <div class="img-grid">${pg.images.map((im, i) => `<figure class="img-card">
              <button class="img-open" data-img-view="${i}" aria-label="View image"><img src="${esc(imgSrc(im))}" alt="${esc(im.caption || "Page image")}" loading="lazy"></button>
              <input class="img-cap" data-img-cap="${i}" value="${esc(im.caption || "")}" placeholder="Add a caption" aria-label="Image caption">
              ${canAddImages() ? `<button class="icon-btn img-del" data-img-del="${i}" aria-label="Remove image" title="Remove">${I.close}</button>` : ""}
            </figure>`).join("")}</div>
        </div>` : ""}
      </div>`;
    autoGrow($("#libBody")); regrowSoon();
    if (editing) setTimeout(() => { const b = $("#libBody"); if (b && document.activeElement === document.body) b.focus(); }, 30);
  }

  /* ---------- notes: tasks ---------- */
  const TASK_GROUPS = [
    { id: "priority", name: "Priority" },
    { id: "today", name: "To do today" },
    { id: "week", name: "To do this week" }
  ];
  const taskTimers = new Map();
  let dragTask = null;
  const tasksIn = (g) => [...S.tasks.entries()].map(([id, t]) => Object.assign({ id }, t)).filter((t) => (t.group || "today") === g)
    .sort((a, b) => (a.done === b.done ? (a.order || 0) - (b.order || 0) : a.done ? 1 : -1));
  const openTaskCount = () => [...S.tasks.values()].filter((t) => !t.done).length;
  function addTask(group, text) {
    const list = tasksIn(group).filter((t) => !t.done);
    const order = list.length ? (list[list.length - 1].order || 0) + 1 : 1;
    const id = "t" + uid();
    Store.write("tasks", id, { text, group, done: false, order, createdAt: now(), doneAt: 0 });
    return id;
  }
  function saveTask(id, patch) { const t = S.tasks.get(id); if (t) Store.write("tasks", id, Object.assign({}, t, patch)); }
  function scheduleTask(id, text) {
    const t = S.tasks.get(id); if (!t) return;
    S.tasks.set(id, Object.assign({}, t, { text }));
    clearTimeout(taskTimers.get(id));
    taskTimers.set(id, setTimeout(() => { taskTimers.delete(id); saveTask(id, {}); }, 600));
  }
  function flushTasks() { [...taskTimers.keys()].forEach((id) => { clearTimeout(taskTimers.get(id)); taskTimers.delete(id); saveTask(id, {}); }); }
  function moveTask(id, group, beforeId) {
    const list = tasksIn(group).filter((t) => !t.done && t.id !== id);
    let i = beforeId ? list.findIndex((t) => t.id === beforeId) : list.length;
    if (i < 0) i = list.length;
    const prev = list[i - 1], next = list[i];
    const order = prev && next ? ((prev.order || 0) + (next.order || 0)) / 2 : prev ? (prev.order || 0) + 1 : next ? (next.order || 0) - 1 : 1;
    saveTask(id, { group, order });
  }
  function taskMenu(anchor, id) {
    const t = S.tasks.get(id); if (!t) return;
    const items = TASK_GROUPS.filter((g) => g.id !== (t.group || "today")).map((g) => ({ label: "Move to " + g.name, run: () => { moveTask(id, g.id); renderTasks(); } }));
    items.push("-", { label: "Delete task", danger: true, run: () => { Store.remove("tasks", id); toast("Task deleted"); renderTasks(); } });
    menu(anchor, items);
  }
  function renderTasks() {
    renderSide();
    $("#topTitle").textContent = "Tasks";
    const open = openTaskCount();
    $("#view").innerHTML = `
      <div class="head"><h1>Tasks</h1><span class="sub">${open} open</span></div>
      <div class="task-board">
        ${TASK_GROUPS.map((g) => {
          const list = tasksIn(g.id), doneCount = list.filter((t) => t.done).length;
          return `<section class="task-group" data-group="${g.id}" aria-label="${esc(g.name)}">
            <div class="task-head"><h2>${esc(g.name)}</h2><span class="sub">${list.length - doneCount}</span><span class="spacer"></span>${doneCount ? `<button class="clear-link" data-clear-done="${g.id}">Clear ${doneCount} done</button>` : ""}</div>
            <div class="task-list" data-drop-group="${g.id}">
              ${list.map((t) => `<div class="task ${t.done ? "done" : ""}" data-task="${t.id}">
                <span class="task-handle" data-task-handle="${t.id}" title="Drag to move">${I.grip}</span>
                <input type="checkbox" class="task-check" data-check="${t.id}" ${t.done ? "checked" : ""} aria-label="Mark done">
                <input class="task-input" data-task-input="${t.id}" value="${esc(t.text)}" aria-label="Task">
                <button class="icon-btn task-more" data-task-menu="${t.id}" aria-label="Task options">${I.more}</button>
              </div>`).join("")}
              ${list.length ? "" : `<div class="task-empty">Nothing here yet</div>`}
            </div>
            <label class="task-add">${I.plus}<input data-add-task="${g.id}" placeholder="Add a task, then press Enter" aria-label="Add a task to ${esc(g.name)}"></label>
          </section>`;
        }).join("")}
      </div>`;
  }

  /* ---------- copy + fill-ins ---------- */
  async function copyText(text) {
    try {
      await Promise.race([navigator.clipboard.writeText(text), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 1500))]);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
      ta.remove(); return ok;
    }
  }
  function startCopy(id) {
    if (S.openId === id) commitDraft();
    const p = S.prompts.get(id); if (!p) return;
    if (!p.text.trim()) { toast("This prompt is empty"); return; }
    const vars = varsOf(p.text);
    if (!vars.length) { finishCopy(p.text); return; }
    openFill(p, vars);
  }
  async function finishCopy(text) {
    const ok = await copyText(text);
    if (ok) toast("Copied"); else openManualCopy(text);
  }
  function fillText(text, values) {
    return text.replace(/\[([^\[\]\n]{1,40})\]/g, (m, k) => { const v = values[k.trim()]; return v ? v : m; });
  }
  function openFill(p, vars) {
    const values = {};
    const d = dialog("Fill in and copy", `
      <p class="muted">“${esc(p.title || "Untitled")}” has ${vars.length} fill-in${vars.length === 1 ? "" : "s"}. Type a value for each one.</p>
      ${vars.map((k, i) => `<div class="field"><label for="fv${i}">${esc(k)}</label><input id="fv${i}" data-var="${esc(k)}" autocomplete="off"><span class="err" id="fe${i}" hidden>Enter a value for ${esc(k)}</span></div>`).join("")}
      <div class="field"><label>Preview</label><div class="preview-box" id="fillPreview"></div></div>`,
      `<button class="btn ghost" data-close>Cancel</button><button class="btn" id="copyRaw">Copy without filling</button><button class="btn primary" id="copyFilled">${I.copy}Copy filled prompt</button>`);
    const paint = () => {
      $("#fillPreview", d).innerHTML = esc(p.text).replace(/\[([^\[\]\n]{1,40})\]/g, (m, k) => { const v = values[k.trim()]; return `<mark>${v ? esc(v) : m}</mark>`; });
    };
    d.querySelectorAll("[data-var]").forEach((inp, i) => inp.addEventListener("input", () => { values[inp.dataset.var] = inp.value.trim(); inp.classList.remove("bad"); $("#fe" + i, d).hidden = true; paint(); }));
    paint();
    setTimeout(() => { const f = $("#fv0", d); if (f) f.focus(); }, 30);
    $("#copyRaw", d).onclick = () => { closeDialog(); finishCopy(p.text); };
    const go = () => {
      let firstBad = null;
      vars.forEach((k, i) => { const inp = $("#fv" + i, d); if (!values[k]) { inp.classList.add("bad"); $("#fe" + i, d).hidden = false; if (!firstBad) firstBad = inp; } });
      if (firstBad) { firstBad.focus(); return; }
      closeDialog(); finishCopy(fillText(p.text, values));
    };
    $("#copyFilled", d).onclick = go;
    d.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-var]")) { e.preventDefault(); go(); } });
  }
  function openManualCopy(text) {
    const d = dialog("Copy your prompt", `<p class="muted">Your browser blocked automatic copying. The text is selected below, so press Ctrl+C to copy it.</p><div class="field"><textarea id="manualCopy" rows="10" readonly style="font-family:var(--mono);font-size:12.5px">${esc(text)}</textarea></div>`, `<button class="btn primary" data-close>Done</button>`);
    const ta = $("#manualCopy", d); setTimeout(() => { ta.focus(); ta.select(); }, 30);
  }

  /* ---------- dialogs + menus ---------- */
  let lastFocus = null;
  function dialog(title, body, foot) {
    closeDialog(); closeMenu();
    lastFocus = document.activeElement;
    const s = document.createElement("div"); s.className = "scrim"; s.id = "scrim";
    s.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-head"><h2>${esc(title)}</h2><span class="spacer"></span><button class="icon-btn" data-close aria-label="Close">${I.close}</button></div><div class="dialog-body">${body}</div>${foot ? `<div class="dialog-foot">${foot}</div>` : ""}</div>`;
    s.addEventListener("mousedown", (e) => { if (e.target === s) closeDialog(); });
    s.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDialog(); });
    document.body.appendChild(s);
    return s;
  }
  function closeDialog() { const s = $("#scrim"); if (s) { s.remove(); if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} } }
  function confirmBox(title, msg, okLabel, onOk) {
    const d = dialog(title, `<p style="margin:0">${esc(msg)}</p>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn" style="background:var(--danger);border-color:var(--danger)">${esc(okLabel)}</button>`);
    $("#okBtn", d).onclick = () => { closeDialog(); onOk(); };
    setTimeout(() => $("#okBtn", d).focus(), 30);
  }
  function nameBox(title, label, value, okLabel, onOk) {
    const d = dialog(title, `<div class="field"><label for="nameIn">${esc(label)}</label><input id="nameIn" value="${esc(value)}" autocomplete="off"><span class="err" id="nameErr" hidden>Enter a name</span></div>`, `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="okBtn">${esc(okLabel)}</button>`);
    const inp = $("#nameIn", d);
    const go = () => { const v = inp.value.trim(); if (!v) { inp.classList.add("bad"); $("#nameErr", d).hidden = false; inp.focus(); return; } closeDialog(); onOk(v); };
    inp.addEventListener("input", () => { inp.classList.remove("bad"); $("#nameErr", d).hidden = true; });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    $("#okBtn", d).onclick = go;
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }
  function menu(anchor, items) {
    closeMenu();
    const m = document.createElement("div"); m.className = "menu"; m.id = "menu"; m.setAttribute("role", "menu");
    m.innerHTML = items.map((it, i) => it === "-" ? `<div class="sep"></div>` : `<button role="menuitem" data-i="${i}" ${it.danger ? 'style="color:var(--danger)"' : ""}>${esc(it.label)}</button>`).join("");
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8)) + "px";
    m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 4) : r.bottom + 4) + "px";
    m.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.run(); });
    setTimeout(() => { const f = m.querySelector("button"); if (f) f.focus(); }, 10);
  }
  function closeMenu() { const m = $("#menu"); if (m) m.remove(); }

  function promptMenu(anchor, id) {
    const p = S.prompts.get(id); if (!p) return;
    const folderItems = [...S.folders.entries()].filter(([fid]) => fid !== p.folderId).map(([fid, f]) => ({ label: "Move to " + f.name, run: () => { savePrompt(id, { folderId: fid }, { keepTime: true }); toast("Moved to " + f.name); render(); } }));
    const items = [
      { label: "Open", run: () => openPrompt(id) },
      { label: "Copy prompt", run: () => startCopy(id) },
      { label: "Duplicate", run: () => duplicatePrompt(id) }
    ];
    if (folderItems.length || p.folderId) {
      items.push("-");
      folderItems.forEach((f) => items.push(f));
      if (p.folderId) items.push({ label: "Remove from folder", run: () => { savePrompt(id, { folderId: "" }, { keepTime: true }); render(); } });
    }
    items.push("-", { label: "Delete", danger: true, run: () => trashPrompt(id) });
    menu(anchor, items);
  }
  function folderMenu(anchor, fid) {
    const f = S.folders.get(fid); if (!f) return;
    menu(anchor, [
      { label: "Rename", run: () => nameBox("Rename folder", "Folder name", f.name, "Rename", (v) => { Store.write("folders", fid, Object.assign({}, f, { name: v })); render(); }) },
      { label: "Delete folder", danger: true, run: () => confirmBox("Delete folder", `Delete “${f.name}”? The prompts inside stay in Prompts.`, "Delete folder", () => {
        [...S.prompts.entries()].filter(([, p]) => p.folderId === fid).forEach(([pid]) => savePrompt(pid, { folderId: "" }, { keepTime: true }));
        Store.remove("folders", fid); if (S.view === "folder:" + fid) S.view = "all"; toast("Folder deleted"); render();
      }) }
    ]);
  }
  function historyBox() {
    commitDraft();
    const id = S.openId, p = S.prompts.get(id); if (!p) return;
    const body = p.versions.length
      ? `<p class="muted">A version is saved each time you start editing a prompt. Restoring keeps your current text as a version too.</p>` + p.versions.map((v, i) => `<div class="ver"><div class="vt"><b>${esc(v.title || "Untitled")}</b> <span class="when">${esc(fmtTime(v.at))}</span><div>${esc((v.text || "").replace(/\s+/g, " ").slice(0, 120))}</div></div><button class="btn sm" data-preview-ver="${i}">View</button><button class="btn sm" data-restore-ver="${i}">Restore</button></div>`).join("")
      : `<div class="empty" style="padding:28px 8px"><h2>No earlier versions yet</h2><p>When you edit this prompt, the version before your edit is saved here.</p></div>`;
    const d = dialog("Version history", body);
    d.addEventListener("click", (e) => {
      const r = e.target.closest("[data-restore-ver]"), v = e.target.closest("[data-preview-ver]");
      if (v) { const ver = p.versions[+v.dataset.previewVer]; dialog("Version from " + fmtTime(ver.at), `<div class="preview-box" style="max-height:50vh">${esc(ver.text)}</div>`, `<button class="btn ghost" data-close>Close</button>`); }
      if (r) {
        const ver = p.versions[+r.dataset.restoreVer];
        const cur = { title: p.title, text: p.text, notes: p.notes, at: p.updatedAt };
        const rest = p.versions.filter((_, i) => i !== +r.dataset.restoreVer);
        savePrompt(id, { title: ver.title, text: ver.text, notes: ver.notes || "", versions: [cur].concat(rest).slice(0, MAX_VERSIONS) });
        baseline = { title: ver.title, text: ver.text, notes: ver.notes || "", at: now() }; versionTaken = true;
        closeDialog(); render(); toast("Version restored");
      }
    });
  }

  /* ---------- import / export ---------- */
  function exportBox() {
    const d = dialog("Export backup", `<p class="muted">Save a copy of all ${S.prompts.size} prompts, ${S.folders.size} folders, ${S.rows.size} Private sheet rows, ${S.tasks.size} tasks, and ${S.library.size} notes, library, and SEO lesson pages. Passwords stay locked in the JSON file and are left out of Markdown. JSON can be imported back later.</p>`,
      `<button class="btn" id="exMd">Markdown (.md)</button><button class="btn primary" id="exJson">JSON (.json)</button>`);
    $("#exJson", d).onclick = () => { closeDialog(); saveFile("tag-marketing-vault-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ app: "kim-prompt-library", version: 1, exportedAt: new Date().toISOString(), folders: Object.fromEntries(S.folders), prompts: Object.fromEntries(S.prompts), loginSheet: Object.fromEntries(S.sheet), loginRows: Object.fromEntries(S.rows), tasks: Object.fromEntries(S.tasks), library: Object.fromEntries(S.library) }, null, 2)); };
    $("#exMd", d).onclick = () => { closeDialog(); saveFile("tag-marketing-vault-" + new Date().toISOString().slice(0, 10) + ".md", toMarkdown()); };
  }
  function toMarkdown() {
    const lines = ["# Kim's Tag Marketing Vault", "", "Exported " + fmtTime(now()), ""];
    [...S.prompts.values()].filter((p) => !p.deleted).sort((a, b) => (a.title || "").localeCompare(b.title || "")).forEach((p) => {
      const f = p.folderId && S.folders.get(p.folderId);
      lines.push("## " + (p.title || "Untitled"), "",
        "- Client: " + p.client, "- Category: " + p.category, "- Folder: " + (f ? f.name : "none"), "",
        "```", p.text, "```", "");
      if (p.notes) lines.push("**Notes:** " + p.notes, "");
    });
    if (S.library.size) {
      TREE.filter((sec) => sec.kind === "pages").forEach((sec) => sec.cats.forEach(([cid, cname]) => { const list = pagesIn(cid); if (!list.length) return; lines.push("# " + sec.name + ": " + cname, ""); list.forEach(([, pg]) => lines.push("## " + (pg.name || "Untitled"), "", pg.body || "", "")); }));
    }
    if (S.tasks.size) {
      lines.push("# Tasks", "");
      TASK_GROUPS.forEach((g) => { const list = tasksIn(g.id); if (!list.length) return; lines.push("## " + g.name, ""); list.forEach((t) => lines.push("- [" + (t.done ? "x" : " ") + "] " + (t.text || ""))); lines.push(""); });
    }
    Object.keys(SHEETS).forEach((sh) => {
      const ids = rowOrder(sh); if (!ids.length) return;
      const cols = sheetCols(sh).filter((c) => c.type !== "password");
      const cell = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push("# Private: " + SHEETS[sh].name, "", "Passwords are not included.", "", "| " + cols.map((c) => cell(c.name)).join(" | ") + " |", "| " + cols.map(() => "---").join(" | ") + " |");
      ids.forEach((rid) => lines.push("| " + cols.map((c) => cell(cellText(rid, c.id))).join(" | ") + " |"));
      lines.push("");
    });
    return lines.join("\n");
  }
  async function saveFile(filename, data) {
    if (S.downloads) {
      try { await S.downloads.save({ filename, data }); toast("Backup saved"); return; }
      catch (e) { if (e && e.code === "declined") return; }
    }
    const d = dialog("Copy your backup", `<p class="muted">Saving files isn't available here, so copy this text and save it as <b>${esc(filename)}</b>.</p><div class="field"><textarea id="bk" rows="12" readonly style="font-family:var(--mono);font-size:12px">${esc(data)}</textarea></div>`, `<button class="btn primary" id="bkCopy">${I.copy}Copy</button>`);
    $("#bkCopy", d).onclick = async () => { if (await copyText(data)) toast("Copied"); else { const t = $("#bk", d); t.focus(); t.select(); } };
  }
  function importFile(file) {
    const r = new FileReader();
    r.onload = () => {
      let data; try { data = JSON.parse(r.result); } catch (e) { toast("That file isn't a valid backup. Choose a .json export."); return; }
      const prompts = data && data.prompts && typeof data.prompts === "object" ? data.prompts : null;
      if (!prompts) { toast("No prompts found in that file"); return; }
      const folders = data.folders && typeof data.folders === "object" ? data.folders : {};
      const fEntries = Object.entries(folders).filter(([k, v]) => /^[A-Za-z0-9_.~:@+-]{1,60}$/.test(k) && v && v.name);
      const pEntries = Object.entries(prompts).filter(([k, v]) => /^[A-Za-z0-9_.~:@+-]{1,60}$/.test(k) && v && typeof v === "object");
      const newCount = pEntries.filter(([k]) => !S.prompts.has(k)).length;
      const okId = (k) => /^[A-Za-z0-9_.~:@+-]{1,60}$/.test(k);
      const rEntries = Object.entries(data.loginRows && typeof data.loginRows === "object" ? data.loginRows : {}).filter(([k, v]) => okId(k) && v && typeof v.cells === "object");
      const sheetIn = data.loginSheet && typeof data.loginSheet === "object" ? data.loginSheet : {};
      const cryptoClash = sheetIn.crypto && S.sheet.get("crypto") && sheetIn.crypto.salt !== S.sheet.get("crypto").salt;
      confirmBox("Import backup", `Import ${pEntries.length} prompts (${newCount} new, ${pEntries.length - newCount} will replace ones with the same ID), ${fEntries.length} folders, and ${rEntries.length} Private sheet rows?${cryptoClash ? " This backup uses a different vault password, so the vault password from the backup will replace the current one." : ""}`, "Import", () => {
        fEntries.forEach(([k, v]) => Store.write("folders", k, { name: String(v.name), createdAt: v.createdAt || now() }));
        Object.keys(SHEETS).forEach((sh) => { const m = sheetIn[metaKey(sh)]; if (m && Array.isArray(m.columns)) Store.write("loginSheet", metaKey(sh), m); });
        if (sheetIn.crypto && sheetIn.crypto.salt && sheetIn.crypto.check) { Store.write("loginSheet", "crypto", sheetIn.crypto); S.vaultKey = null; S.pwCache.clear(); }
        rEntries.forEach(([k, v]) => Store.write("loginRows", k, { cells: v.cells, sheet: SHEETS[v.sheet] ? v.sheet : "login", createdAt: v.createdAt || now(), updatedAt: v.updatedAt || now() }));
        Object.entries(data.library && typeof data.library === "object" ? data.library : {}).filter(([k, v]) => okId(k) && v && typeof v.name === "string").forEach(([k, v]) => Store.write("library", k, { name: v.name, body: String(v.body || ""), videos: Array.isArray(v.videos) ? v.videos.filter((x) => x && typeof x.path === "string").map((x) => ({ path: x.path, title: String(x.title || "") })) : [], images: Array.isArray(v.images) ? v.images.filter((im) => im && typeof im.id === "string" && /^[0-9a-f]{32}$/.test(im.id)).map((im) => ({ id: im.id, caption: String(im.caption || ""), addedAt: im.addedAt || now() })) : [], cat: CAT_INFO[v.cat] ? v.cat : catOf(v), group: typeof v.group === "string" ? v.group : "", createdAt: v.createdAt || now(), updatedAt: v.updatedAt || now() }));
        Object.entries(data.tasks && typeof data.tasks === "object" ? data.tasks : {}).filter(([k, v]) => okId(k) && v && typeof v.text === "string").forEach(([k, v]) => Store.write("tasks", k, { text: v.text, group: TASK_GROUPS.some((g) => g.id === v.group) ? v.group : "today", done: !!v.done, order: Number(v.order) || 0, createdAt: v.createdAt || now(), doneAt: v.doneAt || 0 }));
        pEntries.forEach(([k, v]) => Store.write("prompts", k, normalize(v)));
        toast("Imported " + pEntries.length + " prompts"); render();
      });
    };
    r.readAsText(file);
  }

  /* ---------- drawer (phone) ---------- */
  function closeDrawer() { $("#app").classList.remove("drawer"); }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    if ($("#menu") && !t.closest("#menu")) closeMenu();
    if ($("#app").classList.contains("drawer") && !t.closest("#side") && !t.closest("#menuBtn")) { closeDrawer(); return; }
    let el;
    /* sidebar category rows: the whole row opens or folds the list (opening also shows the category page) */
    if ((el = t.closest("#side .cat-row > .nav[data-nav]"))) {
      const cid = el.dataset.nav.slice(4);
      if (treeState.catOpen.has(cid)) { treeState.catOpen.delete(cid); saveTree(); renderSide(); return; }
      treeState.catOpen.add(cid); saveTree();
    }
    if ((el = t.closest("[data-nav]")) && !t.closest("[data-lib-menu]")) { if (el.tagName === "A") e.preventDefault(); commitDraft(); flushRows(); flushTasks(); flushLib(); S.view = el.dataset.nav; S.openId = null; S.lq = ""; if (S.view.startsWith("cat:")) { treeState.catOpen.add(S.view.slice(4)); saveTree(); } closeDrawer(); render(); $("#main").scrollTop = 0; return; }
    if (t.closest("#menuBtn")) { $("#app").classList.toggle("drawer"); return; }
    if (t.closest("#sideSearch")) { focusSearch(); return; }
    if (t.closest("#addFolder")) { nameBox("New folder", "Folder name", "", "Create folder", (v) => { const id = "f" + uid(); Store.write("folders", id, { name: v, createdAt: now() }); S.view = "folder:" + id; S.openId = null; render(); }); return; }
    if ((el = t.closest("[data-folder-menu]"))) { e.stopPropagation(); folderMenu(el, el.dataset.folderMenu); return; }
    if (t.closest("#importBtn")) { const f = $("#importFile"); f.value = ""; f.click(); return; }
    if (t.closest("#exportBtn")) { exportBox(); return; }
    if ((el = t.closest("[data-src-open]"))) { sourceBox(el.dataset.srcOpen); return; }
    if (t.closest("#toggleScene")) { try { localStorage.setItem("pl-scene", sceneOn() ? "off" : "on"); } catch (err) {} applyScene(); renderSide(); return; }
    if (t.closest("[data-new]")) { createPrompt(); return; }
    /* sidebar tree */
    if ((el = t.closest("[data-toggle-sec]"))) { const k = el.dataset.toggleSec; treeState.secClosed.has(k) ? treeState.secClosed.delete(k) : treeState.secClosed.add(k); saveTree(); renderSide(); return; }
    if ((el = t.closest("[data-toggle-mod]"))) { const k = el.dataset.toggleMod; treeState.modOpen.has(k) ? treeState.modOpen.delete(k) : treeState.modOpen.add(k); saveTree(); renderSide(); return; }
    if ((el = t.closest("[data-toggle-cat]"))) { const k = el.dataset.toggleCat; treeState.catOpen.has(k) ? treeState.catOpen.delete(k) : treeState.catOpen.add(k); saveTree(); renderSide(); return; }
    if ((el = t.closest("[data-add-page]"))) { e.stopPropagation(); flushLib(); addPage(el.dataset.addPage); return; }
    if (t.closest("#libEdit")) { S.libEditId = S.view.slice(4); renderLibPage(); return; }
    if (t.closest("#libDone")) { flushLib(); S.libEditId = null; renderLibPage(); return; }
    if (t.closest("#libDoc") && !t.closest("a")) { if (e.detail === 2) { S.libEditId = S.view.slice(4); renderLibPage(); } return; }
    if (t.closest("#addVid")) { flushLib(); addVideo(); return; }
    if ((el = t.closest("[data-vid-del]"))) { removeVideo(+el.dataset.vidDel); return; }
    if (t.closest("#addImg")) { const f = $("#imgFile"); f.value = ""; f.click(); return; }
    if ((el = t.closest("[data-img-view]"))) { viewImage(+el.dataset.imgView); return; }
    if ((el = t.closest("[data-img-del]"))) { removeImage(+el.dataset.imgDel); return; }
    if ((el = t.closest("[data-lib-menu]"))) { e.stopPropagation(); flushLib(); libMenu(el, el.dataset.libMenu); return; }
    /* tasks */
    if ((el = t.closest("[data-task-menu]"))) { e.stopPropagation(); taskMenu(el, el.dataset.taskMenu); return; }
    if ((el = t.closest("[data-clear-done]"))) { const g = el.dataset.clearDone; const ids = tasksIn(g).filter((x) => x.done).map((x) => x.id); ids.forEach((id) => Store.remove("tasks", id)); toast("Cleared " + ids.length + " done"); renderTasks(); return; }
    /* tool logins sheet */
    if (t.closest("[data-new-row]")) { newRow(); return; }
    if (t.closest("#addCol")) { addColumn(); return; }
    if (t.closest("#lockVault")) { flushRows(); lockVault(); return; }
    if (t.closest("#unlockVault")) { unlockVault(); return; }
    if ((el = t.closest("[data-col-menu]"))) { e.stopPropagation(); colMenu(el, el.dataset.colMenu); return; }
    if ((el = t.closest("[data-sheet-row-menu]"))) { e.stopPropagation(); rowMenu(el, el.dataset.sheetRowMenu); return; }
    if ((el = t.closest("[data-pw-unlock]"))) { const r = el.dataset.r, c = el.dataset.c; unlockVault(() => { const i = $(`.cell[data-r="${r}"][data-c="${c}"]`); if (i) i.focus(); }); return; }
    if ((el = t.closest("[data-pw-eye]"))) { const i = $(`.cell[data-r="${el.dataset.r}"][data-c="${el.dataset.c}"]`); if (i) { const show = i.type === "password"; i.type = show ? "text" : "password"; el.innerHTML = show ? I.eyeOff : I.eye; el.setAttribute("aria-label", show ? "Hide password" : "Show password"); } return; }
    if ((el = t.closest("[data-pw-copy]"))) { const v = S.pwCache.get(el.dataset.r + "|" + el.dataset.c) || ""; if (!v) { toast("No password in this cell"); return; } copyText(v).then((ok) => ok ? toast("Password copied") : openManualCopy(v)); return; }
    if (t.closest("#clearFilters") || t.closest("#clearFilters2")) { S.q = S.category = ""; render(); return; }
    if (t.closest("#lyList")) { S.layout = "list"; try { localStorage.setItem("pl-layout", "list"); } catch (x) {} render(); return; }
    if (t.closest("#lyGallery")) { S.layout = "gallery"; try { localStorage.setItem("pl-layout", "gallery"); } catch (x) {} render(); return; }
    if ((el = t.closest("[data-copy]"))) { e.stopPropagation(); startCopy(el.dataset.copy); return; }
    if ((el = t.closest("[data-row-menu]"))) { e.stopPropagation(); promptMenu(el, el.dataset.rowMenu); return; }
    if ((el = t.closest("[data-restore]"))) { e.stopPropagation(); restorePrompt(el.dataset.restore); return; }
    if ((el = t.closest("[data-purge]"))) { e.stopPropagation(); const id = el.dataset.purge; const p = S.prompts.get(id); confirmBox("Delete forever", `Permanently delete “${(p && p.title) || "Untitled"}”? This can't be undone.`, "Delete forever", () => { Store.remove("prompts", id); toast("Deleted forever"); render(); }); return; }
    if (t.closest("#emptyTrash")) { const ids = [...S.prompts.entries()].filter(([, p]) => p.deleted).map(([id]) => id); confirmBox("Empty trash", `Permanently delete ${ids.length} ${ids.length === 1 ? "prompt" : "prompts"}? This can't be undone.`, "Empty trash", () => { ids.forEach((id) => Store.remove("prompts", id)); toast("Trash emptied"); render(); }); return; }
    if ((el = t.closest("[data-open]")) && !t.closest("button")) { openPrompt(el.dataset.open); return; }
    /* prompt page */
    if (t.closest("#back")) { closePrompt(); return; }
    if (t.closest("#pgCopy") || t.closest("#pgCopy2")) { startCopy(S.openId); return; }
    if (t.closest("#pgRestore")) { restorePrompt(S.openId); return; }
    if (t.closest("#pgHistory")) { historyBox(); return; }
    if ((el = t.closest("#pgMore"))) { e.stopPropagation(); const id = S.openId; menu(el, [
      { label: "Duplicate", run: () => { commitDraft(); duplicatePrompt(id); } },
      { label: "Version history", run: historyBox },
      "-", { label: "Delete", danger: true, run: () => trashPrompt(id) }]); return; }
  });
  document.addEventListener("keydown", (e) => {
    const el = e.target;
    if (e.key === "Enter" && el.matches && el.matches("[data-open]")) { openPrompt(el.dataset.open); return; }
    if (e.key === "Enter" && el.dataset && el.dataset.addTask) {
      e.preventDefault(); const v = el.value.trim(); if (!v) return;
      const g = el.dataset.addTask; addTask(g, v); renderTasks();
      const n = $(`[data-add-task="${g}"]`); if (n) n.focus(); return;
    }
    if (e.key === "Enter" && el.dataset && el.dataset.taskInput) { e.preventDefault(); const t = S.tasks.get(el.dataset.taskInput); flushTasks(); const n = t && $(`[data-add-task="${t.group || "today"}"]`); if (n) n.focus(); return; }
    if (e.key === "Backspace" && el.dataset && el.dataset.taskInput && !el.value) { e.preventDefault(); const id = el.dataset.taskInput; clearTimeout(taskTimers.get(id)); taskTimers.delete(id); Store.remove("tasks", id); renderTasks(); return; }
    if (e.key === "Enter" && el.classList && el.classList.contains("cell")) {
      e.preventDefault();
      const ids = [...document.querySelectorAll("tr[data-row]")].map((tr) => tr.dataset.row);
      const i = ids.indexOf(el.dataset.r), c = el.dataset.c;
      if (i >= 0 && i < ids.length - 1) { const n = $(`.cell[data-r="${ids[i + 1]}"][data-c="${c}"]`) || $(`[data-pw-unlock][data-r="${ids[i + 1]}"]`); if (n) n.focus(); }
      else if (!S.lq) { saveRow(el.dataset.r); newRow(null, c); }
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); focusSearch(); return; }
    if ((mod && e.key.toLowerCase() === "n") || (e.altKey && e.key.toLowerCase() === "n")) { e.preventDefault(); if (S.view.startsWith("sheet:") && !S.openId) newRow(); else createPrompt(); return; }
    if (e.key === "Escape") { if ($("#menu")) closeMenu(); else if ($("#scrim")) closeDialog(); else if ($("#app").classList.contains("drawer")) closeDrawer(); else if (S.openId && !["INPUT", "TEXTAREA"].includes(el.tagName)) closePrompt(); }
  });
  let qTimer = null;
  document.addEventListener("input", (e) => {
    const id = e.target.id;
    if (id === "libTitle" || id === "libBody") { if (id === "libBody") autoGrow(e.target); clearTimeout(libTimer); libTimer = setTimeout(flushLib, 700); return; }
    if (e.target.dataset && e.target.dataset.taskInput) { scheduleTask(e.target.dataset.taskInput, e.target.value); return; }
    if (e.target.classList && e.target.classList.contains("cell")) {
      const rid = e.target.dataset.r, cid = e.target.dataset.c, v = e.target.value;
      if (e.target.dataset.pw) S.pwCache.set(rid + "|" + cid, v);
      else { const r = S.rows.get(rid); if (r) S.rows.set(rid, Object.assign({}, r, { cells: Object.assign({}, r.cells, { [cid]: v }) })); }
      scheduleRow(rid); return;
    }
    if (id === "lq") { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { S.lq = v; const pos = e.target.selectionStart; renderLogins(); const q = $("#lq"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} }, 120); return; }
    if (id === "q") { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { S.q = v; const pos = e.target.selectionStart; renderList(); const q = $("#q"); q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} }, 120); return; }
    if (id === "pgTitle" || id === "pgText" || id === "pgNotes") { if (id !== "pgTitle") autoGrow(e.target); if (id === "pgText") paintVars(); scheduleDraft(); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.dataset && e.target.dataset.check) { const tid = e.target.dataset.check; const done = e.target.checked; saveTask(tid, { done, doneAt: done ? now() : 0 }); renderTasks(); return; }
    const id = e.target.id, v = e.target.value;
    if (id === "fCategory") { S.category = v; renderList(); return; }
    const pmap = { pgClient: "client", pgCategory: "category" };
    if (pmap[id]) { commitDraft(); savePrompt(S.openId, { [pmap[id]]: v }); return; }
    if (id === "importFile" && e.target.files[0]) importFile(e.target.files[0]);
    if (id === "imgFile" && e.target.files.length) addImages(e.target.files);
    if (e.target.dataset && e.target.dataset.imgCap != null) { const pid = S.view.slice(4), cur = S.library.get(pid); if (cur && cur.images) { const images = cur.images.map((im, i) => i === +e.target.dataset.imgCap ? Object.assign({}, im, { caption: e.target.value.trim() }) : im); Store.write("library", pid, Object.assign({}, cur, { images, updatedAt: now() })); } }
  });
  document.addEventListener("focusout", (e) => {
    if (["pgTitle", "pgText", "pgNotes"].includes(e.target.id)) commitDraft();
    if (e.target.id === "libTitle" || e.target.id === "libBody") flushLib();
    if (e.target.classList && e.target.classList.contains("cell") && rowTimers.has(e.target.dataset.r)) {
      saveRow(e.target.dataset.r);
      if (e.target.dataset.c && sheetCols().find((c) => c.id === e.target.dataset.c && c.type === "link")) setTimeout(() => { if (!document.activeElement || !document.activeElement.classList.contains("cell")) renderLogins(); }, 50);
    }
  });
  document.addEventListener("paste", (e) => {
    if (!S.view.startsWith("lib:") || !canAddImages()) return;
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) { e.preventDefault(); addImages(files); }
  });
  window.addEventListener("beforeunload", () => { commitDraft(); flushRows(); flushTasks(); flushLib(); });

  /* sheet: drag rows and columns, resize columns */
  document.addEventListener("mousedown", (e) => {
    const h = e.target.closest("[data-handle]");
    if (h) { const tr = h.closest("tr"); if (tr && !S.lq) tr.draggable = true; }
    const th2 = e.target.closest("[data-task-handle]");
    if (th2) { const row = th2.closest(".task"); if (row) row.draggable = true; }
    const rz = e.target.closest("[data-resize]");
    if (rz) {
      e.preventDefault(); e.stopPropagation();
      const cid = rz.dataset.resize, col = $(`col[data-colw="${cid}"]`), th = rz.closest("th");
      const startX = e.clientX, startW = th.getBoundingClientRect().width;
      th.draggable = false; document.body.classList.add("resizing");
      const mv = (ev) => { col.style.width = Math.max(80, Math.min(600, startW + ev.clientX - startX)) + "px"; };
      const up = () => {
        document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); document.body.classList.remove("resizing");
        const w = parseInt(col.style.width, 10);
        saveMeta({ columns: sheetCols().map((c) => c.id === cid ? Object.assign({}, c, { width: w }) : c) });
        th.draggable = true;
      };
      document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up);
    }
  });
  document.addEventListener("dragstart", (e) => {
    const tk = e.target.closest && e.target.closest(".task[data-task]");
    if (tk && tk.draggable) { flushTasks(); dragTask = tk.dataset.task; tk.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "task"); return; }
    const tr = e.target.closest && e.target.closest("tr[data-row]");
    const th = e.target.closest && e.target.closest("th[data-col]");
    if (tr && tr.draggable) { dragRow = tr.dataset.row; tr.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "row"); flushRows(); return; }
    if (th && !e.target.closest("[data-resize]")) { dragCol = th.dataset.col; th.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "col"); return; }
  });
  document.addEventListener("dragover", (e) => {
    if (dragTask) {
      const list = e.target.closest && e.target.closest("[data-drop-group]"); if (!list) return; e.preventDefault();
      document.querySelectorAll(".drop-above,.drop-below,.drop-into").forEach((x) => x.classList.remove("drop-above", "drop-below", "drop-into"));
      const tk = e.target.closest(".task[data-task]");
      if (tk && tk.dataset.task !== dragTask) { const r = tk.getBoundingClientRect(); tk.classList.add(e.clientY < r.top + r.height / 2 ? "drop-above" : "drop-below"); } else list.classList.add("drop-into");
    }
    if (dragRow) { const tr = e.target.closest && e.target.closest("tr[data-row]"); if (!tr) return; e.preventDefault(); document.querySelectorAll(".drop-above,.drop-below").forEach((x) => x.classList.remove("drop-above", "drop-below")); const r = tr.getBoundingClientRect(); tr.classList.add(e.clientY < r.top + r.height / 2 ? "drop-above" : "drop-below"); }
    if (dragCol) { const th = e.target.closest && e.target.closest("th[data-col]"); if (!th) return; e.preventDefault(); document.querySelectorAll(".drop-left,.drop-right").forEach((x) => x.classList.remove("drop-left", "drop-right")); const r = th.getBoundingClientRect(); th.classList.add(e.clientX < r.left + r.width / 2 ? "drop-left" : "drop-right"); }
  });
  document.addEventListener("drop", (e) => {
    if (dragTask) {
      const list = e.target.closest && e.target.closest("[data-drop-group]");
      if (list) {
        e.preventDefault();
        const g = list.dataset.dropGroup, tk = e.target.closest(".task[data-task]");
        let before = null;
        if (tk && tk.dataset.task !== dragTask) {
          if (tk.classList.contains("drop-above")) before = tk.dataset.task;
          else { const open = tasksIn(g).filter((x) => !x.done && x.id !== dragTask); const i = open.findIndex((x) => x.id === tk.dataset.task); before = open[i + 1] ? open[i + 1].id : null; }
        }
        moveTask(dragTask, g, before);
      }
    }
    if (dragRow) {
      const tr = e.target.closest && e.target.closest("tr[data-row]");
      if (tr && tr.dataset.row !== dragRow) {
        e.preventDefault();
        const below = tr.classList.contains("drop-below");
        const order = rowOrder().filter((x) => x !== dragRow);
        let i = order.indexOf(tr.dataset.row); if (below) i++;
        order.splice(i, 0, dragRow); saveMeta({ order });
      }
    }
    if (dragCol) {
      const th = e.target.closest && e.target.closest("th[data-col]");
      if (th && th.dataset.col !== dragCol) {
        e.preventDefault();
        const right = th.classList.contains("drop-right");
        const cols = sheetCols(), moving = cols.find((c) => c.id === dragCol), rest = cols.filter((c) => c.id !== dragCol);
        let i = rest.findIndex((c) => c.id === th.dataset.col); if (right) i++;
        rest.splice(i, 0, moving); saveMeta({ columns: rest });
      }
    }
  });
  document.addEventListener("dragend", () => {
    const tdrag = dragTask; dragTask = null;
    document.querySelectorAll(".task[draggable]").forEach((x) => { x.draggable = false; });
    if (tdrag && S.view === "tasks") renderTasks();
    const changed = dragRow || dragCol;
    dragRow = dragCol = null;
    document.querySelectorAll("tr[draggable]").forEach((tr) => { tr.draggable = false; });
    if (changed && S.view.startsWith("sheet:")) renderLogins();
  });
  setInterval(paintSaved, 1500);
  function focusSearch() {
    commitDraft(); closeDrawer();
    if (S.openId || S.view.startsWith("sheet:")) { S.openId = null; if (S.view.startsWith("sheet:")) S.view = "all"; render(); }
    setTimeout(() => { const q = $("#q"); if (q) { q.focus(); q.select(); } }, 20);
  }

  Store.init();
})();
