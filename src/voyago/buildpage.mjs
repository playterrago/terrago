import fs from "fs";
const t = fs.readFileSync("voyago-template.html", "utf8").replace("/*DATA*/", fs.readFileSync("voyago.json", "utf8"));
fs.writeFileSync("/home/claude/voyago.html", t);
// sanity: run the non-DOM part and check the prompt bank and a year of daily sets
const js = t.split("<script>")[1].split("/* ---------- state")[0];
const f = new Function(js + "; return { BANK, makeSet, tierOf, byN };")();
console.log("prompts in bank:", f.BANK.length);
const counts = {}; f.BANK.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
console.log(JSON.stringify(counts));
let bad = 0; const seen = new Map();
for (let d = 1; d <= 365; d++) { const s = f.makeSet(20261107 + d * 2654435761 % 1000003); if (s.length !== 10) bad++; s.forEach(i => seen.set(i, (seen.get(i) || 0) + 1)); }
console.log("bad days", bad, "distinct prompts used", seen.size);
for (const ty of ["border", "isl", "same", "capsame", "capmulti", "tiny", "lang"]) {
  const p = f.BANK.find(x => x.type === ty); if (!p) { console.log("none", ty); continue; }
  const s = p.ans.map(n => f.byN[n]).sort((a, b) => b.fam - a.fam);
  console.log(`\n${p.text} (${p.ans.length}): ` + [0, 1, 2, 3, 4, 5].map(t => t + ":" + s.filter(c => f.tierOf(p, c.n) === t).map(c => p.kind === "capital" ? c.cap : c.n).join("/")).join("  "));
}
