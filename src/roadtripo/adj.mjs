import fs from "fs";
import * as topo from "topojson-server";
import * as simp from "topojson-simplify";
import * as tc from "topojson-client";
import * as d3 from "d3-geo";
const g = JSON.parse(fs.readFileSync("data/na.geojson"));
const RENAME = { "Distrito Federal": "Mexico City", "México": "State of Mexico", "Québec": "Quebec" };
let feats = g.features.filter(f => f.properties.name && !["District of Columbia", "Hawaii"].includes(f.properties.name));
feats.forEach(f => { f.properties.name = RENAME[f.properties.name] || f.properties.name; });
const T = topo.topology({ r: { type: "FeatureCollection", features: feats } }, 1e6);
const nb = tc.neighbors(T.objects.r.geometries);
const names = T.objects.r.geometries.map((g, i) => feats[i].properties.name);
const adj = names.map(() => new Set());
nb.forEach((list, i) => list.forEach(j => { adj[i].add(j); adj[j].add(i); }));
// near-touching pairs (rivers, narrow straits): simplified geometry, distance < 4 km, not already adjacent
const S = simp.simplify(simp.presimplify(T), 1e-7);
const sf = tc.feature(S, S.objects.r).features;
const R = 6371;
const pts = sf.map(f => { const out = []; const g = f.geometry; if (!g) return out; const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates; polys.forEach(p => p.forEach(ring => ring.forEach(c => out.push(c)))); return out; });
const bb = pts.map(p => { let a = [180, 90, -180, -90]; p.forEach(([x, y]) => { a[0] = Math.min(a[0], x); a[1] = Math.min(a[1], y); a[2] = Math.max(a[2], x); a[3] = Math.max(a[3], y); }); return a; });
const near = [];
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  if (adj[i].has(j)) continue;
  const a = bb[i], b = bb[j], pad = 0.06;
  if (a[0] - pad > b[2] || b[0] - pad > a[2] || a[1] - pad > b[3] || b[1] - pad > a[3]) continue;
  let best = 1e9;
  const pj = pts[j].filter(([x, y]) => x > a[0] - pad && x < a[2] + pad && y > a[1] - pad && y < a[3] + pad);
  const pi = pts[i].filter(([x, y]) => x > b[0] - pad && x < b[2] + pad && y > b[1] - pad && y < b[3] + pad);
  for (const p of pi) for (const q of pj) { const d = d3.geoDistance(p, q) * R; if (d < best) best = d; }
  if (best < 4) near.push([names[i], names[j], +best.toFixed(2)]);
}
fs.writeFileSync("adj_raw.json", JSON.stringify({ names, country: feats.map(f => f.properties.country), adj: adj.map(s => [...s]), near }));
const show = n => names[n] + ": " + [...adj[n]].map(k => names[k]).sort().join(", ");
for (const n of ["Michigan", "Ontario", "Maryland", "Virginia", "Prince Edward Island", "Nunavut", "Baja California", "Texas", "Alaska", "Quebec", "Mexico City"]) console.log(show(names.indexOf(n)));
console.log("NEAR (not touching, <4km):", JSON.stringify(near));
console.log("ISOLATED:", names.filter((n, i) => adj[i].size === 0));
