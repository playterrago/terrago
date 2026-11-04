import fs from "fs";
import * as topojson from "topojson-client";
import * as d3 from "d3-geo";
const load = f => { const t = JSON.parse(fs.readFileSync("node_modules/world-atlas/" + f)); return topojson.feature(t, t.objects.countries).features.filter(x => x.geometry && x.id !== "010"); };
const f50 = load("countries-50m.json"), f110 = load("countries-110m.json");
const polysOf = g => g.type === "Polygon" ? [g.coordinates] : g.coordinates;
// world map (110m) for the guess map
for (const f of f110) f.geometry = { type: "MultiPolygon", coordinates: polysOf(f.geometry).filter(p => d3.geoCentroid({ type: "Polygon", coordinates: p })[1] > -58) };
const W = 1000, fc = { type: "FeatureCollection", features: f110 };
const proj = d3.geoNaturalEarth1().rotate([-10, 0]).fitWidth(W - 10, fc);
const [[x0, y0], [, y1]] = d3.geoPath(proj).bounds(fc);
proj.translate([proj.translate()[0] - x0 + 5, proj.translate()[1] - y0 + 5]);
const H = Math.ceil(y1 - y0 + 10);
const world = d3.geoPath(proj).digits(1)(fc);
// capitals
const caps = []; let region;
for (const line of fs.readFileSync("world.txt", "utf8").trim().split("\n")) {
  const p = line.split("|"); if (p.length === 1) { region = line; continue; }
  const [country, capital, alts, lat, lon] = p;
  caps.push({ country, capital, alt: alts ? alts.split(";") : undefined, r: region, lat: +lat, lon: +lon });
}
// true coordinates (two pins were nudged apart for the map quiz)
const TRUE = { Kinshasa: [-4.32, 15.31], Brazzaville: [-4.27, 15.24], Rome: [41.90, 12.50], "Vatican City": [41.90, 12.45] };
for (const c of caps) if (TRUE[c.capital]) [c.lat, c.lon] = TRUE[c.capital];
const n = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
let noSil = [];
for (const c of caps) {
  const pt = [c.lon, c.lat];
  let f = f50.find(x => d3.geoContains(x, pt));
  if (!f) f = f50.find(x => { const a = n(x.properties.name), b = n(c.country); return a === b || (a.length > 4 && b.startsWith(a.slice(0, 5))); });
  if (c.country === "Vatican City" || !f) { noSil.push(c.country); continue; }
  const polys = polysOf(f.geometry);
  const areas = polys.map(p => d3.geoArea({ type: "Polygon", coordinates: p }));
  const tot = areas.reduce((a, b) => a + b, 0);
  const keep = polys.filter((p, i) => d3.geoDistance(d3.geoCentroid({ type: "Polygon", coordinates: p }), pt) * 6371 < 3500 || areas[i] > tot * 0.2);
  const g = { type: "MultiPolygon", coordinates: keep };
  const cen = d3.geoCentroid(g);
  const sp = d3.geoAzimuthalEqualArea().rotate([-cen[0], -cen[1]]).fitExtent([[6, 6], [194, 194]], g);
  c.sil = d3.geoPath(sp).digits(1)(g);
  const cp = sp(pt); c.sx = +cp[0].toFixed(1); c.sy = +cp[1].toFixed(1);
}
for (const c of caps) { const [x, y] = proj([c.lon, c.lat]); c.x = +x.toFixed(1); c.y = +y.toFixed(1); }
fs.writeFileSync("clues.json", JSON.stringify({ W, H, world, caps }));
console.log(caps.length, "caps; no silhouette:", noSil.join(", "), "; size", (JSON.stringify({ world, caps }).length / 1024 | 0) + "KB");
// preview a few silhouettes
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="400" viewBox="0 0 1000 400">`;
["Canada", "Russia", "France", "Chile", "Indonesia", "Kiribati", "United States", "Italy", "Fiji", "Norway"].forEach((name, i) => {
  const c = caps.find(z => z.country === name); s += `<g transform="translate(${(i % 5) * 200} ${Math.floor(i / 5) * 200})"><rect width="200" height="200" fill="#eef" stroke="#999"/><path d="${c.sil}" fill="#333"/><circle cx="${c.sx}" cy="${c.sy}" r="4" fill="red"/></g>`;
});
fs.writeFileSync("sil.svg", s + "</svg>");
