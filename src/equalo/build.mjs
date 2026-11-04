import fs from "fs";
const caps = JSON.parse(fs.readFileSync("../mapbuild/clues2.json")).caps;
const wc = JSON.parse(fs.readFileSync("node_modules/world-countries/countries.json"));
const cj = f => JSON.parse(fs.readFileSync(`node_modules/country-json/src/country-by-${f}.json`));
const n = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const OVR = { "DR Congo": "COD", "Republic of the Congo": "COG", "Ivory Coast": "CIV", "Cabo Verde": "CPV", "Eswatini": "SWZ", "Timor-Leste": "TLS", "Micronesia": "FSM", "Vatican City": "VAT", "São Tomé and Príncipe": "STP", "Kosovo": "UNK", "Czechia": "CZE", "North Korea": "PRK", "South Korea": "KOR", "United States": "USA", "United Kingdom": "GBR", "Gambia": "GMB", "Bahamas": "BHS", "Saint Kitts and Nevis": "KNA", "Saint Lucia": "LCA", "Saint Vincent and the Grenadines": "VCT", "Myanmar": "MMR", "Laos": "LAO", "Syria": "SYR", "Russia": "RUS", "Iran": "IRN", "Vietnam": "VNM", "Brunei": "BRN", "Moldova": "MDA", "Bolivia": "BOL", "Venezuela": "VEN", "Tanzania": "TZA", "North Macedonia": "MKD", "Turkey": "TUR" };
const byIso = {}; wc.forEach(c => byIso[c.cca3] = c);
const iso = c => OVR[c.country] || (wc.find(w => n(w.name.common) === n(c.country) || n(w.name.official) === n(c.country) || (w.altSpellings || []).some(a => n(a) === n(c.country))) || {}).cca3;
const parse = f => Object.fromEntries(fs.readFileSync(f, "utf8").trim().split(",").map(p => { const [k, v] = p.split(":"); return [k, +v]; }));
const forest = parse("forest.txt"), gdp = parse("gdp.txt");
// country-json names -> iso via world-countries
const CJ_OVR = { "Congo": "COG", "The Democratic Republic of Congo": "COD", "Ivory Coast": "CIV", "Cape Verde": "CPV", "Swaziland": "SWZ", "East Timor": "TLS", "Micronesia, Federated States of": "FSM", "Holy See (Vatican City State)": "VAT", "Sao Tome and Principe": "STP", "Czech Republic": "CZE", "North Korea": "PRK", "South Korea": "KOR", "United States": "USA", "United Kingdom": "GBR", "Libyan Arab Jamahiriya": "LBY", "Russian Federation": "RUS", "Macedonia": "MKD", "Myanmar": "MMR", "Syria": "SYR", "Laos": "LAO", "Brunei": "BRN", "Vietnam": "VNM", "Iran": "IRN", "Moldova": "MDA", "Bolivia": "BOL", "Venezuela": "VEN", "Tanzania": "TZA", "Turkey": "TUR", "Fiji Islands": "FJI", "Saint Kitts and Nevis": "KNA", "Saint Lucia": "LCA", "Saint Vincent and the Grenadines": "VCT", "Bahamas": "BHS", "Gambia": "GMB", "Kosovo": "UNK", "Palestine": "PSE" };
const cjIso = name => CJ_OVR[name] || (wc.find(w => n(w.name.common) === n(name) || n(w.name.official) === n(name) || (w.altSpellings || []).some(a => n(a) === n(name))) || {}).cca3;
const temp = {}, elev = {};
cj("yearly-average-temperature").forEach(x => { const i = cjIso(x.country); if (i && x.temperature != null) temp[i] = x.temperature; });
cj("elevation").forEach(x => { const i = cjIso(x.country); if (i && x.elevation != null) elev[i] = x.elevation; });
const out = [], miss = {};
for (const c of caps) {
  const i = iso(c); if (!i) { (miss.iso ||= []).push(c.country); continue; }
  const w = byIso[i];
  const row = { c: c.country, r: c.r, i, f: w?.flag, pop: c.pop, area: w?.area, forest: forest[i === "UNK" ? "XKX" : i], gdp: gdp[i === "UNK" ? "XKX" : i], temp: temp[i], elev: elev[i], lat: c.lat, nb: c.nb };
  for (const k of ["area", "forest", "gdp", "temp", "elev"]) if (row[k] == null) (miss[k] ||= []).push(c.country);
  delete row.elev; out.push(row);
}
fs.writeFileSync("ranko.json", JSON.stringify(out));
console.log(out.length, "countries"); for (const [k, v] of Object.entries(miss)) console.log("missing", k, v.length, v.join(", "));
const show = ["Canada", "Peru", "Italy", "Nepal", "Kosovo"]; show.forEach(s => console.log(JSON.stringify(out.find(o => o.c === s))));
