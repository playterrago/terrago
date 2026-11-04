// Roadtripo: lower-48 US states only, plus famous landmarks projected onto the same map.
import fs from "fs";
import * as topo from "topojson-server";
import * as simp from "topojson-simplify";
import * as tc from "topojson-client";
import * as d3 from "d3-geo";
const raw = JSON.parse(fs.readFileSync("adj_raw.json"));
const keep = raw.names.map((n, i) => i).filter(i => raw.country[i] === "USA" && raw.names[i] !== "Alaska");
const names = keep.map(i => raw.names[i]);
const ix = n => { const i = names.indexOf(n); if (i < 0) throw new Error("no " + n); return i; };
const A = keep.map(i => new Set(raw.adj[i].filter(j => keep.includes(j)).map(j => keep.indexOf(j))));
const cut = (a, b) => { A[ix(a)].delete(ix(b)); A[ix(b)].delete(ix(a)); };
const add = (a, b) => { A[ix(a)].add(ix(b)); A[ix(b)].add(ix(a)); };
cut("Michigan", "Illinois"); cut("Michigan", "Minnesota"); add("Delaware", "New Jersey");

const g = JSON.parse(fs.readFileSync("data/na.geojson"));
const feats = names.map(n => g.features.find(f => f.properties.name === n));
// Natural Earth state shapes run to the middle of the Great Lakes, so the lakes are drawn on top as water
const GL = ["Lake Superior", "Lake Michigan", "Lake Huron", "Lake Erie", "Lake Ontario", "Lake Saint Clair"];
const LKF = JSON.parse(fs.readFileSync("lakes/lakes.geojson")).features.filter(f => GL.includes(f.properties.name));
let T = topo.topology({ r: { type: "FeatureCollection", features: feats } }, 1e5);
T = simp.simplify(simp.presimplify(T), 0.0015);
const fr = tc.feature(T, T.objects.r).features.map(f => { const gm = f.geometry; if (!gm || gm.type !== "MultiPolygon") return f; const polys = gm.coordinates.map(p => ({ p, a: d3.geoArea({ type: "Polygon", coordinates: p }) })); const max = Math.max(...polys.map(x => x.a)); return { ...f, geometry: { type: "MultiPolygon", coordinates: polys.filter(x => x.a > max * 0.01).map(x => x.p) } }; });
const W = 1000;
const proj = d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]);
const fc = { type: "FeatureCollection", features: fr };
proj.fitWidth(W - 20, fc);
const [[x0, y0], [, y1]] = d3.geoPath(proj).bounds(fc);
proj.translate([proj.translate()[0] - x0 + 10, proj.translate()[1] - y0 + 10]);
const H = Math.ceil(y1 - y0 + 20);
const path = d3.geoPath(proj).digits(1);
const POST = { Washington: "WA", Oregon: "OR" };
const regions = fr.map((f, i) => { const [cx, cy] = path.centroid(f); return { n: names[i], p: feats[i].properties.postal, d: path(f), x: +cx.toFixed(1), y: +cy.toFixed(1), adj: [...A[i]].sort((a, b) => a - b) }; });
// label nudges for odd-shaped states
const NUDGE = { Michigan: [18, 30], Florida: [22, 8], Louisiana: [-14, -6], Maryland: [0, -6], Virginia: [10, 4], Massachusetts: [-6, -6] };
regions.forEach(r => { const d = NUDGE[r.n]; if (d) { r.x += d[0]; r.y += d[1]; } });
const outline = path(tc.merge(T, T.objects.r.geometries));
let LT = topo.topology({ l: { type: "FeatureCollection", features: LKF } }, 1e5);
LT = simp.simplify(simp.presimplify(LT), 0.0015);
const lakes = path(tc.feature(LT, LT.objects.l));

// name | states (comma) | lat | lon
const LM = fs.readFileSync("landmarks.txt", "utf8").trim().split("\n").filter(l => l && !l.startsWith("#")).map(l => {
  const [n, st, lat, lon] = l.split("|"); const [x, y] = proj([+lon, +lat]);
  return { n, s: st.split(",").map(s => ix(s.trim())), x: +x.toFixed(1), y: +y.toFixed(1) };
});
fs.writeFileSync("roadtripo.json", JSON.stringify({ W, H, regions, outline, lakes, landmarks: LM }));
console.log(regions.length, "states;", LM.length, "landmarks;", (fs.statSync("roadtripo.json").size / 1024 | 0) + "KB; H", H);
const bfs = s => { const d = Array(names.length).fill(-1); d[s] = 0; const q = [s]; while (q.length) { const u = q.shift(); for (const v of regions[u].adj) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); } } return d; };
console.log("unreachable from Texas:", names.filter((n, i) => bfs(ix("Texas"))[i] < 0), "| Michigan:", regions[ix("Michigan")].adj.map(k => names[k]));
