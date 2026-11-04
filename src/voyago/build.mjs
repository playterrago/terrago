// Voyago data: countries with facts for prompts, a familiarity score for rarity, and the projected world route.
import fs from "fs";
import { createRequire } from "module";
const require = createRequire("/tmp/claude-0/mapbuild/");
const d3 = require("d3-geo");
const topo = require("topojson-client");
const MB = "/tmp/claude-0/mapbuild/";

/* ---------- countries ---------- */
let cont = null; const C = [];
for (const l of fs.readFileSync(MB + "world.txt", "utf8").split("\n")) {
  if (!l.trim()) continue;
  if (!l.includes("|")) { cont = l.trim(); continue; }
  const [n, cap, alts, lat, lon] = l.split("|");
  C.push({ n, cap, capAlts: alts ? alts.split(",").map(s => s.trim()).filter(Boolean) : [], cont, lat: +lat, lon: +lon });
}
const byN = Object.fromEntries(C.map(c => [c.n, c]));
const must = n => { if (!byN[n]) throw new Error("unknown country " + n); return byN[n]; };
for (const l of fs.readFileSync(MB + "meta.txt", "utf8").split("\n")) { const [n, pop, lang] = l.split("|"); if (byN[n]) { byN[n].pop = +pop; byN[n].lang = lang; } }
for (const r of JSON.parse(fs.readFileSync("/tmp/claude-0/ranko/ranko.json", "utf8"))) { const c = must(r.c); c.area = r.area; c.f = r.f; c.gdp = r.gdp; c.forest = r.forest; c.temp = r.temp; }
const NB = JSON.parse(fs.readFileSync(MB + "nb.json", "utf8"));
C.forEach(c => { c.nb = new Set((NB[c.n] || []).filter(x => byN[x])); });
const link = (a, b) => { must(a).nb.add(b); must(b).nb.add(a); };
[["Djibouti", "Somalia"], ["Zambia", "Botswana"], ["Morocco", "Spain"], ["Italy", "Vatican City"], ["Israel", "Lebanon"], ["Israel", "Syria"], ["Israel", "Jordan"], ["Israel", "Egypt"],
 ["Kosovo", "Serbia"], ["Kosovo", "Montenegro"], ["Kosovo", "Albania"], ["Kosovo", "North Macedonia"]].forEach(p => link(...p));
C.forEach(c => c.nb.forEach(x => byN[x].nb.add(c.n)));

