/* Terrago daily layer: links the five daily games into one run.
   - Reads each game's own saved day state (never writes to it), so streaks, stats and practice are untouched.
   - Keeps one extra key, terrago-daily-v1, holding each game's summary for today plus skips and sent events.
   - Draws the shared results card at the end of each game, the home-page strip and the /today/ page. */
(function () {
  "use strict";
  var KEY = "terrago-daily-v1";
  var GAMES = [
    { id: "polygo", name: "Polygo", icon: "🗺️", path: "/polygo/", ls: "polygo-v1", off: 41 },
    { id: "capitalo", name: "Capitalo", icon: "🏛️", path: "/capitalo/", ls: "capital-clues-v3", off: 27 },
    { id: "equalo", name: "Equalo", icon: "⚖️", path: "/equalo/", ls: "equalo-v1", off: 53 },
    { id: "roadtripo", name: "Roadtripo", icon: "🚗", path: "/roadtripo/", ls: "roadtripo-v1", off: 0 },
    { id: "voyago", name: "Voyago", icon: "🌍", path: "/voyago/", ls: "voyago-v2", off: 0 }
  ];
  var LEVELS = [2, 4, 8, 16, 32, 64, 128, "Full"];
  var EQ = { g: "🟩", y: "🟨", x: "🟥" };
  var byId = {}; GAMES.forEach(function (g) { byId[g.id] = g; });

  function today() {
    var n = new Date();
    return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 2)) / 864e5) + 1;
  }
  function read(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function track(n) { try { window.tgTrack && window.tgTrack(n); } catch (e) {} }
  function reduced() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return true; } }

  function load() {
    var d = read(KEY), day = today();
    if (!d || d.day !== day || typeof d.games !== "object" || !d.games) d = { day: day, games: {}, sent: [] };
    if (!Array.isArray(d.sent)) d.sent = [];
    return d;
  }

  /* ---- scoring: a 0-100 daily score per game, derived from each game's own result ---- */
  function score(id, r) {
    if (!r) return 0;
    if (id === "polygo") return r.won ? Math.max(0, 100 - 13 * (r.n - 1)) : 0; /* 8 rounds: 100 … 9 */
    if (id === "capitalo") return r.won ? Math.max(0, 100 - 15 * (r.n - 1)) : 0;
    if (id === "equalo") {
      var g = r.g || [];
      if (g.length === 3 && g.every(function (x) { return x === "g"; })) return 100;
      return g.reduce(function (a, x) { return a + (x === "g" ? 33 : x === "y" ? 15 : 0); }, 0);
    }
    if (id === "roadtripo") return r.won && r.best ? Math.max(0, 100 - 20 * Math.max(0, r.n - r.best)) : 0;
    if (id === "voyago") return Math.max(0, Math.min(100, Math.round((r.pts || 0) / 13)));
    return 0;
  }
  function line(id, r) {
    if (!r) return "";
    if (id === "polygo") return !r.won ? "Stumped" : LEVELS[r.n - 1] === "Full" ? "Full outline" : LEVELS[r.n - 1] + " edges";
    if (id === "capitalo") return r.won ? "Turn " + r.n + "/6" : "Stumped";
    if (id === "equalo") return (r.g || []).map(function (x) { return EQ[x]; }).join("");
    if (id === "roadtripo") return !r.won ? "Ran out of gas" : !r.best ? "Arrived in " + r.n : r.n === r.best ? "Shortest route" : "+" + (r.n - r.best) + " over shortest";
    if (id === "voyago") return (r.pts || 0) + " pts" + (r.city ? " · " + r.city : "");
    return "";
  }

  /* Fallback summary straight from a game's own storage, for games finished before this layer existed. */
  function fromGame(g, day) {
    var s = read(g.ls + ":day");
    if (!s || s.day !== day) return { state: "new" };
    if (g.id === "polygo") return s.done ? { state: "done", r: { won: !!s.won, n: (s.guesses || []).length } } : (s.guesses || []).length ? { state: "started" } : { state: "new" };
    if (g.id === "capitalo") return s.done ? { state: "done", r: { won: !!s.won, n: (s.turns || []).length } } : (s.turns || []).length ? { state: "started" } : { state: "new" };
    if (g.id === "equalo") { var res = s.results || []; return res.length >= 3 ? { state: "done", r: { g: res.map(function (x) { return x.g; }) } } : res.length ? { state: "started" } : { state: "new" }; }
    if (g.id === "roadtripo") return s.done ? { state: "done", r: { won: !!s.won, n: (s.guesses || []).length } } : (s.guesses || []).length ? { state: "started" } : { state: "new" };
    if (g.id === "voyago") { var a = s.answers || []; return a.length >= 10 ? { state: "done", r: { pts: a.reduce(function (t, x) { return t + (x.pts || 0); }, 0) } } : (a.length || s.started) ? { state: "started" } : { state: "new" }; }
    return { state: "new" };
  }

  /* Today's status for all five games, in site order. */
  function status() {
    var d = load();
    return GAMES.map(function (g) {
      var own = fromGame(g, d.day), saved = d.games[g.id], out = { id: g.id, name: g.name, icon: g.icon, path: g.path, no: d.day + g.off, state: own.state };
      if (own.state === "done") {
        var r = saved && saved.r ? saved.r : own.r;
        if (g.id === "roadtripo" && saved && saved.r) r = saved.r; /* only the game knows the shortest route */
        out.r = r; out.grid = saved && saved.grid || ""; out.score = score(g.id, r); out.line = line(g.id, r);
      } else if (saved && saved.skip) { out.state = "skip"; out.score = 0; out.line = "Skipped"; }
      return out;
    });
  }
  function finished(st) { return st.state === "done" || st.state === "skip"; }
  function nextGame(list, from) {
    var i = GAMES.findIndex(function (g) { return g.id === from; });
    for (var k = 1; k <= GAMES.length; k++) { var x = list[(i + k + GAMES.length) % GAMES.length]; if (x.id !== from && !finished(x)) return x; }
    return null;
  }
  function sendProgress(list) {
    var d = load(), n = list.filter(function (x) { return x.state === "done"; }).length, changed = false;
    for (var k = 1; k <= n; k++) if (d.sent.indexOf(k) < 0) { d.sent.push(k); track("daily-games-" + k); changed = true; }
    if (changed) write(KEY, d);
  }

  /* ---- styles (uses each page's own colour tokens) ---- */
  var CSS = [
    ".tgd{background:var(--surface,#fff);border:1.5px solid var(--line);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;color:var(--ink);font:15px/1.45 var(--body,system-ui,sans-serif);text-align:left}",
    ".tgd.anim{animation:tgdIn .24s ease-out both}",
    "@keyframes tgdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    ".tgd-top{display:flex;gap:16px;align-items:center}",
    ".tgd-score{flex:none;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;align-content:center;background:conic-gradient(var(--accent) calc(var(--p,0)*1%),var(--line) 0);position:relative}",
    ".tgd-score::before{content:'';position:absolute;inset:6px;border-radius:50%;background:var(--surface,#fff)}",
    ".tgd-score b,.tgd-score span{position:relative}",
    ".tgd-score b{font:800 26px/1 var(--display,system-ui);letter-spacing:-.03em}",
    ".tgd-score span{font:500 11px/1.2 var(--mono,monospace);color:var(--muted)}",
    ".tgd-head{display:flex;flex-direction:column;gap:2px;min-width:0}",
    ".tgd-head small{font:600 11px var(--body,system-ui);letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}",
    ".tgd-head strong{font:800 22px/1.15 var(--display,system-ui);letter-spacing:-.02em}",
    ".tgd-head span{font-size:18px;letter-spacing:1px;overflow-wrap:anywhere}",
    ".tgd-prog{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}",
    ".tgd-prog li{display:flex;flex-direction:column;align-items:center;gap:5px;font:500 11px/1.2 var(--body,system-ui);color:var(--muted);min-width:0}",
    ".tgd-prog li a{color:inherit;text-decoration:none;display:contents}",
    ".tgd-prog i{width:100%;height:8px;border-radius:99px;background:var(--line);display:block}",
    ".tgd-prog .done i{background:var(--accent)}",
    ".tgd-prog .started i{background:linear-gradient(90deg,var(--accent) 45%,var(--line) 45%)}",
    ".tgd-prog .skip i{background:repeating-linear-gradient(90deg,var(--muted) 0 4px,transparent 4px 8px);opacity:.5}",
    ".tgd-prog .cur{color:var(--ink);font-weight:600}",
    ".tgd-prog .cur.pop i{animation:tgdPop .45s ease-out .1s both}",
    "@keyframes tgdPop{0%{transform:scaleX(.2);transform-origin:left}100%{transform:none}}",
    ".tgd-prog b{font:600 10px var(--mono,monospace);color:var(--muted)}",
    ".tgd-sub{font:500 13px var(--body,system-ui);color:var(--muted)}",
    ".tgd-sub b{color:var(--ink);font-family:var(--mono,monospace)}",
    ".tgd-act{display:flex;gap:10px;flex-wrap:wrap;align-items:center}",
    ".tgd-next{flex:1 1 220px;display:inline-flex;justify-content:center;align-items:center;gap:8px;background:var(--accent);color:var(--accent-ink);font:600 16px var(--body,system-ui);padding:14px 20px;border-radius:12px;text-decoration:none;border:0;cursor:pointer;transition:transform .12s,filter .12s}",
    ".tgd-next:hover{filter:brightness(1.06)}.tgd-next:active{transform:scale(.98)}",
    ".tgd-next:focus-visible,.tgd-copy:focus-visible,.tgd-skip:focus-visible{outline:3px solid var(--ink);outline-offset:2px}",
    ".tgd-copy{flex:0 1 auto;background:transparent;color:var(--ink);border:1.5px solid var(--line);font:600 15px var(--body,system-ui);padding:12px 16px;border-radius:12px;cursor:pointer}",
    ".tgd-copy:hover{border-color:var(--ink)}",
    ".tgd-skip{align-self:flex-start;background:none;border:0;padding:0;color:var(--muted);font:500 13px var(--body,system-ui);text-decoration:underline;text-underline-offset:3px;cursor:pointer}",
    ".tgd-skip:hover{color:var(--ink)}",
    ".tgd-hide{display:none!important}",
    "@media (max-width:420px){.tgd{padding:16px}.tgd-score{width:66px;height:66px}.tgd-score b{font-size:22px}.tgd-head strong{font-size:19px}.tgd-prog li{font-size:10px}}",
    "@media (prefers-reduced-motion:reduce){.tgd.anim,.tgd-prog .cur.pop i{animation:none}.tgd-next{transition:none}}"
  ].join("\n");
  function css() {
    if (document.getElementById("tgd-css")) return;
    var s = document.createElement("style"); s.id = "tgd-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function countUp(b, ring, to, animate) {
    if (!animate || reduced() || !window.requestAnimationFrame) { b.textContent = to; ring.style.setProperty("--p", to); return; }
    var t0 = null, dur = 520;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = Math.round(to * e);
      b.textContent = v; ring.style.setProperty("--p", v);
      if (k < 1) requestAnimationFrame(step);
    }
    b.textContent = "0"; requestAnimationFrame(step);
  }

  function progress(list, cur, pop) {
    var ol = el("ol", "tgd-prog"); ol.setAttribute("aria-label", "Today's five games");
    list.forEach(function (x) {
      var li = el("li", x.state + (x.id === cur ? " cur" + (pop ? " pop" : "") : ""));
      var label = x.name + ": " + (x.state === "done" ? "done, " + x.score + " points" : x.state === "started" ? "in progress" : x.state === "skip" ? "skipped" : "not played");
      var a = el("a"); a.href = x.path; a.setAttribute("aria-label", label);
      a.append(el("i"), el("span", null, x.name), el("b", null, x.state === "done" ? String(x.score) : x.state === "skip" ? "skip" : x.state === "started" ? "…" : "–"));
      li.append(a); ol.append(li);
    });
    return ol;
  }

  /* Shared results card. Called by each game at the end of renderEnd(), daily mode only. */
  function finish(id, r, container, shareBtn, grid) {
    try {
      if (!byId[id] || !container) return;
      css();
      var d = load(), had = d.games[id] && d.games[id].r;
      d.games[id] = { r: r, grid: grid || "" };
      write(KEY, d);
      var list = status(), me = list.find(function (x) { return x.id === id; }) || {};
      if (me.state !== "done") { me = { id: id, name: byId[id].name, no: d.day + byId[id].off, state: "done", r: r }; me.score = score(id, r); me.line = line(id, r); }
      me.grid = grid || me.grid;
      sendProgress(list);
      var animate = !had;
      var old = container.querySelector(":scope > .tgd"); if (old) old.remove();

      var card = el("section", "tgd" + (animate ? " anim" : "")); card.setAttribute("aria-label", "Today's Terrago progress");
      var top = el("div", "tgd-top"), ring = el("div", "tgd-score"), b = el("b"), small = el("span", null, "/100");
      ring.setAttribute("aria-label", me.score + " out of 100"); ring.append(b, small);
      var head = el("div", "tgd-head");
      head.append(el("small", null, byId[id].name + " · No. " + me.no), el("strong", null, me.line));
      if (me.grid && id !== "equalo") head.append(el("span", null, me.grid));
      top.append(ring, head);

      var doneN = list.filter(finished).length, total = list.reduce(function (a, x) { return a + (x.score || 0); }, 0);
      var sub = el("div", "tgd-sub"); sub.append(doneN + " of 5 done today · ", el("b", null, total + "/500"), " Terrago score");

      var act = el("div", "tgd-act"), nx = nextGame(list, id), go = el("a", "tgd-next");
      if (nx) { go.href = nx.path; go.textContent = (nx.state === "started" ? "Finish " : "Play ") + nx.name + " →"; go.onclick = function () { track("next-click-" + id); }; }
      else { go.href = "/today/"; go.textContent = "View daily results →"; go.onclick = function () { track("next-click-" + id + "-results"); }; }
      act.append(go);
      if (shareBtn) {
        shareBtn.classList.add("tgd-hide");
        var cp = el("button", "tgd-copy", "Copy result"); cp.type = "button";
        cp.onclick = function () { shareBtn.click(); };
        act.append(cp);
      }
      card.append(top, progress(list, id, animate), sub, act);
      if (nx) {
        var sk = el("button", "tgd-skip", "Skip " + nx.name + " today"); sk.type = "button";
        sk.onclick = function () { skip(nx.id); track("daily-skip-" + nx.id); finish(id, r, container, shareBtn, grid); };
        card.append(sk);
      }
      container.insertBefore(card, container.firstChild);
      countUp(b, ring, me.score, animate);
      /* just finished: bring the card (and its next-game button) on screen, e.g. below Polygo's guess list on phones */
      if (animate && card.scrollIntoView) {
        var rect = card.getBoundingClientRect();
        if (rect.bottom > window.innerHeight || rect.top < 0) card.scrollIntoView({ block: rect.height < window.innerHeight * 0.9 ? "center" : "start", behavior: reduced() ? "auto" : "smooth" });
      }
    } catch (e) { /* never break a game */ }
  }
  function skip(id) { var d = load(); if (!d.games[id]) d.games[id] = { skip: true }; write(KEY, d); }

  /* Combined share text for /today/ */
  function shareText(list) {
    var dstr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");
    var total = list.reduce(function (a, x) { return a + (x.score || 0); }, 0);
    var rows = list.map(function (x) { return x.icon + " " + x.name + " " + (x.state === "done" ? x.line.replace(/ · .*$/, "") : x.state === "skip" ? "skipped" : "–"); });
    return "Terrago · " + dstr + " · " + total + "/500\n" + rows.join("\n") + "\nplayterrago.com/?ref=daily";
  }

  window.tgDaily = { games: GAMES, status: status, next: nextGame, finish: finish, skip: skip, score: score, line: line, shareText: shareText, finished: finished, css: css, progress: progress, track: track, reduced: reduced, countUp: countUp };
})();
