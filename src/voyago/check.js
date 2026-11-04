const fs = require("fs");
const t = fs.readFileSync("/tmp/claude-0/voyago/voyago-template.html", "utf8").replace("/*DATA*/", fs.readFileSync("/tmp/claude-0/voyago/voyago.json", "utf8"));
fs.writeFileSync("/home/claude/voyago.html", t);
const js = t.split("<script>")[1].split("/* ---------- state")[0];
const f = new Function(js + "; return {BANK,daySet};")();
const ty = {}; f.BANK.forEach(p => ty[p.type] = (ty[p.type] || 0) + 1);
console.log("bank", f.BANK.length, JSON.stringify(ty));
let bad = 0, rep = 0, doubles = 0; const t0 = Date.now();
for (let d = 1; d <= 365; d++) {
  const s = f.daySet(d); if (s.length !== 10) bad++;
  for (let b = Math.max(1, d - 19); b < d; b++) if (f.daySet(b).some(i => s.includes(i))) rep++;
  const k = s.map(i => f.BANK[i].type); if (new Set(k).size < k.length) doubles++;
}
console.log("bad days", bad, "| repeats within 20 days", rep, "| days with a doubled kind", doubles, "| ms", Date.now() - t0);
const sz = f.BANK.map(p => p.ans.length); console.log("answers per prompt min/max", Math.min(...sz), Math.max(...sz));
["rpop", "rarea", "rgdp"].forEach(k => { const p = f.BANK.find(q => q.type === k); console.log(p.text, "→", p.ans.length); });
console.log("Day 2 sample:\n" + f.daySet(2).map(i => " · " + f.BANK[i].text + " (" + f.BANK[i].ans.length + ")").join("\n"));