const set = (name, list) => { list.forEach(n => { must(n)[name] = 1; }); };
set("ll", ["Afghanistan", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belarus", "Bhutan", "Bolivia", "Botswana", "Burkina Faso", "Burundi", "Central African Republic", "Chad", "Czechia", "Eswatini", "Ethiopia", "Hungary", "Kazakhstan", "Kosovo", "Kyrgyzstan", "Laos", "Lesotho", "Liechtenstein", "Luxembourg", "Malawi", "Mali", "Moldova", "Mongolia", "Nepal", "Niger", "North Macedonia", "Paraguay", "Rwanda", "San Marino", "Serbia", "Slovakia", "South Sudan", "Switzerland", "Tajikistan", "Turkmenistan", "Uganda", "Uzbekistan", "Vatican City", "Zambia", "Zimbabwe"]);
set("isl", ["Antigua and Barbuda", "Bahamas", "Bahrain", "Barbados", "Cabo Verde", "Comoros", "Cuba", "Cyprus", "Dominica", "Dominican Republic", "Fiji", "Grenada", "Haiti", "Iceland", "Indonesia", "Ireland", "Jamaica", "Japan", "Kiribati", "Madagascar", "Maldives", "Malta", "Marshall Islands", "Mauritius", "Micronesia", "Nauru", "New Zealand", "Palau", "Papua New Guinea", "Philippines", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "São Tomé and Príncipe", "Seychelles", "Singapore", "Solomon Islands", "Sri Lanka", "Timor-Leste", "Tonga", "Trinidad and Tobago", "Tuvalu", "United Kingdom", "Vanuatu"]);
set("eq", ["Ecuador", "Colombia", "Brazil", "São Tomé and Príncipe", "Gabon", "Republic of the Congo", "DR Congo", "Uganda", "Kenya", "Somalia", "Maldives", "Indonesia", "Kiribati"]);
set("med", ["Spain", "France", "Monaco", "Italy", "Malta", "Slovenia", "Croatia", "Bosnia and Herzegovina", "Montenegro", "Albania", "Greece", "Turkey", "Cyprus", "Syria", "Lebanon", "Israel", "Egypt", "Libya", "Tunisia", "Algeria", "Morocco"]);
set("eu", ["Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"]);

/* ---------- familiarity: how readily an average player thinks of this country (10 = everyone) ---------- */
const FAM = {
  10: ["United States", "Canada", "Mexico", "Brazil", "Argentina", "United Kingdom", "France", "Germany", "Italy", "Spain", "Russia", "China", "Japan", "India", "Australia", "Egypt"],
  8: ["South Africa", "Portugal", "Netherlands", "Belgium", "Switzerland", "Sweden", "Norway", "Ireland", "Greece", "Turkey", "Poland", "Ukraine", "South Korea", "North Korea", "Israel", "Iran", "Iraq", "Saudi Arabia", "Pakistan", "Afghanistan", "Vietnam", "Thailand", "Indonesia", "Philippines", "New Zealand", "Chile", "Peru", "Colombia", "Cuba", "Jamaica", "Nigeria", "Kenya", "Morocco", "Denmark", "Finland", "Austria", "Uruguay", "Costa Rica", "Panama", "Singapore", "Vatican City", "Monaco"],
  6: ["Venezuela", "Ecuador", "Bolivia", "Paraguay", "Guatemala", "Honduras", "Haiti", "Dominican Republic", "Bahamas", "Iceland", "Czechia", "Hungary", "Romania", "Bulgaria", "Croatia", "Serbia", "Syria", "Lebanon", "Jordan", "United Arab Emirates", "Qatar", "Kuwait", "Malaysia", "Cambodia", "Myanmar", "Nepal", "Bangladesh", "Sri Lanka", "Mongolia", "Kazakhstan", "Ethiopia", "Ghana", "Algeria", "Libya", "Tunisia", "Sudan", "Somalia", "DR Congo", "Madagascar", "Zimbabwe", "Tanzania", "Uganda", "Rwanda", "Luxembourg", "Fiji", "Nicaragua", "El Salvador", "Belarus", "Yemen", "Oman", "Scotland"],
  4: ["Slovakia", "Slovenia", "Bosnia and Herzegovina", "Albania", "North Macedonia", "Montenegro", "Kosovo", "Moldova", "Lithuania", "Latvia", "Estonia", "Malta", "Cyprus", "Liechtenstein", "San Marino", "Andorra", "Armenia", "Azerbaijan", "Georgia", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan", "Laos", "Bhutan", "Maldives", "Brunei", "Timor-Leste", "Papua New Guinea", "Bahrain", "Senegal", "Ivory Coast", "Cameroon", "Angola", "Mozambique", "Zambia", "Botswana", "Namibia", "Mali", "Niger", "Chad", "Mauritius", "Seychelles", "Belize", "Guyana", "Suriname", "Trinidad and Tobago", "Barbados", "Samoa", "Tonga", "Eritrea", "South Sudan", "Malawi", "Burkina Faso", "Gabon", "Republic of the Congo", "Central African Republic", "Sierra Leone", "Liberia", "Guinea", "Benin", "Togo", "Djibouti"],
};
const famOf = {}; for (const [v, list] of Object.entries(FAM)) list.forEach(n => { if (byN[n]) famOf[n] = +v; });
/* within a tier, bigger countries come to mind a little sooner */
C.forEach(c => { c.fam = +((famOf[c.n] || 2) + Math.min(1.5, Math.log10(1 + c.pop) / 2)).toFixed(3); });

const ALIAS_SRC = fs.readFileSync(MB + "aliases.js", "utf8");
const ALIASES = Function(ALIAS_SRC + "; return ALIASES;")();

const out = C.map(c => ({ n: c.n, f: c.f, cap: c.cap, ca: c.capAlts, k: c.cont, pop: c.pop, area: c.area, lang: c.lang, nb: [...c.nb].sort(), fam: c.fam, ll: c.ll || 0, isl: c.isl || 0, eq: c.eq || 0, med: c.med || 0, eu: c.eu || 0, al: ALIASES[c.n] || [], lat: c.lat, lon: c.lon, gdp: c.gdp, forest: c.forest, temp: c.temp }));

/* ---------- route map ---------- */
const CITIES = [["Brussels", 50.850, 4.352], ["Lisbon", 38.722, -9.139], ["Miami", 25.762, -80.192], ["Vancouver", 49.283, -123.121], ["Montreal", 45.502, -73.567], ["Mexico City", 19.433, -99.133], ["Georgetown", 6.801, -58.155], ["Lima", -12.046, -77.043], ["Buenos Aires", -34.604, -58.382], ["Kabul", 34.556, 69.207], ["Shanghai", 31.230, 121.474], ["Jakarta", -6.208, 106.846], ["Manila", 14.600, 120.984], ["Perth", -31.953, 115.857], ["Wellington", -41.287, 174.776], ["Cape Town", -33.925, 18.424], ["Kampala", 0.348, 32.583]];
const MODE = ["drive", "fly", "drive", "fly", "drive", "fly", "fly", "drive", "fly", "fly", "fly", "fly", "fly", "fly", "fly", "drive"];
const W = 1000;
const proj = d3.geoNaturalEarth1().rotate([-10, 0]);
proj.fitWidth(W, { type: "Sphere" });
const top = proj([0, 76])[1], bot = proj([0, -66])[1];
proj.translate([proj.translate()[0], proj.translate()[1] - top]);
const H = Math.round(bot - top);
const land = topo.feature(JSON.parse(fs.readFileSync(MB + "node_modules/world-atlas/land-110m.json")), "land");
const path = d3.geoPath(proj).digits(1);
const cities = CITIES.map(([n, lat, lon]) => { const [x, y] = proj([lon, lat]); return { n, x: +x.toFixed(1), y: +y.toFixed(1) }; });
const legs = MODE.map((m, i) => { const a = CITIES[i], b = CITIES[i + 1]; const ip = d3.geoInterpolate([a[2], a[1]], [b[2], b[1]]); const pts = []; for (let k = 0; k <= 40; k++) { const [x, y] = proj(ip(k / 40)); pts.push([+x.toFixed(1), +y.toFixed(1)]); } return { m, pts }; });
const data = { countries: out, map: { W, H, land: path(land), cities, legs } };
fs.writeFileSync("voyago.json", JSON.stringify(data));
console.log(out.length, "countries;", (fs.statSync("voyago.json").size / 1024 | 0) + "KB; H", H);
console.log("landlocked", out.filter(c => c.ll).length, "islands", out.filter(c => c.isl).length, "no area", out.filter(c => !c.area).map(c => c.n));
