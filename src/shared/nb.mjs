import fs from "fs";
import * as topojson from "topojson-client";
import * as d3 from "d3-geo";
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const geoms = topo.objects.countries.geometries;
const feats = topojson.feature(topo, topo.objects.countries).features;
const nb = topojson.neighbors(geoms);
const { caps } = JSON.parse(fs.readFileSync("clues.json"));
const n = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const idx = {};
for (const c of caps) {
  let i = feats.findIndex(f => f.geometry && d3.geoContains(f, [c.lon, c.lat]));
  if (i < 0) i = feats.findIndex(f => { const a = n(f.properties.name), b = n(c.country); return a === b || (a.length > 4 && b.startsWith(a.slice(0, 5))); });
  if (c.country === "Vatican City") i = -1;
  idx[c.country] = i;
}
const fi2c = {}; for (const [c, i] of Object.entries(idx)) if (i >= 0) fi2c[i] ??= c;
const out = {};
for (const c of caps) {
  const i = idx[c.country]; if (i < 0) { out[c.country] = null; continue; }
  const named = nb[i].map(j => fi2c[j] || "[" + feats[j].properties.name + "]");
  out[c.country] = named;
}
fs.writeFileSync("nb.json", JSON.stringify(out));
for (const [c, v] of Object.entries(out)) if (v && v.length) console.log(c + ": " + v.length + " " + v.join(", "));
console.log("ZERO:", Object.entries(out).filter(([, v]) => v && !v.length).map(([c]) => c).join(", "));
