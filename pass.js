/* Terrago boarding pass: draws today's results as a 1080x1350 PNG and shares it.
   Phones and Safari/Chrome on Mac: native share sheet with the image attached.
   Other desktop browsers: copy the image to the clipboard, with a download as the last resort.
   Reads only tgDaily.status(); never writes game state. */
(function () {
  "use strict";
  var W = 1080, H = 1350;
  var C = { bg: "#e9edf1", paper: "#fffdf9", ink: "#111a24", muted: "#6b7684", line: "#dcd6cc", acc: "#d9590b", accSoft: "#ffd9bf" };
  var DISPLAY = "'Bricolage Grotesque', 'Avenir Next', system-ui, sans-serif";
  var MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";
  var CODES = { polygo: "POL", capitalo: "CAP", equalo: "EQU", roadtripo: "ROA", voyago: "VOY" };

  function cls(total) { return total >= 450 ? "FIRST" : total >= 350 ? "BUSINESS" : total >= 200 ? "ECONOMY" : "STANDBY"; }
  function dayNo() { var n = new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 2)) / 864e5) + 1; }

  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var want = ["800 64px 'Bricolage Grotesque'", "600 20px 'IBM Plex Mono'", "500 20px 'IBM Plex Mono'"];
    var all = Promise.all(want.map(function (f) { return document.fonts.load(f, "TERRAGO 0123"); }));
    var cap = new Promise(function (r) { setTimeout(r, 2500); }); /* never hold the button hostage to a slow font */
    return Promise.race([all, cap]).catch(function () {});
  }

  function rr(x, c, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); x.fillStyle = c; x.fill(); }
  function txt(x, s, X, Y, font, color, align, track) {
    x.font = font; x.fillStyle = color; x.textAlign = align || "left";
    if (track && "letterSpacing" in x) { x.letterSpacing = track + "px"; x.fillText(s, X, Y); x.letterSpacing = "0px"; }
    else x.fillText(s, X, Y);
  }
  function fit(x, s, font, max) { x.font = font; if (x.measureText(s).width <= max) return s; while (s.length > 1 && x.measureText(s + "…").width > max) s = s.slice(0, -1); return s + "…"; }
  function dash(x, x1, y, x2, color, w, on, off) { x.save(); x.strokeStyle = color; x.lineWidth = w; x.setLineDash([on, off]); x.beginPath(); x.moveTo(x1, y); x.lineTo(x2, y); x.stroke(); x.restore(); }

  function draw(list) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    var total = list.reduce(function (a, g) { return a + (g.score || 0); }, 0);
    var played = list.filter(function (g) { return g.state === "done"; });
    var best = played.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); })[0];
    var d = new Date(), dstr = d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "").toUpperCase();
    var parts = dstr.split(" "); dstr = parts[0] + " " + parts[2] + " " + parts[1] + " " + parts[3]; /* THU 05 NOV 2026 */
    var L = 90, R = 990, PL = L + 56, PR = R - 56, T = 86;

    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    x.save(); x.shadowColor = "rgba(17,26,36,.18)"; x.shadowBlur = 50; x.shadowOffsetY = 24; rr(x, C.paper, L, T, R - L, 1178, 36); x.restore();
    x.save(); rr(x, C.paper, L, T, R - L, 1178, 36); x.clip();
    x.fillStyle = C.acc; x.fillRect(L, T, R - L, 140);
    x.restore();

    /* header */
    txt(x, "terra", PL, T + 92, "800 64px " + DISPLAY, "#fff");
    x.font = "800 64px " + DISPLAY; var tw = x.measureText("terra").width;
    txt(x, "go", PL + tw, T + 92, "800 64px " + DISPLAY, C.accSoft);
    txt(x, "DAILY PASS", PR, T + 62, "600 20px " + MONO, "#fff", "right", 3);
    txt(x, dstr, PR, T + 92, "600 20px " + MONO, "#fff", "right", 3);

    /* route */
    var no = String(dayNo()).padStart(3, "0");
    txt(x, "DAY", PL, T + 264, "800 92px " + DISPLAY, C.ink, "left", -3);
    txt(x, no, PR, T + 264, "800 92px " + DISPLAY, C.ink, "right", -3);
    txt(x, "DEPARTED 00:00", PL, T + 296, "500 18px " + MONO, C.muted, "left", 2);
    txt(x, "5 GAMES · 5 STOPS", PR, T + 296, "500 18px " + MONO, C.muted, "right", 2);
    x.font = "800 92px " + DISPLAY;
    var a1 = PL + x.measureText("DAY").width + 36, a2 = PR - x.measureText(no).width - 50;
    dash(x, a1, T + 241, a2 - 10, C.acc, 3, 12, 10);
    x.fillStyle = C.acc; x.beginPath(); x.moveTo(a2 + 8, T + 241); x.lineTo(a2 - 12, T + 230); x.lineTo(a2 - 12, T + 252); x.closePath(); x.fill();

    /* facts */
    var fy = T + 350, col = (PR - PL) / 3;
    [["SCORE", String(total), "/500", C.acc], ["CLASS", cls(total), "", C.ink], ["BEST LEG", best ? CODES[best.id] : "—", "", C.ink]].forEach(function (f, i) {
      var fx = PL + col * i;
      txt(x, f[0], fx, fy, "600 16px " + MONO, C.muted, "left", 3);
      txt(x, f[1], fx, fy + 58, "800 " + (f[1].length > 6 ? 44 : 52) + "px " + DISPLAY, f[3]);
      if (f[2]) { x.font = "800 52px " + DISPLAY; txt(x, f[2], fx + x.measureText(f[1]).width + 4, fy + 58, "500 22px " + MONO, C.muted); }
    });
    dash(x, PL, fy + 100, PR, C.line, 3, 8, 8);

    /* legs */
    var ly = fy + 156;
    list.forEach(function (g, i) {
      var y = ly + i * 94, s = g.state === "done" ? g.score : 0;
      var res = g.state === "done" ? (g.line || "") : g.state === "skip" ? "Skipped" : "Not played";
      txt(x, CODES[g.id], PL, y, "600 18px " + MONO, C.acc, "left", 1.5);
      txt(x, g.name, PL + 88, y + 2, "800 32px " + DISPLAY, C.ink, "left", -0.5);
      x.font = "800 36px " + DISPLAY; var sw = x.measureText(String(s)).width;
      x.font = "500 16px " + MONO; var dw = x.measureText("/100").width;
      txt(x, "/100", PR, y + 2, "500 16px " + MONO, C.muted, "right");
      txt(x, String(s), PR - dw - 2, y + 2, "800 36px " + DISPLAY, C.ink, "right");
      x.font = "800 32px " + DISPLAY; var nw = x.measureText(g.name).width;
      var resMax = (PR - dw - sw - 30) - (PL + 88 + nw + 30);
      txt(x, fit(x, res, "500 20px " + MONO, resMax), PR - dw - sw - 30, y, "500 20px " + MONO, C.muted, "right");
      rr(x, C.line, PL + 88, y + 30, PR - PL - 88, 6, 3);
      if (s > 0) rr(x, C.acc, PL + 88, y + 30, (PR - PL - 88) * s / 100, 6, 3);
      if (i < list.length - 1) { x.fillStyle = C.line; x.fillRect(PL, y + 54, PR - PL, 1); }
    });

    /* tear line + stub */
    var ty = T + 1024;
    dash(x, L, ty, R, C.line, 3, 8, 8);
    x.fillStyle = C.bg; x.beginPath(); x.arc(L, ty, 22, -Math.PI / 2, Math.PI / 2); x.fill(); x.beginPath(); x.arc(R, ty, 22, Math.PI / 2, Math.PI * 1.5); x.fill();
    var bx = PL, seed = total * 31 + dayNo() * 7;
    x.fillStyle = C.ink;
    while (bx < PL + 540) { seed = (seed * 9301 + 49297) % 233280; var bw = 1 + (seed % 4); x.fillRect(bx, ty + 32, bw, 84); bx += bw + 2 + (seed >> 3) % 4; }
    txt(x, "Beat my score", PR, ty + 76, "600 22px " + MONO, C.ink, "right");
    txt(x, "playterrago.com", PR, ty + 110, "600 22px " + MONO, C.acc, "right");
    return cv;
  }

  /* Build once, ahead of the tap: iOS drops the share permission if the tap waits on async work. */
  function prepare(list) {
    return fonts().then(function () {
      var cv = draw(list);
      return new Promise(function (res) { cv.toBlob(function (b) { res({ canvas: cv, blob: b, file: b ? new File([b], "terrago-day-" + dayNo() + ".png", { type: "image/png" }) : null }); }, "image/png"); });
    });
  }

  function canShareFile(file) {
    try { return !!(file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })); } catch (e) { return false; }
  }

  function download(p) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(p.blob); a.download = p.file.name;
    document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* Returns a promise resolving to "shared" | "cancelled" | "copied" | "downloaded". */
  function share(p, text) {
    if (canShareFile(p.file)) {
      return navigator.share({ files: [p.file], text: text }).then(function () { return "shared"; }, function (e) {
        if (e && e.name === "AbortError") return "cancelled";
        return copy(p);
      });
    }
    return copy(p);
  }
  function copy(p) {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        return navigator.clipboard.write([new ClipboardItem({ "image/png": p.blob })]).then(function () { return "copied"; }, function () { download(p); return "downloaded"; });
      }
    } catch (e) {}
    download(p); return Promise.resolve("downloaded");
  }

  window.tgPass = { dayNo: dayNo, draw: draw, prepare: prepare, share: share, download: download, canShareFile: canShareFile, cls: cls };
})();
