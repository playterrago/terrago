import fs from "fs";
import * as topojson from "topojson-client";
import * as d3 from "d3-geo";
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const f50 = topojson.feature(topo, topo.objects.countries).features.filter(f => f.geometry && f.id !== "010");
const polysOf = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
const n = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const caps = []; let region;
for (const line of fs.readFileSync("world.txt", "utf8").trim().split("\n")) {
  const p = line.split("|"); if (p.length === 1) { region = line; continue; }
  caps.push({ country: p[0], r: region, lat: +p[3], lon: +p[4] });
}
// ---- Visvalingam-Whyatt, global across rings ----
const triArea = (a, b, c) => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
const ringArea = r => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
function simplify(rings, target) {
  // nodes in circular doubly linked lists
  const nodes = []; const ringInfo = [];
  rings.forEach((r, ri) => {
    const start = nodes.length;
    r.forEach(p => nodes.push({ p, ri, prev: 0, next: 0, area: 0, alive: true }));
    const len = r.length;
    for (let k = 0; k < len; k++) { const nd = nodes[start + k]; nd.prev = start + (k - 1 + len) % len; nd.next = start + (k + 1) % len; }
    ringInfo.push({ count: len, alive: true });
  });
  const calc = i => { const nd = nodes[i]; nd.area = triArea(nodes[nd.prev].p, nd.p, nodes[nd.next].p); };
  nodes.forEach((_, i) => calc(i));
  let total = nodes.length;
  // simple heap
  const heap = []; const push = (a, i) => { heap.push([a, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  nodes.forEach((nd, i) => push(nd.area, i));
  let maxSeen = 0;
  while (total > target && heap.length) {
    const [a, i] = pop(); const nd = nodes[i];
    if (!nd.alive || a !== nd.area) continue;
    const ri = ringInfo[nd.ri];
    if (ri.count <= 3) { // drop whole ring
      let j = i; do { nodes[j].alive = false; j = nodes[j].next; } while (j !== i);
      total -= ri.count; ri.count = 0; ri.alive = false; continue;
    }
    maxSeen = Math.max(maxSeen, a);
    nd.alive = false; ri.count--; total--;
    const pv = nd.prev, nx = nd.next; nodes[pv].next = nx; nodes[nx].prev = pv;
    for (const j of [pv, nx]) { calc(j); nodes[j].area = Math.max(nodes[j].area, maxSeen); push(nodes[j].area, j); }
  }
  const out = [];
  rings.forEach((r, ri) => {
    if (!ringInfo[ri].alive || ringInfo[ri].count < 3) return;
    const first = nodes.findIndex(nd => nd.ri === ri && nd.alive); if (first < 0) return;
    const ring = []; let j = first; do { ring.push(nodes[j].p); j = nodes[j].next; } while (j !== first);
    out.push(ring);
  });
  return out;
}
const fmt = v => +v.toFixed(1);
const toPath = rings => rings.map(r => "M" + r.map(p => fmt(p[0]) + "," + fmt(p[1])).join("L") + "Z").join("");
const LEVELS = [2, 4, 8, 16, 32, 64, 128];
const out = []; const skipped = [];
for (const c of caps) {
  const pt = [c.lon, c.lat];
  let f = f50.find(x => d3.geoContains(x, pt));
  if (!f) f = f50.find(x => { const a = n(x.properties.name), b = n(c.country); return a === b || (a.length > 4 && b.startsWith(a.slice(0, 5))); });
  if (!f || c.country === "Vatican City") { skipped.push(c.country + "(no shape)"); out.push({ country: c.country, r: c.r, clat: c.lat, clon: c.lon, playable: false }); continue; }
  const polys = polysOf(f.geometry);
  const areas = polys.map(p => d3.geoArea({ type: "Polygon", coordinates: p })), tot = areas.reduce((a, b) => a + b, 0);
  const keep = polys.filter((p, i) => d3.geoDistance(d3.geoCentroid({ type: "Polygon", coordinates: p }), pt) * 6371 < 3500 || areas[i] > tot * 0.2);
  const g = { type: "MultiPolygon", coordinates: keep };
  const cen = d3.geoCentroid(g);
  const proj = d3.geoAzimuthalEqualArea().rotate([-cen[0], -cen[1]]).fitExtent([[12, 12], [288, 288]], g);
  // projected outer rings only (holes ignored)
  let rings = keep.map(p => p[0].slice(0, -1).map(q => proj(q))).filter(r => r.length >= 3);
  const nVerts = rings.reduce((s, r) => s + r.length, 0);
  const mainShare = Math.max(...rings.map(ringArea)) / rings.reduce((s, r) => s + ringArea(r), 0);
  const levels = [];
  for (const L of LEVELS) {
    if (L === 2) continue;
    levels.push(toPath(simplify(rings, L)));
  }
  // 2 edges: the longest chord of the 4-vertex shape's main ring
  const four = simplify(rings, 12).flat();
  let best = [four[0], four[1]], bd = 0;
  for (const a of four) for (const b of four) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > bd) { bd = d; best = [a, b]; } }
  levels.unshift(`M${fmt(best[0][0])},${fmt(best[0][1])}L${fmt(best[1][0])},${fmt(best[1][1])}`);
  const full = toPath(simplify(rings, Math.min(nVerts, 420)));
  const playable = nVerts >= 64 && mainShare >= 0.25;
  if (!playable) skipped.push(`${c.country}(verts ${nVerts}, main ${mainShare.toFixed(2)})`);
  out.push(playable ? { country: c.country, r: c.r, clat: +cen[1].toFixed(2), clon: +cen[0].toFixed(2), levels, full, playable } : { country: c.country, r: c.r, clat: +cen[1].toFixed(2), clon: +cen[0].toFixed(2), playable });
}
fs.writeFileSync("edge.json", JSON.stringify(out));
console.log(out.length, "shapes,", out.filter(o => o.playable).length, "playable; size", (JSON.stringify(out).length / 1024 | 0) + "KB");
console.log("skipped/unplayable:", skipped.join(", "));
// preview sheet
const pick = ["Italy", "Chile", "Japan", "France", "Brazil", "Indonesia"];
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${pick.length * 200}" viewBox="0 0 1800 ${pick.length * 300}">`;
pick.forEach((name, row) => { const o = out.find(x => x.country === name); o.levels.forEach((d, k) => { s += `<g transform="translate(${k * 300} ${row * 300})"><rect width="300" height="300" fill="#eef" stroke="#bbb"/><path d="${d}" fill="${k ? "#223" : "none"}" stroke="#223" stroke-width="${k ? 1 : 6}" stroke-linecap="round"/></g>`; }); });
fs.writeFileSync("edge.svg", s + "</svg>");
